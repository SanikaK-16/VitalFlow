"""
NEWS2 Clinical Early Warning Score Calculator
Reference: Royal College of Physicians (UK) National Early Warning Score 2 (NEWS2)
"""

from typing import Dict, Any, Tuple

def calculate_news2(vitals: Dict[str, Any]) -> Tuple[int, Dict[str, int]]:
    """
    Computes NEWS2 score and per-vital breakdown.
    vitals dict keys: rr, spo2, sbp, hr, temp, consciousness
    """
    rr = vitals.get("rr", 16)
    spo2 = vitals.get("spo2", 98.0)
    sbp = vitals.get("sbp", 120)
    hr = vitals.get("hr", 75)
    temp = vitals.get("temp", 37.0)
    consciousness = str(vitals.get("consciousness", "Alert")).strip().lower()

    breakdown = {}

    # 1. Respiration Rate
    if rr <= 8:
        rr_score = 3
    elif 9 <= rr <= 11:
        rr_score = 1
    elif 12 <= rr <= 20:
        rr_score = 0
    elif 21 <= rr <= 24:
        rr_score = 2
    else: # rr >= 25
        rr_score = 3
    breakdown["rr"] = rr_score

    # 2. Oxygen Saturation (Scale 1)
    if spo2 <= 91:
        spo2_score = 3
    elif 92 <= spo2 <= 93:
        spo2_score = 2
    elif 94 <= spo2 <= 95:
        spo2_score = 1
    else: # >= 96
        spo2_score = 0
    breakdown["spo2"] = spo2_score

    # 3. Systolic Blood Pressure
    if sbp <= 90:
        sbp_score = 3
    elif 91 <= sbp <= 100:
        sbp_score = 2
    elif 101 <= sbp <= 110:
        sbp_score = 1
    elif 111 <= sbp <= 219:
        sbp_score = 0
    else: # sbp >= 220
        sbp_score = 3
    breakdown["sbp"] = sbp_score

    # 4. Heart Rate (Pulse)
    if hr <= 40:
        hr_score = 3
    elif 41 <= hr <= 50:
        hr_score = 1
    elif 51 <= hr <= 90:
        hr_score = 0
    elif 91 <= hr <= 110:
        hr_score = 1
    elif 111 <= hr <= 130:
        hr_score = 2
    else: # hr >= 131
        hr_score = 3
    breakdown["hr"] = hr_score

    # 5. Consciousness (Alert = 0, CVPU = 3)
    if consciousness in ["alert", "a"]:
        cvpu_score = 0
    else:
        cvpu_score = 3
    breakdown["consciousness"] = cvpu_score

    # 6. Temperature
    if temp <= 35.0:
        temp_score = 3
    elif 35.1 <= temp <= 36.0:
        temp_score = 1
    elif 36.1 <= temp <= 38.0:
        temp_score = 0
    elif 38.1 <= temp <= 39.0:
        temp_score = 1
    else: # temp >= 39.1
        temp_score = 2
    breakdown["temp"] = temp_score

    total_score = sum(breakdown.values())
    return total_score, breakdown

def news2_to_scaled_score(news2_score: int) -> float:
    """
    Scales NEWS2 score (0-20) to a 0-100 scale.
    NEWS2 >= 7 is high risk, >= 10 is extreme risk.
    Maps 0 -> 10, 7 -> 85, 12+ -> 100
    """
    if news2_score <= 0:
        return 15.0
    if news2_score < 5:
        return 20.0 + (news2_score / 5.0) * 45.0  # 20 to 65 (P4/P3)
    if news2_score < 7:
        return 68.0 + ((news2_score - 5) / 2.0) * 14.0 # 68 to 82 (P2)
    # news2 >= 7
    return min(100.0, 85.0 + ((news2_score - 7) / 7.0) * 15.0) # 85 to 100 (P1)
