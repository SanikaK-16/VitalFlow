from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from backend.database import get_db
from backend.models import Alert, User
from backend.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["Clinical Alerts"])

@router.get("")
def get_alerts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Alert).filter(Alert.hospital_id == current_user.hospital_id).order_by(Alert.created_at.desc()).all()

@router.post("/{id}/ack")
def acknowledge_alert(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id, Alert.hospital_id == current_user.hospital_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "acknowledged"
    db.commit()
    return {"message": "Alert acknowledged", "id": alert.id}

@router.post("/{id}/resolve")
def resolve_alert(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id, Alert.hospital_id == current_user.hospital_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    return {"message": "Alert resolved", "id": alert.id}
