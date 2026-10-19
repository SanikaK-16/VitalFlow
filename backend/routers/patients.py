import re
import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from backend.database import get_db
from backend.models import Patient, PatientVitals, TriageAssessment, Bed, BedAllocation, Equipment, User
from backend.schemas import PatientCreateRequest, VitalsInput
from backend.deps import get_current_user
from backend.ai.model_engine import hybrid_engine
from backend.services.queue_service import get_hospital_heap, HeapNode
from backend.services.audit_service import log_audit_event
from backend.services.event_bus import emit_event
from backend.services.alert_service import evaluate_and_generate_alerts

router = APIRouter(prefix="/patients", tags=["Patient Intake & Vitals Management"])

def generate_unique_code(db: Session, requested_code: Optional[str] = None) -> str:
    raw = (requested_code or "").strip()
    if raw:
        candidate = raw
        suffix = 2
        while db.query(Patient).filter(Patient.code == candidate).first():
            candidate = f"{raw}-{suffix}"
            suffix += 1
        return candidate
    
    # Auto-generate next PTxxx
    existing = db.query(Patient.code).all()
    nums = []
    for (c,) in existing:
        if c:
            m = re.search(r"PT(\d+)", c)
            if m:
                try:
                    nums.append(int(m.group(1)))
                except ValueError:
                    pass
    next_num = (max(nums) + 1) if nums else 101
    candidate = f"PT{next_num}"
    while db.query(Patient).filter(Patient.code == candidate).first():
        next_num += 1
        candidate = f"PT{next_num}"
    return candidate

@router.post("")
async def create_patient(
    req: PatientCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hospital_id = current_user.hospital_id

    try:
        code = generate_unique_code(db, req.code)

        patient = Patient(
            hospital_id=hospital_id,
            code=code,
            name=req.name.strip(),
            age=req.age,
            gender=req.gender,
            blood_group=req.blood_group,
            contact=req.contact,
            chief_complaint=req.chief_complaint,
            triage_note=req.triage_note or req.chief_complaint,
            arrival_mode=req.arrival_mode,
            status="waiting",
            arrived_at=datetime.utcnow()
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

        # Save initial vitals
        vitals_data = req.vitals.dict()
        vitals = PatientVitals(
            patient_id=patient.id,
            hr=vitals_data["hr"],
            sbp=vitals_data["sbp"],
            dbp=vitals_data["dbp"],
            spo2=vitals_data["spo2"],
            temp=vitals_data["temp"],
            rr=vitals_data["rr"],
            consciousness=vitals_data["consciousness"],
            recorded_by=vitals_data.get("recorded_by", current_user.name),
            recorded_at=datetime.utcnow()
        )
        db.add(vitals)
        db.commit()

        # Run Hybrid Multimodal AI Triage
        patient_dict = {
            "age": patient.age,
            "gender": patient.gender,
            "chief_complaint": patient.chief_complaint,
            "triage_note": patient.triage_note
        }
        triage_res = hybrid_engine.evaluate_patient(patient_dict, vitals_data)

        assessment = TriageAssessment(
            patient_id=patient.id,
            model_version=triage_res["model_version"],
            ml_score=triage_res["ml_score"],
            news2=triage_res["news2"],
            priority_score=triage_res["priority_score"],
            level=triage_res["level"],
            predicted_disposition=triage_res["predicted_disposition"],
            disposition_probs=triage_res["disposition_probs"],
            explanation=triage_res["explanation"],
            ai_fallback=triage_res["ai_fallback"]
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to register patient: {str(exc)}")

    # Enqueue to Indexed Max Heap
    heap = get_hospital_heap(hospital_id)
    node = HeapNode(
        patient_id=patient.id,
        base_priority=triage_res["priority_score"],
        arrival_ts=patient.arrived_at.timestamp(),
        patient_code=patient.code,
        patient_name=patient.name,
        level=triage_res["level"],
        disposition=triage_res["predicted_disposition"]
    )
    heap.insert(node)

    # Audit & Alert
    log_audit_event(db, hospital_id, "PATIENT_INTAKE", "Patient", str(patient.id), current_user.id, {
        "code": patient.code,
        "priority_score": triage_res["priority_score"],
        "level": triage_res["level"],
        "disposition": triage_res["predicted_disposition"]
    })
    await evaluate_and_generate_alerts(hospital_id, db)

    # Emit real-time WebSocket events
    await emit_event(hospital_id, "PATIENT_CREATED", {"patient_id": patient.id, "code": patient.code, "name": patient.name})
    await emit_event(hospital_id, "TRIAGE_COMPLETED", {
        "patient_id": patient.id,
        "code": patient.code,
        "priority_score": triage_res["priority_score"],
        "level": triage_res["level"],
        "disposition": triage_res["predicted_disposition"]
    })

    return {
        "patient": {
            "id": patient.id,
            "code": patient.code,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "status": patient.status
        },
        "assessment": triage_res
    }

@router.get("")
def list_patients(
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Patient).filter(Patient.hospital_id == current_user.hospital_id)
    if status and status != "all":
        query = query.filter(Patient.status == status)
    if search:
        s = f"%{search}%"
        query = query.filter((Patient.name.ilike(s)) | (Patient.code.ilike(s)) | (Patient.chief_complaint.ilike(s)))
    
    patients = query.order_by(Patient.arrived_at.desc()).all()
    results = []
    for p in patients:
        latest_triage = db.query(TriageAssessment).filter(TriageAssessment.patient_id == p.id).order_by(TriageAssessment.created_at.desc()).first()
        latest_vitals = db.query(PatientVitals).filter(PatientVitals.patient_id == p.id).order_by(PatientVitals.recorded_at.desc()).first()
        results.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "chief_complaint": p.chief_complaint,
            "triage_note": p.triage_note,
            "arrival_mode": p.arrival_mode,
            "status": p.status,
            "arrived_at": p.arrived_at.isoformat(),
            "latest_triage": {
                "priority_score": latest_triage.priority_score,
                "level": latest_triage.level,
                "predicted_disposition": latest_triage.predicted_disposition,
                "explanation": latest_triage.explanation
            } if latest_triage else None,
            "latest_vitals": {
                "hr": latest_vitals.hr,
                "sbp": latest_vitals.sbp,
                "dbp": latest_vitals.dbp,
                "spo2": latest_vitals.spo2,
                "temp": latest_vitals.temp,
                "rr": latest_vitals.rr,
                "consciousness": latest_vitals.consciousness
            } if latest_vitals else None
        })
    return results

@router.get("/{id}")
def get_patient_detail(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == id, Patient.hospital_id == current_user.hospital_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals_history = db.query(PatientVitals).filter(PatientVitals.patient_id == id).order_by(PatientVitals.recorded_at.asc()).all()
    assessments = db.query(TriageAssessment).filter(TriageAssessment.patient_id == id).order_by(TriageAssessment.created_at.desc()).all()
    allocations = db.query(BedAllocation).filter(BedAllocation.patient_id == id).all()

    # Current bed info
    current_bed = db.query(Bed).filter(Bed.current_patient_id == id).first()

    return {
        "patient": {
            "id": patient.id,
            "code": patient.code,
            "name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "blood_group": patient.blood_group,
            "contact": patient.contact,
            "chief_complaint": patient.chief_complaint,
            "triage_note": patient.triage_note,
            "arrival_mode": patient.arrival_mode,
            "status": patient.status,
            "arrived_at": patient.arrived_at.isoformat(),
        },
        "current_bed": {
            "id": current_bed.id,
            "number": current_bed.number,
            "type": current_bed.type,
            "ward_name": current_bed.ward.name if current_bed.ward else ""
        } if current_bed else None,
        "vitals_history": [
            {
                "id": v.id,
                "hr": v.hr,
                "sbp": v.sbp,
                "dbp": v.dbp,
                "spo2": v.spo2,
                "temp": v.temp,
                "rr": v.rr,
                "consciousness": v.consciousness,
                "recorded_at": v.recorded_at.isoformat()
            } for v in vitals_history
        ],
        "assessments": [
            {
                "id": a.id,
                "priority_score": a.priority_score,
                "level": a.level,
                "news2": a.news2,
                "ml_score": a.ml_score,
                "predicted_disposition": a.predicted_disposition,
                "disposition_probs": a.disposition_probs,
                "explanation": a.explanation,
                "ai_fallback": a.ai_fallback,
                "created_at": a.created_at.isoformat()
            } for a in assessments
        ]
    }

@router.post("/{id}/vitals")
async def update_patient_vitals(
    id: int,
    vitals_in: VitalsInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hospital_id = current_user.hospital_id
    patient = db.query(Patient).filter(Patient.id == id, Patient.hospital_id == hospital_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals = PatientVitals(
        patient_id=patient.id,
        hr=vitals_in.hr,
        sbp=vitals_in.sbp,
        dbp=vitals_in.dbp,
        spo2=vitals_in.spo2,
        temp=vitals_in.temp,
        rr=vitals_in.rr,
        consciousness=vitals_in.consciousness,
        recorded_by=current_user.name,
        recorded_at=datetime.utcnow()
    )
    db.add(vitals)
    db.commit()

    # Re-run hybrid triage assessment
    patient_dict = {
        "age": patient.age,
        "gender": patient.gender,
        "chief_complaint": patient.chief_complaint,
        "triage_note": patient.triage_note
    }
    triage_res = hybrid_engine.evaluate_patient(patient_dict, vitals_in.dict())

    assessment = TriageAssessment(
        patient_id=patient.id,
        model_version=triage_res["model_version"],
        ml_score=triage_res["ml_score"],
        news2=triage_res["news2"],
        priority_score=triage_res["priority_score"],
        level=triage_res["level"],
        predicted_disposition=triage_res["predicted_disposition"],
        disposition_probs=triage_res["disposition_probs"],
        explanation=triage_res["explanation"],
        ai_fallback=triage_res["ai_fallback"]
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    # Dynamic heap update (O(log n))
    heap = get_hospital_heap(hospital_id)
    heap.update_key(
        patient_id=patient.id,
        new_priority=triage_res["priority_score"],
        level=triage_res["level"],
        disposition=triage_res["predicted_disposition"]
    )

    # Check alerts (e.g. deteriorating SpO2 trigger)
    await evaluate_and_generate_alerts(hospital_id, db)

    log_audit_event(db, hospital_id, "VITALS_RETRIAGE", "Patient", str(patient.id), current_user.id, {
        "new_priority": triage_res["priority_score"],
        "level": triage_res["level"],
        "spo2": vitals_in.spo2,
        "hr": vitals_in.hr
    })

    await emit_event(hospital_id, "VITALS_UPDATED", {"patient_id": patient.id, "spo2": vitals_in.spo2})
    await emit_event(hospital_id, "PRIORITY_CHANGED", {
        "patient_id": patient.id,
        "new_priority": triage_res["priority_score"],
        "level": triage_res["level"]
    })

    return {
        "message": "Vitals updated and re-triage complete",
        "assessment": triage_res
    }

@router.post("/{id}/discharge")
async def discharge_patient(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hospital_id = current_user.hospital_id
    patient = db.query(Patient).filter(Patient.id == id, Patient.hospital_id == hospital_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.status = "discharged"

    # Remove from heap queue if still waiting
    heap = get_hospital_heap(hospital_id)
    heap.remove(patient.id)

    # Release occupied bed
    bed = db.query(Bed).filter(Bed.current_patient_id == id).first()
    freed_bed_number = None
    if bed:
        bed.status = "available"
        bed.current_patient_id = None
        freed_bed_number = bed.number
        # Close bed allocation record
        allocation = db.query(BedAllocation).filter(
            BedAllocation.patient_id == id,
            BedAllocation.bed_id == bed.id,
            BedAllocation.released_at.is_(None)
        ).first()
        if allocation:
            allocation.released_at = datetime.utcnow()

    # Release any assigned equipment
    eq_items = db.query(Equipment).filter(Equipment.assigned_patient_id == id).all()
    for eq in eq_items:
        eq.status = "available"
        eq.assigned_patient_id = None
        eq.assigned_bed_id = None

    db.commit()

    log_audit_event(db, hospital_id, "PATIENT_DISCHARGED", "Patient", str(patient.id), current_user.id, {
        "freed_bed": freed_bed_number
    })

    await emit_event(hospital_id, "BED_RELEASED", {"bed_number": freed_bed_number, "patient_id": patient.id})

    # Auto-suggest freed bed to next waiting patient from Max Heap
    next_candidate = heap.peek()

    return {
        "message": f"Patient {patient.code} discharged successfully",
        "freed_bed": freed_bed_number,
        "next_queue_candidate": next_candidate.to_dict() if next_candidate else None
    }
