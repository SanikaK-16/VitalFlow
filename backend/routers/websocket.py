from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.services.event_bus import manager
from backend.services.auth_service import decode_access_token

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None),
    hospital_id: int = Query(1)
):
    # Verify token if present, else fallback to hospital_id
    if token:
        payload = decode_access_token(token)
        if payload and "hospital_id" in payload:
            hospital_id = payload["hospital_id"]

    await manager.connect(hospital_id, websocket)
    try:
        while True:
            # Keep-alive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"event": "pong"}')
    except WebSocketDisconnect:
        manager.disconnect(hospital_id, websocket)
    except Exception:
        manager.disconnect(hospital_id, websocket)
