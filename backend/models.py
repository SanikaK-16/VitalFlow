from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    reg_no = Column(String(100), unique=True, nullable=False)
    address = Column(String(255), nullable=True)
    city = Column(String(100), default="Pune")
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    logo_url = Column(String(500), nullable=True)
    status = Column(String(50), default="Operational") # Operational, Surge, Disaster
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="hospital")
    patients = relationship("Patient", back_populates="hospital")
    wards = relationship("Ward", back_populates="hospital")
    beds = relationship("Bed", back_populates="hospital")
    equipment = relationship("Equipment", back_populates="hospital")
    doctors = relationship("Doctor", back_populates="hospital")
    nurses = relationship("Nurse", back_populates="hospital")
    ambulances = relationship("Ambulance", back_populates="hospital")
    network_hospitals = relationship("NetworkHospital", back_populates="hospital")
    referrals = relationship("Referral", back_populates="hospital")
    alerts = relationship("Alert", back_populates="hospital")
    audit_logs = relationship("AuditLog", back_populates="hospital")
    sim_runs = relationship("SimRun", back_populates="hospital")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="doctor") # doctor, nurse, admin, triage_officer
    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")

    __table_args__ = (
        Index("ix_users_hospital_status", "hospital_id", "status"),
    )


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g. PT104
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False) # Male, Female, Other
    blood_group = Column(String(10), nullable=True)
    contact = Column(String(50), nullable=True)
    chief_complaint = Column(Text, nullable=True)
    triage_note = Column(Text, nullable=True)
    arrival_mode = Column(String(50), default="Walk-in") # Walk-in, Ambulance, Referral
    status = Column(String(50), default="waiting") # waiting, admitted, discharged, transferred
    arrived_at = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="patients")
    vitals = relationship("PatientVitals", back_populates="patient", cascade="all, delete-orphan")
    assessments = relationship("TriageAssessment", back_populates="patient", cascade="all, delete-orphan")
    allocations = relationship("BedAllocation", back_populates="patient")

    __table_args__ = (
        Index("ix_patients_hospital_status", "hospital_id", "status"),
    )


class PatientVitals(Base):
    __tablename__ = "patient_vitals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    hr = Column(Integer, nullable=False) # Heart Rate (bpm)
    sbp = Column(Integer, nullable=False) # Systolic BP (mmHg)
    dbp = Column(Integer, nullable=False) # Diastolic BP (mmHg)
    spo2 = Column(Float, nullable=False) # Oxygen Saturation (%)
    temp = Column(Float, nullable=False) # Temperature (Celsius)
    rr = Column(Integer, nullable=False) # Respiratory Rate (breaths/min)
    consciousness = Column(String(20), default="Alert") # Alert, Voice, Pain, Unresponsive (AVPU)
    recorded_by = Column(String(100), default="Nurse Staff")
    recorded_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="vitals")

    __table_args__ = (
        Index("ix_patient_vitals_patient_recorded", "patient_id", "recorded_at"),
    )


class TriageAssessment(Base):
    __tablename__ = "triage_assessments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    model_version = Column(String(50), default="v3-hybrid-xgb")
    ml_score = Column(Float, nullable=False)
    news2 = Column(Integer, nullable=False)
    priority_score = Column(Float, nullable=False)
    level = Column(String(10), nullable=False) # P1, P2, P3, P4
    predicted_disposition = Column(String(50), nullable=False) # Discharge, Ward, HDU, ICU
    disposition_probs = Column(JSON, nullable=True) # { "Discharge": 0.05, "Ward": 0.12, "HDU": 0.23, "ICU": 0.60 }
    explanation = Column(JSON, nullable=True) # Top factors: [{"factor": "SpO2 < 90%", "impact": "+32", "direction": "critical"}]
    ai_fallback = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="assessments")
    decisions = relationship("TriageDecision", back_populates="assessment")


class TriageDecision(Base):
    __tablename__ = "triage_decisions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("triage_assessments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(20), nullable=False) # accept, override
    final_level = Column(String(10), nullable=False) # P1, P2, P3, P4
    final_disposition = Column(String(50), nullable=False) # Discharge, Ward, HDU, ICU
    reason = Column(Text, nullable=True) # Doctor's justification for override
    created_at = Column(DateTime, default=datetime.utcnow)

    assessment = relationship("TriageAssessment", back_populates="decisions")


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False) # ICU, HDU, General, Isolation, Pediatric
    capacity = Column(Integer, default=10)

    hospital = relationship("Hospital", back_populates="wards")
    beds = relationship("Bed", back_populates="ward")
    doctors = relationship("Doctor", back_populates="ward")
    nurses = relationship("Nurse", back_populates="ward")


class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False)
    number = Column(String(50), nullable=False) # e.g. "ICU-101"
    type = Column(String(50), nullable=False) # ICU, HDU, General
    status = Column(String(50), default="available") # available, occupied, cleaning, maintenance
    oxygen = Column(Boolean, default=True)
    monitor = Column(Boolean, default=True)
    vent_compatible = Column(Boolean, default=False)
    current_patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)

    hospital = relationship("Hospital", back_populates="beds")
    ward = relationship("Ward", back_populates="beds")
    allocations = relationship("BedAllocation", back_populates="bed")

    __table_args__ = (
        Index("ix_beds_hospital_status", "hospital_id", "status"),
    )


class BedAllocation(Base):
    __tablename__ = "bed_allocations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=False)
    score = Column(Float, nullable=False) # matching algorithm score
    allocated_at = Column(DateTime, default=datetime.utcnow)
    released_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="allocations")
    bed = relationship("Bed", back_populates="allocations")


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    type = Column(String(50), nullable=False) # Ventilator, Defibrillator, Infusion Pump, Dialysis
    serial = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), default="available") # available, in_use, maintenance
    assigned_patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    assigned_bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)

    hospital = relationship("Hospital", back_populates="equipment")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100), default="Emergency Medicine")
    status = Column(String(50), default="on_duty") # on_duty, off_duty, on_call, busy
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)

    hospital = relationship("Hospital", back_populates="doctors")
    ward = relationship("Ward", back_populates="doctors")


class Nurse(Base):
    __tablename__ = "nurses"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String(100), nullable=False)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    shift = Column(String(50), default="Morning") # Morning, Evening, Night
    status = Column(String(50), default="on_duty") # on_duty, off_duty, busy

    hospital = relationship("Hospital", back_populates="nurses")
    ward = relationship("Ward", back_populates="nurses")


class PatientStaff(Base):
    __tablename__ = "patient_staff"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    staff_type = Column(String(20), nullable=False) # doctor, nurse
    staff_id = Column(Integer, nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)


class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    code = Column(String(50), nullable=False) # AMB-01
    status = Column(String(50), default="en_route") # en_route, available, returning, maintenance
    location = Column(String(255), default="FC Road Pune")
    eta_min = Column(Integer, default=12)
    patient_summary = Column(Text, nullable=True)
    expected_level = Column(String(10), default="P1")

    hospital = relationship("Hospital", back_populates="ambulances")


class NetworkHospital(Base):
    __tablename__ = "network_hospitals"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String(255), nullable=False)
    distance_km = Column(Float, nullable=False)
    icu_free = Column(Integer, default=5)
    vent_free = Column(Integer, default=2)
    updated_at = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="network_hospitals")


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    to_hospital_id = Column(Integer, ForeignKey("network_hospitals.id"), nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(50), default="pending") # pending, accepted, in_transit, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="referrals")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    type = Column(String(50), nullable=False) # ICU_CAPACITY, P1_WAITING, VENTILATOR_DEFICIT, SURGE_ALERT, OVERRIDE_SPIKE
    severity = Column(String(20), default="warning") # critical, warning, info
    message = Column(Text, nullable=False)
    status = Column(String(50), default="active") # active, acknowledged, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    hospital = relationship("Hospital", back_populates="alerts")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False) # TRIAGE_OVERRIDE, BED_ALLOCATED, PATIENT_ADMITTED, etc.
    entity = Column(String(100), nullable=False) # Patient, Bed, TriageDecision
    entity_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_hospital_created", "hospital_id", "created_at"),
    )


class SimRun(Base):
    __tablename__ = "sim_runs"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    strategy = Column(String(50), nullable=False) # FIFO, Static, VitalFlow
    params = Column(JSON, nullable=True) # { "arrivals_per_hour": 15, "duration_hours": 12, "seed": 42 }
    metrics = Column(JSON, nullable=True) # { "p1_wait_mean": 4.2, "time_to_icu": 8.1, "starved_p3_p4": 0, "utilization": 0.88 }
    created_at = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="sim_runs")
