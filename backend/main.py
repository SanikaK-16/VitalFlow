import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import engine, Base
from backend.seed import seed_database
from backend.services.queue_service import hospital_heaps
from backend.services.event_bus import emit_event

# Routers
from backend.routers import auth, patients, triage, queue, beds, resources, dashboard, alerts, reports, simulation, websocket

async def background_aging_task():
    """
    Periodic background task recomputing anti-starvation aging on Indexed Max Heaps
    every 30 seconds and emitting PRIORITY_CHANGED if effective scores shift.
    """
    while True:
        try:
            await asyncio.sleep(settings.AGING_INTERVAL_SECONDS)
            for hospital_id, heap in list(hospital_heaps.items()):
                updated_ids = heap.apply_aging()
                if updated_ids:
                    await emit_event(hospital_id, "QUEUE_UPDATED", {"updated_patients": updated_ids})
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in background aging task: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables, run seeds
    Base.metadata.create_all(bind=engine)
    try:
        seed_database()
    except Exception as e:
        print(f"Seed warning: {e}")

    # Launch background aging task
    aging_task = asyncio.create_task(background_aging_task())
    yield
    # Shutdown
    aging_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="VitalFlow v3: Real-Time Closed-Loop Emergency Resource Optimization",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(triage.router, prefix=settings.API_V1_STR)
app.include_router(queue.router, prefix=settings.API_V1_STR)
app.include_router(beds.router, prefix=settings.API_V1_STR)
app.include_router(resources.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(simulation.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "tagline": "The right patient. The right bed. Right now.",
        "version": settings.VERSION,
        "status": "Operational"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
