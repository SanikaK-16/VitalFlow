from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models import Bed, Ward, Patient, BedAllocation, User
from backend.schemas import BedAllocateRequest, BedCreateRequest
from backend.deps import get_current_user
from backend.services.allocation_service import get_bed_recommendations
from backend.services.queue_service import get_hospital_heap
from backend.services.audit_service import log_audit_event
from backend.services.event_bus import emit_event

router = APIRouter(prefix="/beds", tags=["Bed Management & Multi-Criteria Optimization"])

@router.get("")
def list_beds(
    ward_id: int = Query(None),
    status: str = Query(None),
    type: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Bed).filter(Bed.hospital_id == current_user.hospital_id)
    if ward_id:
        query = query.filter(Bed.ward_id == ward_id)
    if status and status != "all":
        query = query.filter(Bed.status == status)
    if type and type != "all":
        query = query.filter(Bed.type == type)

    beds = query.all()
    results = []
    for b in beds:
        patient_info = None
        if b.current_patient_id:
            p = db.query(Patient).filter(Patient.id == b.current_patient_id).first()
            if p:
                patient_info = {
                    "id": p.id,
                    "code": p.code,
                    "name": p.name,
                    "age": p.age,
                    "gender": p.gender
                }
        results.append({
            "id": b.id,
            "number": b.number,
            "ward_id": b.ward_id,
            "ward_name": b.ward.name if b.ward else "General",
            "type": b.type,
            "status": b.status,
            "oxygen": b.oxygen,
            "monitor": b.monitor,
            "vent_compatible": b.vent_compatible,
            "current_patient": patient_info
        })
    return results

@router.post("")
def create_bed(
    req: BedCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ward = db.query(Ward).filter(Ward.id == req.ward_id, Ward.hospital_id == current_user.hospital_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")

    bed = Bed(
        hospital_id=current_user.hospital_id,
        ward_id=req.ward_id,
        number=req.number,
        type=req.type,
        status="available",
        oxygen=req.oxygen,
        monitor=req.monitor,
        vent_compatible=req.vent_compatible
    )
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed

@router.get("/recommend")
def recommend_bed_for_patient(
    patient_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recs = get_bed_recommendations(patient_id, current_user.hospital_id, db)
    return recs

@router.post("/{id}/allocate")
async def allocate_bed(
    id: int,
    req: BedAllocateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hospital_id = current_user.hospital_id
    bed = db.query(Bed).filter(Bed.id == id, Bed.hospital_id == hospital_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    if bed.status != "available":
        raise HTTPException(status_code=400, detail=f"Bed {bed.number} is currently {bed.status}")

    patient = db.query(Patient).filter(Patient.id == req.patient_id, Patient.hospital_id == hospital_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Update bed and patient
    bed.status = "occupied"
    bed.current_patient_id = patient.id
    patient.status = "admitted"

    # Record allocation
    alloc = BedAllocation(
        patient_id=patient.id,
        bed_id=bed.id,
        score=94.0, # default or matched score
        allocated_at=datetime.utcnow()
    )
    db.add(alloc)
    db.commit()

    # Remove from waiting queue
    heap = get_hospital_heap(hospital_id)
    heap.remove(patient.id)

    log_audit_event(db, hospital_id, "BED_ALLOCATED", "Bed", str(bed.id), current_user.id, {
        "bed_number": bed.number,
        "patient_code": patient.code
    })

    await emit_event(hospital_id, "BED_ALLOCATED", {
        "bed_id": bed.id,
        "bed_number": bed.number,
        "patient_id": patient.id,
        "patient_code": patient.code
    })

    return {
        "message": f"Bed {bed.number} allocated to patient {patient.code}",
        "bed_id": bed.id,
        "patient_id": patient.id
    }

@router.post("/{id}/release")
async def release_bed(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hospital_id = current_user.hospital_id
    bed = db.query(Bed).filter(Bed.id == id, Bed.hospital_id == hospital_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    old_patient_id = bed.current_patient_id
    bed.status = "available"
    bed.current_patient_id = None

    if old_patient_id:
        alloc = db.query(BedAllocation).filter(
            BedAllocation.bed_id == bed.id,
            BedAllocation.patient_id == old_patient_id,
            BedAllocation.released_at.is_(None)
        ).first()
        if alloc:
            alloc.released_at = datetime.utcnow()

    db.commit()

    log_audit_event(db, hospital_id, "BED_RELEASED", "Bed", str(bed.id), current_user.id, {
        "bed_number": bed.number
    })

    await emit_event(hospital_id, "BED_RELEASED", {
        "bed_id": bed.id,
        "bed_number": bed.number
    })

    return {"message": f"Bed {bed.number} released and marked available"}
