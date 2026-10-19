# VITALFLOW : AI-Driven Dynamic Hospital Resource Optimization Using Priority Intelligence

> **Tagline:** *The right patient. The right bed. Right now.*  
> **Seminar Hook:** *"Existing studies predict triage and disposition. VitalFlow operationalizes those predictions into live resource decisions and measures the effect."*

---

## 1. System Overview & Core Contributions

VitalFlow is a real-time, multi-hospital emergency operations platform that bridges the clinical prediction-to-action gap. Rather than stopping at offline triage predictions, VitalFlow directly closes the operational loop into dynamic queueing, bed allocations, equipment assignments, network referrals, and clinical auditability.

### The Four Core Research Contributions:

| # | Research Contribution | What is Implemented | Research Evidence & Metric |
|---|-----------------------|---------------------|----------------------------|
| **C1** | **Multimodal Hybrid Triage Engine** | Combines structured vitals, consciousness (AVPU), demographics, and free-text triage notes via TF-IDF vectorization with Gradient Boosted Trees and a deterministic **NEWS2 (National Early Warning Score 2)** clinical safety baseline. | Vitals-only vs. Multimodal (Vitals + Note) accuracy comparison (+6.8% accuracy boost when parsing clinical note nuances). |
| **C2** | **Disposition-Driven Resource Allocation** | 4-class disposition classifier (Discharge, Ward, HDU, ICU) mapped directly into the multi-criteria resource optimization engine. | Real-time translation of clinical disposition probabilities into immediate candidate bed scoring and ICU compatibility verification. |
| **C3** | **Human-in-the-Loop AI with Explainability & Fairness** | SHAP-style clinical factor attributions (e.g. `SpO2 < 90% (+34.5%)`, `Chest pain note (+16.8%)`), explicit clinician Accept/Override controls with logged justification reasons, and demographic subgroup bias audits across Age and Gender. | Live override rate tracking (87.5% acceptance), logged audit trail, and demographic fairness parity report across cohorts. |
| **C4** | **Closed-Loop Dynamic Prioritization Evaluated by Simulation** | Discrete-event simulator evaluating **FIFO**, **Static Triage**, and **VitalFlow Closed-Loop** across identical seeded patient arrival streams. | Results Table: P1 critical wait reduced by >70% (3.7 min vs 12.4 min static vs 98.4 min FIFO), zero lower-priority starvation via anti-starvation aging, and 91.9% bed utilization. |

---

## 2. Core Algorithmic Architecture

### 2.1 Hybrid Multimodal Triage Formula
$$\text{Priority Score} = 0.70 \times \text{ML\_Score} + 0.30 \times \text{Scaled}(\text{NEWS2})$$
- **Deterministic Clinical Safety Rule:** If $\text{NEWS2} \ge 7$, priority score is floored at $\ge 88.0$ (guaranteed **P1** Resuscitation level).
- **Fallback Chain:** If the ML model encounters an anomaly or missing features, the system seamlessly falls back to pure clinical NEWS2 deterministic scoring.
- **Triage Levels:**
  - **P1 (Immediate/Resuscitation):** $\ge 85.0$
  - **P2 (Very Urgent / HDU):** $70.0 - 84.9$
  - **P3 (Urgent / Ward):** $40.0 - 69.9$
  - **P4 (Standard / OPD):** $< 40.0$

### 2.2 In-Memory Indexed Max Heap with Anti-Starvation Aging
Patients in each hospital queue are maintained in an in-memory binary Max Heap ordered by:
$$(\text{Effective Priority}, -\text{Arrival Timestamp}, \text{Patient ID})$$
- **Anti-Starvation Aging Formula:**
  $$\text{Effective Priority} = \text{Base Priority} + \min(\text{Cap}, k \times \text{Wait Minutes})$$
  *(where $k = 0.5$ pts/min and the cap ensures a lower-priority P4 never overtakes an emergent P1).*
- **Complexity:** Insertion $O(\log n)$, Key update $O(\log n)$, Extraction $O(\log n)$, Peek $O(1)$.
- **Live Tree:** Background async worker periodically recalculates aging and broadcasts tree state over WebSockets.

### 2.3 Multi-Criteria Bed Optimization Engine
For each candidate available bed:
$$\text{Score} = 0.40 \cdot \text{Care Level Match} + 0.25 \cdot \text{Equipment Match} + 0.15 \cdot \text{Ward Fit} + 0.10 \cdot \text{Staff Load} + 0.10 \cdot \text{Readiness}$$

---

## 3. Technology Stack

- **Backend:** FastAPI, Python 3.11, SQLAlchemy, Uvicorn, WebSockets.
- **AI & Analytics:** Scikit-Learn (Gradient Boosting & TF-IDF), NumPy, Pandas.
- **Frontend:** React 19, Vite 8, Tailwind CSS, Lucide React, Recharts.
- **Persistence & Auditing:** SQLite / PostgreSQL compatible SQLAlchemy engine.
- **Security & Multi-Tenancy:** JWT (HS256), Native bcrypt hashing, hospital scoping.

---

## 4. Quickstart: Running VitalFlow Locally

### 1. Prerequisites
- Python 3.10+ (tested with Python 3.11)
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run the FastAPI server (auto-seeds database on first run)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8005 --reload
```
- Interactive API Docs (Swagger): `http://127.0.0.1:8005/docs`
- Health Check: `http://127.0.0.1:8005/`

### 3. Frontend Setup
```bash
# In a new terminal window:
cd frontend
npm install
npm run dev
```
- Clinical Command Center: `http://localhost:5173/`

### 4. Default Demo Account Credentials
| Role | Email | Password | Facility |
|---|---|---|---|
| **Lead Clinician / Admin** | `dr.rao@vitalflow.health` | `password123` | CityCare Hospital, Pune |
| **Operations Admin** | `admin@vitalflow.health` | `admin123` | CityCare Hospital, Pune |

*(You can also click **"Register New Hospital"** on the login screen to onboard a brand new facility with isolated beds and departments.)*

---

## 5. Seminar & Viva Demonstration Script (5–7 Minutes)

1. **Dashboard Command Center:**
   - Open `http://localhost:5174/`.
   - Highlight the **KPI Row** (Active Emergencies, ICU Free, P1 Waiting, Surge Index).
   - Show the **Surge Gauge** (Normal/Elevated with Disaster Mode thresholding) and **AI Insights** card showing clinician acceptance (87.5%) and logged override reasons.

2. **Registering Critical Patient PT104 (C1 & C2):**
   - Click `+ Emergency Patient` (or press `Ctrl+K`).
   - Click the preset `PT104 (P1 Chest Pain)`.
   - Vitals: SpO2 88%, SBP 86 mmHg, HR 122 bpm, RR 26, Note: *"Severe chest pain, breathless"*.
   - Click **Execute Triage & Enqueue**.
   - Result: AI classifies as **P1**, Score **93.9**, Disposition **ICU**.
   - The patient immediately jumps to the **Root of the Max Heap**.

3. **Multi-Criteria Bed Recommendation:**
   - On the right panel, see the recommendation: **ICU-102 (97% Match)**.
   - Reason: *"vent-compatible verified, ICU designated ward, moderate nurse load"*.
   - Click **Accept Recommendation**. Bed ICU-102 is allocated and patient is admitted.

4. **Vitals Deterioration & Live Re-Triage:**
   - On a waiting patient in the queue, click **Demo: Worsen Vitals (SpO2 82%, BP 76/48)**.
   - The system executes dynamic re-triage: priority elevates to **98**, the queue re-sorts via $O(\log n)$ sift-up, and an automated ventilator alert is published to WebSockets.

5. **Clinician Human-in-the-Loop Override (C3):**
   - Click **Override (with reason)** on a patient.
   - Select reason: *"Pre-existing end-stage chronic cardiac disease"* and confirm.
   - Observe the update recorded in the **Immutable Audit Trail**.

6. **C4 Simulation Lab Experiment:**
   - Navigate to **Simulation Lab (C4)** from the sidebar.
   - Click **Run Multi-Seed Benchmark**.
   - Review the experimental comparison table:
     - **FIFO:** P1 Wait 98 min, Time-to-ICU 100 min.
     - **Static Triage:** P1 Wait 12.4 min, Starvation 14 patients.
     - **VitalFlow Closed-Loop:** P1 Wait **3.7 min** (70% reduction), **0 Starved**, **91.9% Utilization**.
   - Review the **C1 Multimodal vs Vitals-Only Accuracy Table** and **C3 Demographic Fairness Report**.
