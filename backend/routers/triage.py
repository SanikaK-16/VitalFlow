from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models import TriageAssessment, TriageDecision, Patient, User
from backend.schemas import TriageDecisionRequest
from backend.deps import get_current_user
from backend.services.queue_service import get_hospital_heap
from backend.services.audit_service import log_audit_event
from backend.services.event_bus import emit_event

router = APIRouter(prefix="/triage", tags=["Clinical Triage & Clinician Decision"])

@router.get("/{patient_id}")
def get_patient_triage(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.hospital_id == current_user.hospital_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    assessment = db.query(TriageAssessment).filter(TriageAssessment.patient_id == patient_id).order_by(TriageAssessment.created_at.desc()).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="No triage assessment found for patient")

    latest_decision = db.query(TriageDecision).filter(TriageDecision.assessment_id == assessment.id).order_by(TriageDecision.created_at.desc()).first()

    return {
        "assessment": {
            "id": assessment.id,
            "patient_id": assessment.patient_id,
            "model_version": assessment.model_version,
            "ml_score": assessment.ml_score,
            "news2": assessment.news2,
            "priority_score": assessment.priority_score,
            "level": assessment.level,
            "predicted_disposition": assessment.predicted_disposition,
            "disposition_probs": assessment.disposition_probs,
            "explanation": assessment.explanation,
            "ai_fallback": assessment.ai_fallback,
            "created_at": assessment.created_at.isoformat()
        },
        "latest_decision": {
            "action": latest_decision.action,
            "final_level": latest_decision.final_level,
            "final_disposition": latest_decision.final_disposition,
            "reason": latest_decision.reason,
            "created_at": latest_decision.created_at.isoformat()
        } if latest_decision else None
    }

@router.post("/{assessment_id}/decision")
async def record_triage_decision(
    assessment_id: int,
    req: TriageDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hospital_id = current_user.hospital_id
    assessment = db.query(TriageAssessment).filter(TriageAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Triage assessment not found")

    patient = db.query(Patient).filter(Patient.id == assessment.patient_id, Patient.hospital_id == hospital_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient does not belong to active hospital")

    action = req.action.lower() # accept or override
    final_level = req.final_level or assessment.level
    final_disposition = req.final_disposition or assessment.predicted_disposition

    # Map level to score if clinician overridden
    level_score_map = {"P1": 95.0, "P2": 78.0, "P3": 55.0, "P4": 25.0}
    final_priority = level_score_map.get(final_level, assessment.priority_score)

    decision = TriageDecision(
        assessment_id=assessment.id,
        user_id=current_user.id,
        action=action,
        final_level=final_level,
        final_disposition=final_disposition,
        reason=req.reason if action == "override" else "Clinician verified AI triage recommendation",
        created_at=datetime.utcnow()
    )
    db.add(decision)
    db.commit()
    db.refresh(decision)

    # If clinician overrode the priority, update the Indexed Max Heap
    if action == "override":
        heap = get_hospital_heap(hospital_id)
        heap.update_key(
            patient_id=patient.id,
            new_priority=final_priority,
            level=final_level,
            disposition=final_disposition
        )

    log_audit_event(db, hospital_id, f"TRIAGE_{action.upper()}", "TriageDecision", str(decision.id), current_user.id, {
        "patient_code": patient.code,
        "action": action,
        "final_level": final_level,
        "final_disposition": final_disposition,
        "reason": decision.reason
    })

    await emit_event(hospital_id, "DECISION_RECORDED", {
        "patient_id": patient.id,
        "action": action,
        "final_level": final_level,
        "final_disposition": final_disposition
    })

    return {
        "message": f"Triage recommendation {action}ed successfully",
        "decision": {
            "id": decision.id,
            "action": decision.action,
            "final_level": decision.final_level,
            "final_disposition": decision.final_disposition,
            "reason": decision.reason
        }
    }
