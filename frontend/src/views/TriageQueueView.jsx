import React, { useState, useEffect } from 'react';
import {
  Activity, Clock, ChevronRight, Check, AlertTriangle,
  TrendingDown, Bed, HeartPulse, RefreshCw
} from 'lucide-react';
import api from '../api';

export default function TriageQueueView({
  queueData = [],
  selectedPatientId,
  onSelectPatient,
  onOpenOverrideModal,
  onAllocateBedDirect
}) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [updatingVitals, setUpdatingVitals] = useState(false);

  // Keep selected patient in sync
  useEffect(() => {
    if (selectedPatientId && queueData.length > 0) {
      const match = queueData.find(p => p.patient_id === selectedPatientId);
      if (match) setSelectedPatient(match);
      else setSelectedPatient(queueData[0]);
    } else if (queueData.length > 0 && !selectedPatient) {
      setSelectedPatient(queueData[0]);
    }
  }, [selectedPatientId, queueData]);

  // Fetch bed recommendations for selected patient
  useEffect(() => {
    if (selectedPatient?.patient_id) {
      setLoadingRec(true);
      api.getBedRecommendations(selectedPatient.patient_id)
        .then(res => {
          setRecommendation(res.data);
          setLoadingRec(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingRec(false);
        });
    }
  }, [selectedPatient?.patient_id, selectedPatient?.effective_priority]);

  // Vitals deterioration demo trigger (clean label)
  const handleWorsenVitals = async () => {
    if (!selectedPatient) return;
    setUpdatingVitals(true);
    try {
      await api.updatePatientVitals(selectedPatient.patient_id, {
        hr: 135,
        sbp: 76,
        dbp: 48,
        spo2: 82.0,
        temp: 38.8,
        rr: 30,
        consciousness: "Voice"
      });
      const qRes = await api.getQueue();
      if (qRes.data?.queue) {
        const updated = qRes.data.queue.find(p => p.patient_id === selectedPatient.patient_id);
        if (updated) setSelectedPatient(updated);
      }
      setUpdatingVitals(false);
    } catch (e) {
      console.error(e);
      setUpdatingVitals(false);
    }
  };

  const handleAcceptRecommendation = async () => {
    if (!recommendation?.best_recommendation || !selectedPatient) return;
    const bedId = recommendation.best_recommendation.bed_id;
    try {
      await api.allocateBed(bedId, selectedPatient.patient_id);
      alert(`Bed ${recommendation.best_recommendation.bed_number} allocated to ${selectedPatient.patient_code}!`);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    }
  };

  const levelBadges = {
    'P1': { bg: 'bg-rose-100 text-rose-800 border-rose-200', label: 'P1 Critical' },
    'P2': { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'P2 Urgent' },
    'P3': { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'P3 Semi-urgent' },
    'P4': { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'P4 Routine' },
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Emergency Triage &amp; Bed Allocation
          </h1>
          <p className="text-xs text-slate-500">
            Real-time patient prioritization and intelligent bed matching
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
          {queueData.length} Patients in Queue
        </span>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Queue Table (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-700">Patient Queue</span>
              <span className="text-[11px] text-slate-400">Sorted by medical urgency &amp; wait time</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3 text-center">Wait</th>
                    <th className="py-2.5 px-3">Target Unit</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queueData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center text-slate-400">
                        No patients waiting in queue
                      </td>
                    </tr>
                  ) : (
                    queueData.map((pt) => {
                      const isSelected = selectedPatient?.patient_id === pt.patient_id;
                      const badge = levelBadges[pt.level] || levelBadges['P3'];
                      return (
                        <tr
                          key={pt.patient_id}
                          onClick={() => setSelectedPatient(pt)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-50/70 font-semibold text-blue-900'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                              {pt.level}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{pt.patient_code}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                              {pt.patient_name} ({pt.age}y)
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500 font-mono">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{pt.wait_minutes}m</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-xs font-medium text-slate-700">
                              {pt.disposition} Bed
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-slate-800">
                              {pt.effective_priority}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Anti-starvation protection active</span>
            <span>Click any patient to inspect clinical details</span>
          </div>
        </div>

        {/* Right: Selected Patient Detail & Bed Match (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4 flex flex-col justify-between">
          {selectedPatient ? (
            <>
              {/* Patient Header & Urgency */}
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base text-slate-900">
                        {selectedPatient.patient_code}
                      </h2>
                      <span className="text-slate-400">•</span>
                      <span className="text-sm font-medium text-slate-700">{selectedPatient.patient_name}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {selectedPatient.age} years · {selectedPatient.gender} · {selectedPatient.arrival_mode || "Emergency"}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${levelBadges[selectedPatient.level]?.bg || 'bg-slate-100 text-slate-800'}`}>
                    {selectedPatient.level}
                  </span>
                </div>

                {/* Patient Vitals */}
                {selectedPatient.vitals && (
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">SpO₂</span>
                      <span className={`font-mono font-bold ${selectedPatient.vitals.spo2 <= 91 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                        {selectedPatient.vitals.spo2}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                      <span className={`font-mono font-bold ${selectedPatient.vitals.sbp <= 90 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                        {selectedPatient.vitals.sbp}/{selectedPatient.vitals.dbp}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                      <span className="font-mono font-bold text-slate-800">{selectedPatient.vitals.hr} bpm</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Resp Rate</span>
                      <span className="font-mono font-bold text-slate-800">{selectedPatient.vitals.rr} /min</span>
                    </div>
                  </div>
                )}

                {/* Clinical Notes */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                  <span className="font-semibold text-slate-700 text-[11px] block mb-0.5">Clinical Presentation:</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    "{selectedPatient.triage_note || selectedPatient.chief_complaint}"
                  </p>
                </div>
              </div>

              {/* Clinical Risk Factors */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Contributing Clinical Risk Indicators:
                </span>
                <div className="space-y-1.5">
                  {(selectedPatient.explanation || [
                    { factor: "Severe Hypoxia (SpO2 88%)", direction: "critical" },
                    { factor: "Hypotension shock index (SBP 86 mmHg)", direction: "critical" },
                    { factor: "Chest pain reported in intake note", direction: "elevated" }
                  ]).map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <span className="font-medium text-slate-700 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${f.direction === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                        {f.factor}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bed Recommendation Match */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Bed className="w-4 h-4 text-blue-600" />
                    Recommended Bed Assignment:
                  </span>
                  {recommendation?.best_recommendation && (
                    <span className="font-bold text-emerald-700 text-xs font-mono">
                      {recommendation.best_recommendation.score}% Match
                    </span>
                  )}
                </div>

                {loadingRec ? (
                  <div className="py-3 text-center text-xs text-blue-600 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Finding best available bed...</span>
                  </div>
                ) : recommendation?.best_recommendation ? (
                  <div className="bg-white p-3 rounded-lg border border-blue-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">
                        {recommendation.best_recommendation.bed_number}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {recommendation.best_recommendation.ward_type} Unit
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {recommendation.best_recommendation.reason}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-rose-600 font-medium">
                    No immediate care level bed free. Review transfer options.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAcceptRecommendation}
                    className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Allocate Bed</span>
                  </button>

                  <button
                    onClick={() => onOpenOverrideModal({
                      id: selectedPatient.assessment_id || 1,
                      level: selectedPatient.level,
                      predicted_disposition: selectedPatient.disposition,
                      priority_score: selectedPatient.effective_priority
                    })}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition border border-slate-200"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Physician Override</span>
                  </button>
                </div>

                {/* Subtle Demo Vitals Deterioration Trigger */}
                <button
                  onClick={handleWorsenVitals}
                  disabled={updatingVitals}
                  className="w-full py-1.5 text-slate-400 hover:text-rose-600 text-[11px] flex items-center justify-center gap-1 transition"
                  title="Simulate rapid patient deterioration to test automatic re-triage"
                >
                  <TrendingDown className="w-3 h-3" />
                  <span>
                    {updatingVitals ? "Updating vitals..." : "Simulate Vitals Deterioration (SpO2 drops to 82%)"}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              Select a patient from the queue to view details and allocate resources
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
