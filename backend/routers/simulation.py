from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas import SimExperimentRequest
from backend.deps import get_current_user
from backend.models import User, SimRun
from backend.services.simulation_service import run_discrete_event_simulation, run_multi_strategy_experiment
from backend.ai.model_engine import hybrid_engine

router = APIRouter(tags=["Simulation Lab & AI Research Engine"])

@router.post("/simulation/experiment")
def run_simulation_experiment(
    req: SimExperimentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes C4 Research Contribution benchmark:
    Runs FIFO vs Static Triage vs VitalFlow Closed-Loop over identical seeded runs.
    """
    res = run_multi_strategy_experiment(hours=req.hours, runs=req.runs)

    # Persist simulation run
    for row in res["table"]:
        run_record = SimRun(
            hospital_id=current_user.hospital_id,
            strategy=row["strategy"],
            params={"hours": req.hours, "runs": req.runs},
            metrics=row
        )
        db.add(run_record)
    db.commit()

    return res

@router.get("/ai/model-info")
def get_ai_model_info():
    """
    Returns C1 & C2 Research Metrics:
    NEWS2 rules vs Vitals-only vs Multimodal VitalFlow Hybrid (TF-IDF + Vitals)
    """
    return hybrid_engine.evaluation_metrics

@router.get("/ai/fairness-report")
def get_ai_fairness_report():
    """
    Returns C3 Subgroup Fairness Audit across Demographic Subsets (Age and Gender)
    """
    return hybrid_engine.fairness_report

@router.post("/simulation/reset-demo")
def reset_demo_state(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resets hospital beds, patients, and queues back to initial demo start state.
    """
    from backend.models import Bed, Patient, PatientVitals, TriageAssessment, BedAllocation, Alert
    from backend.services.queue_service import get_hospital_heap, HeapNode
    hospital_id = current_user.hospital_id

    # Reset beds
    beds = db.query(Bed).filter(Bed.hospital_id == hospital_id).all()
    for b in beds:
        if b.number in ["ICU-102", "ICU-106", "HDU-201", "HDU-203", "GEN-301", "GEN-302", "GEN-304"]:
            b.status = "available"
            b.current_patient_id = None
        else:
            b.status = "occupied"

    # Reset heap
    heap = get_hospital_heap(hospital_id)
    heap.heap.clear()
    heap.pos.clear()

    # Re-insert waiting patients
    waiting_pts = db.query(Patient).filter(Patient.hospital_id == hospital_id, Patient.status == "waiting").all()
    for p in waiting_pts:
        latest_a = db.query(TriageAssessment).filter(TriageAssessment.patient_id == p.id).order_by(TriageAssessment.created_at.desc()).first()
        score = latest_a.priority_score if latest_a else 50.0
        level = latest_a.level if latest_a else "P3"
        disp = latest_a.predicted_disposition if latest_a else "Ward"
        heap.insert(HeapNode(p.id, score, p.arrived_at.timestamp(), p.code, p.name, level, disp))

    db.commit()
    return {"message": "Demo scenario state refreshed and primed for presentation"}

