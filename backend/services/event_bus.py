"""
Event Bus & WebSocket Broadcaster
Dispatches operational real-time events scoped by hospital_id.
"""

import json
from typing import Dict, Set, Any
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # hospital_id -> set of active WebSockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, hospital_id: int, websocket: WebSocket):
        await websocket.accept()
        if hospital_id not in self.active_connections:
            self.active_connections[hospital_id] = set()
        self.active_connections[hospital_id].add(websocket)

    def disconnect(self, hospital_id: int, websocket: WebSocket):
        if hospital_id in self.active_connections:
            self.active_connections[hospital_id].discard(websocket)
            if not self.active_connections[hospital_id]:
                del self.active_connections[hospital_id]

    async def broadcast_to_hospital(self, hospital_id: int, event_type: str, payload: Any):
        if hospital_id not in self.active_connections:
            return
        message = json.dumps({
            "event": event_type,
            "data": payload
        })
        dead_sockets = set()
        for connection in self.active_connections[hospital_id]:
            try:
                await connection.send_text(message)
            except Exception:
                dead_sockets.add(connection)
        for dead in dead_sockets:
            self.active_connections[hospital_id].discard(dead)

manager = ConnectionManager()

async def emit_event(hospital_id: int, event_type: str, data: Any):
    """Publish real-time event to hospital subscribers"""
    await manager.broadcast_to_hospital(hospital_id, event_type, data)
