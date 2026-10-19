import csv
import io
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import AuditLog, Patient, BedAllocation, User
from backend.deps import get_current_user

router = APIRouter(tags=["Reports & Audit Trail"])

@router.get("/audit")
def get_audit_trail(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).filter(AuditLog.hospital_id == current_user.hospital_id).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [{
        "id": l.id,
        "action": l.action,
        "entity": l.entity,
        "entity_id": l.entity_id,
        "user_id": l.user_id,
        "details": l.details,
        "created_at": l.created_at.isoformat()
    } for l in logs]

@router.get("/reports/{type}")
def export_report(
    type: str,
    format: str = Query("csv"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    output = io.StringIO()
    writer = csv.writer(output)

    if type == "patients":
        writer.writerow(["ID", "Code", "Name", "Age", "Gender", "Status", "Arrival"])
        pts = db.query(Patient).filter(Patient.hospital_id == current_user.hospital_id).all()
        for p in pts:
            writer.writerow([p.id, p.code, p.name, p.age, p.gender, p.status, p.arrived_at.isoformat()])
    elif type == "audit":
        writer.writerow(["ID", "Action", "Entity", "EntityID", "Details", "Timestamp"])
        logs = db.query(AuditLog).filter(AuditLog.hospital_id == current_user.hospital_id).all()
        for l in logs:
            writer.writerow([l.id, l.action, l.entity, l.entity_id, str(l.details), l.created_at.isoformat()])
    else:
        writer.writerow(["Message"])
        writer.writerow(["Report type not recognized"])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=vitalflow_{type}_report.csv"}
    )
