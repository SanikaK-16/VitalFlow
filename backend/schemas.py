from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth ---
class HospitalRegisterRequest(BaseModel):
    hospital_name: str
    reg_no: str
    address: Optional[str] = "Pune, Maharashtra"
    city: Optional[str] = "Pune"
    phone: Optional[str] = "+91 20 2567 8900"
    admin_name: str
    admin_email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]
    hospital: Dict[str, Any]

# --- Patient & Vitals ---
class VitalsInput(BaseModel):
    hr: int = Field(..., ge=20, le=240, description="Heart Rate")
    sbp: int = Field(..., ge=40, le=300, description="Systolic Blood Pressure")
    dbp: int = Field(..., ge=20, le=200, description="Diastolic Blood Pressure")
    spo2: float = Field(..., ge=50.0, le=100.0, description="SpO2 Saturation %")
    temp: float = Field(..., ge=30.0, le=44.0, description="Body Temperature C")
    rr: int = Field(..., ge=4, le=60, description="Respiratory Rate")
    consciousness: str = Field(default="Alert", description="Alert, Voice, Pain, Unresponsive")
    recorded_by: Optional[str] = "Staff Nurse"

class PatientCreateRequest(BaseModel):
    code: Optional[str] = None # Auto-generated if omitted (e.g. PT104)
    name: str
    age: int
    gender: str
    blood_group: Optional[str] = "O+"
    contact: Optional[str] = "+91 98765 43210"
    chief_complaint: str
    triage_note: Optional[str] = None
    arrival_mode: Optional[str] = "Walk-in"
    vitals: VitalsInput

# --- Triage Decision ---
class TriageDecisionRequest(BaseModel):
    action: str # accept, override
    final_level: Optional[str] = None # P1, P2, P3, P4
    final_disposition: Optional[str] = None # Discharge, Ward, HDU, ICU
    reason: Optional[str] = None # Clinician clinical rationale for override

# --- Bed & Allocation ---
class BedAllocateRequest(BaseModel):
    patient_id: int

class BedCreateRequest(BaseModel):
    ward_id: int
    number: str
    type: str
    oxygen: bool = True
    monitor: bool = True
    vent_compatible: bool = False

# --- Referral ---
class ReferralCreateRequest(BaseModel):
    patient_id: int
    to_hospital_id: int
    reason: str

# --- Simulation ---
class SimExperimentRequest(BaseModel):
    hours: int = 12
    runs: int = 5
