"""
Resource Optimization & Bed Allocation Engine
Calculates multi-criteria matching scores:
score = 0.40 * care_level_match
      + 0.25 * equipment_match
      + 0.15 * ward_fit
      + 0.10 * staff_availability
      + 0.10 * proximity_readiness
"""

from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from backend.models import Bed, Ward, Nurse, Doctor, Patient, TriageAssessment, Equipment

# Matrix of care level need vs bed type matching
CARE_LEVEL_MATRIX = {
    "ICU": {"ICU": 1.0, "HDU": 0.65, "General": 0.2},
    "HDU": {"HDU": 1.0, "ICU": 0.85, "General": 0.4},
    "Ward": {"General": 1.0, "HDU": 0.7, "ICU": 0.3},
    "Discharge": {"General": 1.0, "HDU": 0.5, "ICU": 0.1}
}

def evaluate_bed_match(bed: Bed, ward: Ward, patient: Patient, assessment: Optional[TriageAssessment], db: Session) -> Dict[str, Any]:
    # 1. Care Level Match (0.40)
    target_disposition = assessment.predicted_disposition if assessment else "Ward"
    target_level = assessment.level if assessment else "P3"
    
    # Map disposition
    disp_key = "ICU" if target_disposition == "ICU" or target_level == "P1" else ("HDU" if target_disposition == "HDU" or target_level == "P2" else "Ward")
    care_match = CARE_LEVEL_MATRIX.get(disp_key, {}).get(bed.type, 0.4)

    # 2. Equipment Match (0.25)
    equipment_score = 0.5
    reasons = []
    
    requires_vent = False
    if assessment and assessment.explanation:
        # Check if SpO2 is critically low or vent needed
        for exp in assessment.explanation:
            if "SpO2" in exp.get("factor", "") or "dyspnea" in exp.get("factor", "").lower() or "breathless" in exp.get("factor", "").lower():
                requires_vent = True

    if requires_vent:
        if bed.vent_compatible:
            equipment_score += 0.5
            reasons.append("vent-compatible verified")
        else:
            equipment_score -= 0.3
            reasons.append("lacks ventilator port")
    else:
        if bed.oxygen and bed.monitor:
            equipment_score = 1.0
            reasons.append("oxygen & monitor ready")
        elif bed.oxygen:
            equipment_score = 0.8
            reasons.append("oxygen supported")

    # 3. Ward Fit (0.15)
    ward_fit = 0.85
    if ward.type.lower() == bed.type.lower():
        ward_fit = 1.0
        reasons.append(f"{ward.type} designated ward")
    elif "iso" in patient.chief_complaint.lower() if patient.chief_complaint else False:
        if "iso" in ward.name.lower() or "iso" in ward.type.lower():
            ward_fit = 1.0
            reasons.append("isolation ward match")

    # 4. Staff Availability (0.10)
    # Check nurses on duty in this ward
    nurse_count = db.query(Nurse).filter(Nurse.ward_id == ward.id, Nurse.status == "on_duty").count()
    doctor_count = db.query(Doctor).filter(Doctor.ward_id == ward.id, Doctor.status == "on_duty").count()
    
    # Check occupied beds in ward
    occupied_beds = db.query(Bed).filter(Bed.ward_id == ward.id, Bed.status == "occupied").count()
    nurse_ratio = (occupied_beds + 1) / max(1, nurse_count)
    
    if nurse_ratio <= 3:
        staff_avail = 1.0
        reasons.append("optimal nurse load")
    elif nurse_ratio <= 5:
        staff_avail = 0.75
        reasons.append("moderate staff ratio")
    else:
        staff_avail = 0.4
        reasons.append("elevated ward workload")

    # 5. Proximity & Readiness (0.10)
    proximity_score = 0.95 if bed.status == "available" else 0.0

    # Composite Score
    total_score = (
        0.40 * care_match +
        0.25 * min(1.0, max(0.0, equipment_score)) +
        0.15 * ward_fit +
        0.10 * staff_avail +
        0.10 * proximity_score
    )

    score_pct = round(total_score * 100, 1)
    reason_str = f"{bed.number}: {score_pct}%, " + ", ".join(reasons[:3])

    return {
        "bed_id": bed.id,
        "bed_number": bed.number,
        "ward_id": ward.id,
        "ward_name": ward.name,
        "ward_type": ward.type,
        "bed_type": bed.type,
        "oxygen": bed.oxygen,
        "monitor": bed.monitor,
        "vent_compatible": bed.vent_compatible,
        "score": score_pct,
        "breakdown": {
            "care_level_match": round(care_match, 2),
            "equipment_match": round(equipment_score, 2),
            "ward_fit": round(ward_fit, 2),
            "staff_availability": round(staff_avail, 2),
            "readiness": round(proximity_score, 2)
        },
        "reason": reason_str
    }

def get_bed_recommendations(patient_id: int, hospital_id: int, db: Session) -> Dict[str, Any]:
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.hospital_id == hospital_id).first()
    if not patient:
        return {"error": "Patient not found", "recommendations": []}

    latest_assessment = db.query(TriageAssessment).filter(
        TriageAssessment.patient_id == patient_id
    ).order_by(TriageAssessment.created_at.desc()).first()

    available_beds = db.query(Bed).join(Ward).filter(
        Bed.hospital_id == hospital_id,
        Bed.status == "available"
    ).all()

    evaluated_candidates = []
    for bed in available_beds:
        ward = bed.ward
        candidate = evaluate_bed_match(bed, ward, patient, latest_assessment, db)
        evaluated_candidates.append(candidate)

    # Sort descending by score
    evaluated_candidates.sort(key=lambda x: x["score"], reverse=True)

    # Fallback chain analysis if best candidate score is low or no beds
    fallback_status = None
    if not evaluated_candidates:
        fallback_status = "No available beds in facility. Recommended for immediate referral or HDU step-down buffer."
    elif evaluated_candidates[0]["score"] < 60.0:
        fallback_status = "Suboptimal care-level fit. Step-down bed evaluated; consider transfer alert."

    return {
        "patient_id": patient_id,
        "patient_code": patient.code,
        "target_level": latest_assessment.level if latest_assessment else "P3",
        "target_disposition": latest_assessment.predicted_disposition if latest_assessment else "Ward",
        "best_recommendation": evaluated_candidates[0] if evaluated_candidates else None,
        "all_recommendations": evaluated_candidates,
        "fallback_status": fallback_status
    }
