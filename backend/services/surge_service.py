"""
Hospital Surge Level & Disaster Mode Index Calculator
Surge Index = w1*arrival_surge + w2*p1_ratio + w3*icu_occupancy + w4*bed_occupancy + w5*staff_load
Outputs: Normal, Elevated, High, Critical
"""

from typing import Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend.models import Patient, Bed, Doctor, Nurse, Hospital, TriageAssessment

def calculate_surge_index(hospital_id: int, db: Session, disaster_mode: bool = False) -> Dict[str, Any]:
    # 1. Total & ICU beds
    total_beds = db.query(Bed).filter(Bed.hospital_id == hospital_id).count() or 1
    occupied_beds = db.query(Bed).filter(Bed.hospital_id == hospital_id, Bed.status == "occupied").count()
    bed_occupancy = occupied_beds / total_beds

    icu_beds = db.query(Bed).filter(Bed.hospital_id == hospital_id, Bed.type == "ICU").count() or 1
    occupied_icu = db.query(Bed).filter(Bed.hospital_id == hospital_id, Bed.type == "ICU", Bed.status == "occupied").count()
    icu_occupancy = occupied_icu / icu_beds

    # 2. Waiting patients and P1 count
    waiting_patients = db.query(Patient).filter(
        Patient.hospital_id == hospital_id,
        Patient.status == "waiting"
    ).all()
    waiting_count = len(waiting_patients)
    
    p1_count = 0
    for p in waiting_patients:
        last_triage = db.query(TriageAssessment).filter(TriageAssessment.patient_id == p.id).order_by(TriageAssessment.created_at.desc()).first()
        if last_triage and last_triage.level == "P1":
            p1_count += 1

    # 3. Recent arrivals (last 2 hours)
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    recent_arrivals = db.query(Patient).filter(
        Patient.hospital_id == hospital_id,
        Patient.arrived_at >= two_hours_ago
    ).count()
    arrival_rate = recent_arrivals / 2.0 # patients per hour
    baseline_rate = 6.0 # standard baseline capacity
    arrival_factor = min(2.0, arrival_rate / baseline_rate)

    # 4. Staff Load
    doctors_on_duty = db.query(Doctor).filter(Doctor.hospital_id == hospital_id, Doctor.status == "on_duty").count() or 1
    nurses_on_duty = db.query(Nurse).filter(Nurse.hospital_id == hospital_id, Nurse.status == "on_duty").count() or 1
    active_load = waiting_count + occupied_beds
    staff_ratio = active_load / (doctors_on_duty + nurses_on_duty)
    staff_load_score = min(1.0, staff_ratio / 6.0)

    # Composite Surge Score (0.0 to 1.0)
    composite = (
        0.25 * (arrival_factor / 2.0) +
        0.25 * min(1.0, p1_count / 3.0) +
        0.25 * icu_occupancy +
        0.15 * bed_occupancy +
        0.10 * staff_load_score
    )

    if disaster_mode:
        composite = min(1.0, composite * 1.35)

    composite_pct = round(composite * 100, 1)

    # Threshold mapping
    if composite_pct >= 80 or (p1_count >= 3 and icu_occupancy >= 0.9):
        surge_level = "Critical"
        color = "red"
    elif composite_pct >= 60 or icu_occupancy >= 0.8:
        surge_level = "High"
        color = "amber"
    elif composite_pct >= 40:
        surge_level = "Elevated"
        color = "yellow"
    else:
        surge_level = "Normal"
        color = "emerald"

    return {
        "surge_index": composite_pct,
        "surge_level": surge_level,
        "color": color,
        "disaster_mode": disaster_mode,
        "factors": {
            "arrival_rate_hr": round(arrival_rate, 1),
            "p1_waiting": p1_count,
            "icu_occupancy_pct": round(icu_occupancy * 100, 1),
            "bed_occupancy_pct": round(bed_occupancy * 100, 1),
            "staff_load_ratio": round(staff_ratio, 1)
        }
    }
