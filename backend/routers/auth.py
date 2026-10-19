from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Hospital, User, Ward, Bed, Equipment, Doctor, Nurse, NetworkHospital, AuditLog
from backend.schemas import HospitalRegisterRequest, LoginRequest, TokenResponse
from backend.services.auth_service import verify_password, get_password_hash, create_access_token
from backend.services.queue_service import get_hospital_heap
from backend.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Hospital Management"])

@router.post("/register-hospital", response_model=TokenResponse)
def register_hospital(req: HospitalRegisterRequest, db: Session = Depends(get_db)):
    # Check if hospital reg_no exists
    if db.query(Hospital).filter(Hospital.reg_no == req.reg_no.strip()).first():
        raise HTTPException(status_code=400, detail=f"Hospital registration number '{req.reg_no}' already registered")
    
    # Check if admin email exists
    if db.query(User).filter(User.email == req.admin_email.strip().lower()).first():
        raise HTTPException(status_code=400, detail=f"Email '{req.admin_email}' is already associated with an account")

    # 1. Create Hospital
    hospital = Hospital(
        name=req.hospital_name.strip(),
        reg_no=req.reg_no.strip(),
        address=req.address.strip() if req.address else "Central Medical District",
        city=req.city.strip() if req.city else "Pune",
        phone=req.phone.strip() if req.phone else "+91 20 2567 8900",
        status="Operational"
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)

    # 2. Create Hospital Admin / Lead Doctor
    user = User(
        hospital_id=hospital.id,
        name=req.admin_name.strip(),
        email=req.admin_email.strip().lower(),
        password_hash=get_password_hash(req.password),
        role="doctor",
        status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 3. Provision baseline clinical departments (Wards & Beds) for the new facility
    w_icu = Ward(hospital_id=hospital.id, name="Intensive Care Unit (ICU)", type="ICU", capacity=4)
    w_hdu = Ward(hospital_id=hospital.id, name="High Dependency Unit (HDU)", type="HDU", capacity=4)
    w_gen = Ward(hospital_id=hospital.id, name="General Emergency Ward", type="General", capacity=8)
    db.add_all([w_icu, w_hdu, w_gen])
    db.commit()
    db.refresh(w_icu)
    db.refresh(w_hdu)
    db.refresh(w_gen)

    # Provision standard beds for each unit
    new_beds = [
        # ICU
        Bed(hospital_id=hospital.id, ward_id=w_icu.id, number="ICU-101", type="ICU", status="available", oxygen=True, monitor=True, vent_compatible=True),
        Bed(hospital_id=hospital.id, ward_id=w_icu.id, number="ICU-102", type="ICU", status="available", oxygen=True, monitor=True, vent_compatible=True),
        Bed(hospital_id=hospital.id, ward_id=w_icu.id, number="ICU-103", type="ICU", status="available", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=hospital.id, ward_id=w_icu.id, number="ICU-104", type="ICU", status="available", oxygen=True, monitor=True, vent_compatible=False),
        # HDU
        Bed(hospital_id=hospital.id, ward_id=w_hdu.id, number="HDU-201", type="HDU", status="available", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=hospital.id, ward_id=w_hdu.id, number="HDU-202", type="HDU", status="available", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=hospital.id, ward_id=w_hdu.id, number="HDU-203", type="HDU", status="available", oxygen=True, monitor=True, vent_compatible=False),
        Bed(hospital_id=hospital.id, ward_id=w_hdu.id, number="HDU-204", type="HDU", status="available", oxygen=True, monitor=True, vent_compatible=False),
        # General
        Bed(hospital_id=hospital.id, ward_id=w_gen.id, number="GEN-301", type="General", status="available", oxygen=True, monitor=False, vent_compatible=False),
        Bed(hospital_id=hospital.id, ward_id=w_gen.id, number="GEN-302", type="General", status="available", oxygen=True, monitor=False, vent_compatible=False),
        Bed(hospital_id=hospital.id, ward_id=w_gen.id, number="GEN-303", type="General", status="available", oxygen=True, monitor=False, vent_compatible=False),
        Bed(hospital_id=hospital.id, ward_id=w_gen.id, number="GEN-304", type="General", status="available", oxygen=False, monitor=False, vent_compatible=False),
    ]
    db.add_all(new_beds)

    # Provision equipment
    equip = [
        Equipment(hospital_id=hospital.id, type="Ventilator", serial=f"VENT-H{hospital.id}01", status="available"),
        Equipment(hospital_id=hospital.id, type="Ventilator", serial=f"VENT-H{hospital.id}02", status="available"),
        Equipment(hospital_id=hospital.id, type="Defibrillator", serial=f"DEFIB-H{hospital.id}01", status="available"),
        Equipment(hospital_id=hospital.id, type="Infusion Pump", serial=f"PUMP-H{hospital.id}01", status="available"),
    ]
    db.add_all(equip)

    # Provision staff on duty
    staff = [
        Doctor(hospital_id=hospital.id, name=req.admin_name.strip(), specialization="Emergency Medicine & Critical Care", status="on_duty", ward_id=w_icu.id),
        Doctor(hospital_id=hospital.id, name="Dr. Resident On-Call", specialization="Internal Medicine", status="on_duty", ward_id=w_gen.id),
        Nurse(hospital_id=hospital.id, name="Charge Nurse Deshmukh", ward_id=w_icu.id, shift="Morning", status="on_duty"),
        Nurse(hospital_id=hospital.id, name="Staff Nurse Patil", ward_id=w_hdu.id, shift="Morning", status="on_duty"),
    ]
    db.add_all(staff)

    # Network referral hospitals
    networks = [
        NetworkHospital(hospital_id=hospital.id, name="Regional Multi-Speciality Clinic", distance_km=5.4, icu_free=4, vent_free=2),
        NetworkHospital(hospital_id=hospital.id, name="Metro General Hospital", distance_km=7.8, icu_free=3, vent_free=1),
        NetworkHospital(hospital_id=hospital.id, name="City Care Trauma Center", distance_km=9.2, icu_free=5, vent_free=3),
    ]
    db.add_all(networks)

    # System Init Audit Log
    db.add(AuditLog(
        hospital_id=hospital.id,
        user_id=user.id,
        action="HOSPITAL_REGISTERED",
        entity="Hospital",
        entity_id=str(hospital.id),
        details={"name": hospital.name, "reg_no": hospital.reg_no, "admin": user.name}
    ))
    db.commit()

    # Initialize in-memory Priority Max Heap for the newly registered hospital
    get_hospital_heap(hospital.id)

    token = create_access_token({"sub": user.id, "hospital_id": hospital.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "hospital": {"id": hospital.id, "name": hospital.name, "reg_no": hospital.reg_no, "city": hospital.city}
    }

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid hospital email or password")

    hospital = db.query(Hospital).filter(Hospital.id == user.hospital_id).first()
    token = create_access_token({"sub": user.id, "hospital_id": user.hospital_id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "hospital": {"id": hospital.id, "name": hospital.name, "reg_no": hospital.reg_no, "city": hospital.city} if hospital else {}
    }

@router.get("/demo-accounts")
def get_demo_accounts(db: Session = Depends(get_db)):
    """Returns pre-configured demo hospitals and accounts for 1-click viva/demo sign in"""
    users = db.query(User).join(Hospital).filter(User.status == "active").all()
    accounts = []
    for u in users:
        accounts.append({
            "email": u.email,
            "doctor_name": u.name,
            "role": u.role,
            "hospital_name": u.hospital.name if u.hospital else "Hospital",
            "hospital_city": u.hospital.city if u.hospital else "City",
            "reg_no": u.hospital.reg_no if u.hospital else ""
        })
    return accounts

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    hospital = db.query(Hospital).filter(Hospital.id == current_user.hospital_id).first()
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "hospital_id": current_user.hospital_id,
        "hospital": {
            "id": hospital.id,
            "name": hospital.name,
            "reg_no": hospital.reg_no,
            "city": hospital.city,
            "status": hospital.status
        } if hospital else None
    }

@router.get("/hospital")
def get_hospital_details(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    hospital = db.query(Hospital).filter(Hospital.id == current_user.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return {
        "id": hospital.id,
        "name": hospital.name,
        "reg_no": hospital.reg_no,
        "address": hospital.address,
        "city": hospital.city,
        "phone": hospital.phone,
        "email": hospital.email,
        "status": hospital.status
    }

@router.put("/hospital")
def update_hospital_details(payload: dict, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    hospital = db.query(Hospital).filter(Hospital.id == current_user.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    if "status" in payload:
        hospital.status = payload["status"]
    if "name" in payload:
        hospital.name = payload["name"]
    if "phone" in payload:
        hospital.phone = payload["phone"]
    db.commit()
    return hospital
