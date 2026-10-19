from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User, Hospital
from backend.services.auth_service import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        # For ease of testing or demonstration if token omitted, retrieve default active user or raise 401
        user = db.query(User).filter(User.status == "active").first()
        if user:
            return user
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        raise credentials_exception
    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id, User.status == "active").first()
    if user is None:
        raise credentials_exception
    return user
