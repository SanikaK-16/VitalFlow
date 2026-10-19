"""
VitalFlow Database Seeder
Seeds CityCare Hospital Pune, Dr. Rao, Wards, Beds, Equipment, Staff, Ambulances, Network Hospitals, and Active Patients.
"""

from datetime import datetime, timedelta
from backend.database import SessionLocal, Base, engine
from backend.models import (
    Hospital, User, Ward, Bed, Equipment, Doctor, Nurse,
    Ambulance, NetworkHospital, Patient, PatientVitals,
    TriageAssessment, BedAllocation, Alert, AuditLog
)
from backend.services.auth_service import get_password_hash
from backend.services.queue_service import get_hospital_heap, HeapNode
from backend.ai.model_engine import hybrid_engine

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if hospital already seeded
    existing = db.query(Hospital).filter(Hospital.reg_no == "MH-PUN-2024-089").first()
    if existing:
        print("Database already seeded.")
        # Re-populate in-memory Max Heap from waiting patients in DB
        heap = get_hospital_heap(existing.id)
        waiting_pts = db.query(Patient).filter(Patient.hospital_id == existing.id, Patient.status == "waiting").all()
        for p in waiting_pts:
            latest_a = db.query(TriageAssessment).filter(TriageAssessment.patient_id == p.id).order_by(TriageAssessment.created_at.desc()).first()
            score = latest_a.priority_score if latest_a else 50.0
            level = latest_a.level if latest_a else "P3"
            disp = latest_a.predicted_disposition if latest_a else "Ward"
            heap.insert(HeapNode(p.id, score, p.arrived_at.timestamp(), p.code, p.name, level, disp))
        db.close()
        return

    print("Seeding VitalFlow database...")

    # 1. Hospitals
    h1 = Hospital(
        name="CityCare Hospital, Pune",
        reg_no="MH-PUN-2024-089",
        address="14 Shivaji Nagar, FC Road",
        city="Pune",
        phone="+91 20 2567 8900",
        email="emergency@citycarepune.org",
        status="Operational"
    )
    h2 = Hospital(
        name="Metro General Hospital",
        reg_no="MH-PUN-2023-112",
        address="Kalyani Nagar",
        city="Pune",
        phone="+91 20 2668 1122",
        email="info@metrogeneral.org",
        status="Operational"
    )
    db.add_all([h1, h2])
    db.commit()

    # 2. Users (Dr. Rao)
    user_doctor = User(
        hospital_id=h1.id,
        name="Dr. Rao",
        email="dr.rao@vitalflow.health",
        password_hash=get_password_hash("password123"),
        role="doctor",
        status="active"
    )
    user_admin = User(
        hospital_id=h1.id,
        name="Admin Operations",
        email="admin@vitalflow.health",
        password_hash=get_password_hash("admin123"),
        role="admin",
        status="active"
    )
    db.add_all([user_doctor, user_admin])
    db.commit()

    # 3. Wards
    w_icu = Ward(hospital_id=h1.id, name="Intensive Care Unit (ICU)", type="ICU", capacity=6)
    w_hdu = Ward(hospital_id=h1.id, name="High Dependency Unit (HDU)", type="HDU", capacity=8)
    w_gen = Ward(hospital_id=h1.id, name="Emergency Medical Ward", type="General", capacity=16)
    w_iso = Ward(hospital_id=h1.id, name="Isolation Ward", type="Isolation", capacity=4)
    db.add_all([w_icu, w_hdu, w_gen, w_iso])
    db.commit()

    # 4. Beds (ICU-101 to 106, HDU-201 to 208, GEN-301 to 316)
    beds = [
        # ICU Beds
        Bed(hospital_id=h1.id, ward_id=w_icu.id, number="ICU-101", type="ICU", status="occupied", oxygen=True, monitor=True, vent_compatible=True),
        Bed(hospital_id=h1.id, ward_id=w_icu.id, number="ICU-102", type="ICU", status="available", oxygen=True, monitor=True, vent_compatible=True), # Target Bed for demo!
        Bed(hospital_id=h1.id, ward_id=w_icu.id, number="ICU-103", type="ICU", status="occupied", oxygen=True, monitor=True, vent_compatible=True),
        Bed(hospital_id=h1.id, ward_id=w_icu.id, number="ICU-104", type="ICU", status="occupied", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=h1.id, ward_id=w_icu.id, number="ICU-105", type="ICU", status="occupied", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=h1.id, ward_id=w_icu.id, number="ICU-106", type="ICU", status="available", oxygen=True, monitor=True, vent_compatible=True),

        # HDU Beds
        Bed(hospital_id=h1.id, ward_id=w_hdu.id, number="HDU-201", type="HDU", status="available", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=h1.id, ward_id=w_hdu.id, number="HDU-202", type="HDU", status="occupied", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=h1.id, ward_id=w_hdu.id, number="HDU-203", type="HDU", status="available", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=h1.id, ward_id=w_hdu.id, number="HDU-204", type="HDU", status="occupied", oxygen=True, monitor=True, vent_compatible=False),

        # General Beds
        Bed(hospital_id=h1.id, ward_id=w_gen.id, number="GEN-301", type="General", status="available", oxygen=True, monitor=False, vent_compatible=False),
        Bed(hospital_id=h1.id, ward_id=w_gen.id, number="GEN-302", type="General", status="available", oxygen=True, monitor=False, vent_compatible=False),
        Bed(hospital_id=h1.id, ward_id=w_gen.id, number="GEN-303", type="General", status="occupied", oxygen=True, monitor=False, vent_compatible=False),
        Bed(hospital_id=h1.id, ward_id=w_gen.id, number="GEN-304", type="General", status="available", oxygen=False, monitor=False, vent_compatible=False),
    ]
    db.add_all(beds)
    db.commit()

    # 5. Equipment
    equip = [
        Equipment(hospital_id=h1.id, type="Ventilator", serial="VENT-001", status="in_use", assigned_bed_id=beds[0].id),
        Equipment(hospital_id=h1.id, type="Ventilator", serial="VENT-002", status="in_use", assigned_bed_id=beds[2].id),
        Equipment(hospital_id=h1.id, type="Ventilator", serial="VENT-003", status="available"), # Target for demo
        Equipment(hospital_id=h1.id, type="Defibrillator", serial="DEFIB-101", status="available"),
        Equipment(hospital_id=h1.id, type="Infusion Pump", serial="PUMP-201", status="available"),
        Equipment(hospital_id=h1.id, type="Infusion Pump", serial="PUMP-202", status="in_use"),
    ]
    db.add_all(equip)
    db.commit()

    # 6. Doctors & Nurses
    doctors = [
        Doctor(hospital_id=h1.id, name="Dr. Rao", specialization="Emergency Medicine & Critical Care", status="on_duty", ward_id=w_icu.id),
        Doctor(hospital_id=h1.id, name="Dr. Ananya Sharma", specialization="Trauma Surgery", status="on_duty", ward_id=w_gen.id),
        Doctor(hospital_id=h1.id, name="Dr. Rohan Kulkarni", specialization="Cardiology", status="on_call", ward_id=w_icu.id),
    ]
    nurses = [
        Nurse(hospital_id=h1.id, name="Nurse Priya Deshmukh", ward_id=w_icu.id, shift="Morning", status="on_duty"),
        Nurse(hospital_id=h1.id, name="Nurse Sneha Patil", ward_id=w_hdu.id, shift="Morning", status="on_duty"),
        Nurse(hospital_id=h1.id, name="Nurse Kavita Shinde", ward_id=w_gen.id, shift="Morning", status="on_duty"),
        Nurse(hospital_id=h1.id, name="Nurse Rajesh Verma", ward_id=w_gen.id, shift="Morning", status="on_duty"),
    ]
    db.add_all(doctors + nurses)
    db.commit()

    # 7. Ambulances
    ambs = [
        Ambulance(hospital_id=h1.id, code="AMB-01", status="en_route", location="FC Road Junction", eta_min=5, patient_summary="58M, acute dyspnea, sat 88%", expected_level="P1"),
        Ambulance(hospital_id=h1.id, code="AMB-02", status="available", location="Base Bay 2", eta_min=0, patient_summary=None, expected_level=None),
        Ambulance(hospital_id=h1.id, code="AMB-03", status="returning", location="Shivaji Nagar", eta_min=14, patient_summary=None, expected_level=None)
    ]
    db.add_all(ambs)
    db.commit()

    # 8. Network Hospitals
    networks = [
        NetworkHospital(hospital_id=h1.id, name="Ruby Hall Clinic, Pune", distance_km=4.2, icu_free=4, vent_free=3),
        NetworkHospital(hospital_id=h1.id, name="Jehangir Hospital, Pune", distance_km=6.8, icu_free=2, vent_free=1),
        NetworkHospital(hospital_id=h1.id, name="Sahyadri Super Speciality Hospital", distance_km=8.5, icu_free=5, vent_free=4),
        NetworkHospital(hospital_id=h1.id, name="Deenanath Mangeshkar Hospital", distance_km=11.2, icu_free=3, vent_free=2)
    ]
    db.add_all(networks)
    db.commit()

    # 9. Initial Seed Patients in Waiting Queue
    pts_seed = [
        {
            "code": "PT101", "name": "Aarav Mehta", "age": 46, "gender": "Male",
            "complaint": "Severe abdominal pain and recurrent vomiting",
            "note": "Epigastric tenderness, history of gallstones, dehydrated",
            "vitals": {"hr": 104, "sbp": 108, "dbp": 72, "spo2": 95.0, "temp": 38.3, "rr": 22, "consciousness": "Alert"},
            "mins_ago": 18
        },
        {
            "code": "PT102", "name": "Meera Joshi", "age": 68, "gender": "Female",
            "complaint": "Persistent productive cough, high fever",
            "note": "Bilateral wheeze, productive yellowish sputum, fatigue",
            "vitals": {"hr": 88, "sbp": 126, "dbp": 78, "spo2": 96.0, "temp": 38.5, "rr": 19, "consciousness": "Alert"},
            "mins_ago": 26
        },
        {
            "code": "PT103", "name": "Rohan Gupta", "age": 29, "gender": "Male",
            "complaint": "Right ankle sprain after soccer fall",
            "note": "Localized swelling over lateral malleolus, neurovascular intact",
            "vitals": {"hr": 74, "sbp": 118, "dbp": 76, "spo2": 99.0, "temp": 36.9, "rr": 15, "consciousness": "Alert"},
            "mins_ago": 42
        }
    ]

    heap = get_hospital_heap(h1.id)

    for pdata in pts_seed:
        arr_time = datetime.utcnow() - timedelta(minutes=pdata["mins_ago"])
        p = Patient(
            hospital_id=h1.id,
            code=pdata["code"],
            name=pdata["name"],
            age=pdata["age"],
            gender=pdata["gender"],
            blood_group="B+",
            chief_complaint=pdata["complaint"],
            triage_note=pdata["note"],
            arrival_mode="Walk-in",
            status="waiting",
            arrived_at=arr_time
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        vit = PatientVitals(
            patient_id=p.id,
            **pdata["vitals"],
            recorded_by="Triage Nurse",
            recorded_at=arr_time
        )
        db.add(vit)
        db.commit()

        eval_res = hybrid_engine.evaluate_patient({"age": p.age, "gender": p.gender, "chief_complaint": p.chief_complaint, "triage_note": p.triage_note}, pdata["vitals"])
        a = TriageAssessment(
            patient_id=p.id,
            model_version=eval_res["model_version"],
            ml_score=eval_res["ml_score"],
            news2=eval_res["news2"],
            priority_score=eval_res["priority_score"],
            level=eval_res["level"],
            predicted_disposition=eval_res["predicted_disposition"],
            disposition_probs=eval_res["disposition_probs"],
            explanation=eval_res["explanation"],
            ai_fallback=eval_res["ai_fallback"],
            created_at=arr_time
        )
        db.add(a)
        db.commit()

        # Insert to Indexed Max Heap
        node = HeapNode(
            patient_id=p.id,
            base_priority=eval_res["priority_score"],
            arrival_ts=arr_time.timestamp(),
            patient_code=p.code,
            patient_name=p.name,
            level=eval_res["level"],
            disposition=eval_res["predicted_disposition"]
        )
        heap.insert(node)

    # 10. Initial Alert
    al = Alert(
        hospital_id=h1.id,
        type="ICU_CAPACITY",
        severity="warning",
        message="ICU occupancy at 67% (4/6 beds in use). 2 available beds remaining.",
        status="active"
    )
    db.add(al)
    db.commit()

    # 11. Initial Audit Logs
    db.add(AuditLog(hospital_id=h1.id, user_id=user_doctor.id, action="SYSTEM_INIT", entity="System", details={"status": "Hospital Operational"}))
    db.commit()

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
