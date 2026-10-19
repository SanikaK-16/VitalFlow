"""
Multimodal Feature Extraction for Clinical Emergency Triage
Combines:
- Structured vitals (hr, sbp, dbp, spo2, temp, rr)
- Demographics (age, gender)
- Neurological state (consciousness AVPU)
- Unstructured free-text triage note via TF-IDF vectorization
"""

import re
import numpy as np
from typing import Dict, Any, Tuple, List
from sklearn.feature_extraction.text import TfidfVectorizer

# Clinical keyword vocabulary for ED triage notes
CLINICAL_KEYWORDS = [
    "chest pain", "shortness of breath", "breathless", "dyspnea", "unconscious",
    "altered mental status", "severe trauma", "hemorrhage", "bleeding", "cyanosis",
    "stroke", "slurred speech", "weakness", "cardiac arrest", "seizure",
    "fever", "cough", "abdominal pain", "vomiting", "dizziness",
    "mild headache", "minor laceration", "sprain", "routine checkup", "stable"
]

class ClinicalFeaturePipeline:
    def __init__(self):
        self.tfidf = TfidfVectorizer(vocabulary=CLINICAL_KEYWORDS, lowercase=True, binary=False)
        self.tfidf.fit(CLINICAL_KEYWORDS)
        self.feature_names = [
            "age", "hr", "sbp", "dbp", "spo2", "temp", "rr",
            "is_alert", "is_male"
        ] + [f"kw_{k.replace(' ', '_')}" for k in CLINICAL_KEYWORDS]

    def extract_features(self, patient_data: Dict[str, Any], vitals: Dict[str, Any]) -> np.ndarray:
        age = float(patient_data.get("age", 40))
        gender = str(patient_data.get("gender", "Other")).lower()
        is_male = 1.0 if gender in ["male", "m"] else 0.0

        hr = float(vitals.get("hr", 75))
        sbp = float(vitals.get("sbp", 120))
        dbp = float(vitals.get("dbp", 80))
        spo2 = float(vitals.get("spo2", 98.0))
        temp = float(vitals.get("temp", 37.0))
        rr = float(vitals.get("rr", 16))

        consciousness = str(vitals.get("consciousness", "Alert")).strip().lower()
        is_alert = 1.0 if consciousness in ["alert", "a"] else 0.0

        # Note text
        note = f"{patient_data.get('chief_complaint', '')} {patient_data.get('triage_note', '')}".lower()
        tfidf_vec = self.tfidf.transform([note]).toarray()[0]

        dense_vitals = np.array([
            age, hr, sbp, dbp, spo2, temp, rr, is_alert, is_male
        ], dtype=float)

        combined = np.concatenate([dense_vitals, tfidf_vec])
        return combined

feature_pipeline = ClinicalFeaturePipeline()
