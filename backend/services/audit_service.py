"""
Clinical & Operational Audit Logging Service
Ensures immutable recording of decisions, AI overrides, bed allocations, and state shifts.
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
from backend.models import AuditLog

def log_audit_event(
    db: Session,
    hospital_id: int,
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    user_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None
) -> AuditLog:
    log_entry = AuditLog(
        hospital_id=hospital_id,
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details or {},
        created_at=datetime.utcnow()
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
