from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.database import get_db
from backend.models import User, Patient, TriageAssessment, PatientVitals
from backend.deps import get_current_user
from backend.services.queue_service import get_hospital_heap

router = APIRouter(prefix="/queue", tags=["Indexed Max Heap Priority Queue"])

@router.get("")
def get_live_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hospital_id = current_user.hospital_id
    heap = get_hospital_heap(hospital_id)

    # Apply anti-starvation aging dynamically
    heap.apply_aging()
    sorted_items = heap.get_sorted_list()

    # Enrich with latest clinical details and note
    enriched = []
    for item in sorted_items:
        patient = db.query(Patient).filter(Patient.id == item["patient_id"]).first()
        if not patient or patient.status != "waiting":
            continue
        vitals = db.query(PatientVitals).filter(PatientVitals.patient_id == patient.id).order_by(PatientVitals.recorded_at.desc()).first()
        assessment = db.query(TriageAssessment).filter(TriageAssessment.patient_id == patient.id).order_by(TriageAssessment.created_at.desc()).first()

        enriched.append({
            **item,
            "patient_code": patient.code,
            "patient_name": patient.name,
            "age": patient.age,
            "gender": patient.gender,
            "chief_complaint": patient.chief_complaint,
            "triage_note": patient.triage_note,
            "vitals": {
                "hr": vitals.hr if vitals else None,
                "sbp": vitals.sbp if vitals else None,
                "dbp": vitals.dbp if vitals else None,
                "spo2": vitals.spo2 if vitals else None,
                "temp": vitals.temp if vitals else None,
                "rr": vitals.rr if vitals else None,
                "consciousness": vitals.consciousness if vitals else None
            } if vitals else None,
            "assessment_id": assessment.id if assessment else None,
            "news2": assessment.news2 if assessment else None,
            "explanation": assessment.explanation if assessment else None
        })

    return {
        "hospital_id": hospital_id,
        "queue_count": len(enriched),
        "queue": enriched
    }

@router.get("/heap-tree")
def get_heap_tree(
    current_user: User = Depends(get_current_user)
):
    hospital_id = current_user.hospital_id
    heap = get_hospital_heap(hospital_id)
    heap.apply_aging()
    tree_array = heap.get_heap_tree()
    return {
        "hospital_id": hospital_id,
        "heap_size": len(tree_array),
        "tree_nodes": tree_array
    }
