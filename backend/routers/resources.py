from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models import Ward, Equipment, Doctor, Nurse, Ambulance, NetworkHospital, Referral, User, Patient
from backend.schemas import ReferralCreateRequest
from backend.deps import get_current_user
from backend.services.referral_service import rank_referral_destinations
from backend.services.audit_service import log_audit_event
from backend.services.event_bus import emit_event

router = APIRouter(tags=["Hospital Resources & Network Referrals"])

# --- Wards ---
@router.get("/wards")
def list_wards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Ward).filter(Ward.hospital_id == current_user.hospital_id).all()

# --- Equipment ---
@router.get("/equipment")
def list_equipment(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Equipment).filter(Equipment.hospital_id == current_user.hospital_id).all()
    results = []
    for eq in items:
        p_code = None
        if eq.assigned_patient_id:
            p = db.query(Patient).filter(Patient.id == eq.assigned_patient_id).first()
            if p:
                p_code = p.code
        results.append({
            "id": eq.id,
            "type": eq.type,
            "serial": eq.serial,
            "status": eq.status,
            "assigned_patient_id": eq.assigned_patient_id,
            "assigned_patient_code": p_code,
            "assigned_bed_id": eq.assigned_bed_id
        })
    return results

@router.post("/equipment/{id}/allocate")
async def allocate_equipment(id: int, payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    eq = db.query(Equipment).filter(Equipment.id == id, Equipment.hospital_id == current_user.hospital_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    patient_id = payload.get("patient_id")
    eq.assigned_patient_id = patient_id
    eq.status = "in_use"
    db.commit()

    log_audit_event(db, current_user.hospital_id, "EQUIPMENT_ALLOCATED", "Equipment", str(eq.id), current_user.id, {
        "type": eq.type,
        "serial": eq.serial,
        "patient_id": patient_id
    })
    await emit_event(current_user.hospital_id, "EQUIPMENT_UPDATED", {"id": eq.id, "status": eq.status})
    return {"message": f"{eq.type} {eq.serial} allocated successfully"}

# --- Staff ---
@router.get("/doctors")
def list_doctors(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Doctor).filter(Doctor.hospital_id == current_user.hospital_id).all()

@router.get("/nurses")
def list_nurses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Nurse).filter(Nurse.hospital_id == current_user.hospital_id).all()

# --- Ambulances ---
@router.get("/ambulances")
def list_ambulances(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Ambulance).filter(Ambulance.hospital_id == current_user.hospital_id).all()

@router.patch("/ambulances/{id}")
async def update_ambulance(id: int, payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == id, Ambulance.hospital_id == current_user.hospital_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    if "status" in payload:
        amb.status = payload["status"]
    if "eta_min" in payload:
        amb.eta_min = payload["eta_min"]
    if "location" in payload:
        amb.location = payload["location"]
    db.commit()

    await emit_event(current_user.hospital_id, "AMBULANCE_UPDATED", {"id": amb.id, "status": amb.status, "eta_min": amb.eta_min})
    return amb

# --- Network & Referrals ---
@router.get("/network")
def list_network_hospitals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(NetworkHospital).filter(NetworkHospital.hospital_id == current_user.hospital_id).all()

@router.get("/referrals/recommend")
def recommend_referrals(patient_id: int = Query(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return rank_referral_destinations(patient_id, current_user.hospital_id, db)

@router.post("/referrals")
async def create_referral(req: ReferralCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ref = Referral(
        hospital_id=current_user.hospital_id,
        patient_id=req.patient_id,
        to_hospital_id=req.to_hospital_id,
        reason=req.reason,
        status="pending",
        created_at=datetime.utcnow()
    )
    db.add(ref)
    db.commit()
    db.refresh(ref)

    log_audit_event(db, current_user.hospital_id, "REFERRAL_CREATED", "Referral", str(ref.id), current_user.id, {
        "patient_id": req.patient_id,
        "to_hospital_id": req.to_hospital_id,
        "reason": req.reason
    })
    await emit_event(current_user.hospital_id, "REFERRAL_CREATED", {"id": ref.id, "patient_id": req.patient_id})
    return ref
