"""
Network Hospital Referral Ranking Engine
score = care_match + resource_free - distance_penalty - eta_penalty
"""

from typing import Dict, List, Any
from sqlalchemy.orm import Session
from backend.models import NetworkHospital, Patient, TriageAssessment

def rank_referral_destinations(patient_id: int, hospital_id: int, db: Session) -> List[Dict[str, Any]]:
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.hospital_id == hospital_id).first()
    assessment = db.query(TriageAssessment).filter(TriageAssessment.patient_id == patient_id).order_by(TriageAssessment.created_at.desc()).first()

    target_level = assessment.level if assessment else "P2"
    target_disp = assessment.predicted_disposition if assessment else "ICU"

    network_hospitals = db.query(NetworkHospital).filter(NetworkHospital.hospital_id == hospital_id).all()

    ranked = []
    for nh in network_hospitals:
        # Base care match
        care_match = 40.0 if (target_disp == "ICU" and nh.icu_free > 0) else 30.0
        
        # Resource availability bonus
        res_bonus = min(30.0, nh.icu_free * 4.0 + nh.vent_free * 3.0)

        # Distance penalty (e.g. -1.5 per km above 5km)
        dist_penalty = min(25.0, nh.distance_km * 1.5)

        # Estimated transit time (ETA in mins approx distance * 2.5 min/km in traffic)
        estimated_eta = round(nh.distance_km * 2.5)
        eta_penalty = min(20.0, (estimated_eta / 60.0) * 15.0)

        composite_score = round(max(10.0, min(100.0, care_match + res_bonus - dist_penalty - eta_penalty)), 1)

        ranked.append({
            "id": nh.id,
            "name": nh.name,
            "distance_km": nh.distance_km,
            "icu_free": nh.icu_free,
            "vent_free": nh.vent_free,
            "estimated_eta_mins": estimated_eta,
            "match_score": composite_score,
            "recommendation": "Optimal Referral" if composite_score >= 75 else ("Acceptable Alternative" if composite_score >= 50 else "High Transit Delay")
        })

    # Sort descending by match score
    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    return ranked
