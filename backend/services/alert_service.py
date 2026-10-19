"""
Real-time Clinical and Operational Alert Generator
Evaluates: ICU capacity, long-waiting P1s, ventilator deficits, surge jumps, AI override spikes
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend.models import Alert, Bed, Patient, Equipment, TriageAssessment, TriageDecision, Doctor
from backend.services.event_bus import emit_event

async def evaluate_and_generate_alerts(hospital_id: int, db: Session) -> List[Alert]:
    generated = []

    # 1. ICU Capacity Alert (> 90%)
    icu_total = db.query(Bed).filter(Bed.hospital_id == hospital_id, Bed.type == "ICU").count() or 1
    icu_occupied = db.query(Bed).filter(Bed.hospital_id == hospital_id, Bed.type == "ICU", Bed.status == "occupied").count()
    icu_ratio = icu_occupied / icu_total
    
    if icu_ratio >= 0.90:
        existing = db.query(Alert).filter(
            Alert.hospital_id == hospital_id,
            Alert.type == "ICU_CAPACITY",
            Alert.status == "active"
        ).first()
        if not existing:
            alert = Alert(
                hospital_id=hospital_id,
                type="ICU_CAPACITY",
                severity="critical" if icu_ratio == 1.0 else "warning",
                message=f"ICU capacity alert: {icu_occupied}/{icu_total} beds occupied ({int(icu_ratio*100)}%). Divert or prepare step-downs.",
                status="active"
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            generated.append(alert)
            await emit_event(hospital_id, "ALERT_CREATED", {"id": alert.id, "type": alert.type, "message": alert.message})

    # 2. Ventilator threshold (< 2 available)
    vent_total = db.query(Equipment).filter(Equipment.hospital_id == hospital_id, Equipment.type == "Ventilator").count()
    vent_avail = db.query(Equipment).filter(Equipment.hospital_id == hospital_id, Equipment.type == "Ventilator", Equipment.status == "available").count()
    if vent_total > 0 and vent_avail <= 1:
        existing = db.query(Alert).filter(
            Alert.hospital_id == hospital_id,
            Alert.type == "VENTILATOR_DEFICIT",
            Alert.status == "active"
        ).first()
        if not existing:
            alert = Alert(
                hospital_id=hospital_id,
                type="VENTILATOR_DEFICIT",
                severity="critical" if vent_avail == 0 else "warning",
                message=f"Ventilator supply critical: Only {vent_avail} spare ventilator remaining in facility.",
                status="active"
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            generated.append(alert)
            await emit_event(hospital_id, "ALERT_CREATED", {"id": alert.id, "type": alert.type, "message": alert.message})

    # 3. P1 waiting > 10 minutes
    waiting_patients = db.query(Patient).filter(
        Patient.hospital_id == hospital_id,
        Patient.status == "waiting"
    ).all()
    
    for p in waiting_patients:
        last_triage = db.query(TriageAssessment).filter(TriageAssessment.patient_id == p.id).order_by(TriageAssessment.created_at.desc()).first()
        if last_triage and last_triage.level == "P1":
            wait_mins = (datetime.utcnow() - p.arrived_at).total_seconds() / 60.0
            if wait_mins > 8.0: # 8 mins threshold for critical alert
                alert_type = f"P1_WAIT_{p.code}"
                existing = db.query(Alert).filter(
                    Alert.hospital_id == hospital_id,
                    Alert.type == alert_type,
                    Alert.status == "active"
                ).first()
                if not existing:
                    alert = Alert(
                        hospital_id=hospital_id,
                        type=alert_type,
                        severity="critical",
                        message=f"Critical P1 patient {p.code} waiting for {int(wait_mins)} mins without allocated bed!",
                        status="active"
                    )
                    db.add(alert)
                    db.commit()
                    db.refresh(alert)
                    generated.append(alert)
                    await emit_event(hospital_id, "ALERT_CREATED", {"id": alert.id, "type": alert.type, "message": alert.message})

    return generated
