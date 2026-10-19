import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function OverrideModal({ isOpen, onClose, assessment, onDecisionRecorded }) {
  const [action, setAction] = useState('override'); // 'accept' or 'override'
  const [finalLevel, setFinalLevel] = useState(assessment?.level || 'P2');
  const [finalDisposition, setFinalDisposition] = useState(assessment?.predicted_disposition || 'HDU');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !assessment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        action,
        final_level: action === 'override' ? finalLevel : assessment.level,
        final_disposition: action === 'override' ? finalDisposition : assessment.predicted_disposition,
        reason: action === 'override' ? reason : 'Clinician verified and accepted AI triage suggestion'
      };

      const res = await fetch(`/api/v1/triage/${assessment.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to record clinician decision");
      const data = await res.json();
      setLoading(false);
      onDecisionRecorded(data);
      onClose();
    } catch (err) {
      setLoading(false);
      alert(err.message);
    }
  };

  const presetReasons = [
    "Clinical suspicion of silent aspiration / pulmonary edema",
    "Pre-existing end-stage chronic cardiac disease not captured in vitals",
    "Borderline vitals responding well to rapid fluid bolus",
    "Surge capacity constraint: patient stable enough for step-down HDU"
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Human-in-the-Loop Clinical Decision (C3)</h3>
              <p className="text-xs text-slate-400">Audit-backed Accept or Override</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* AI Assessment Summary */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900">AI Suggested Assessment:</span>
              <span className="font-mono text-xs font-bold text-blue-700">Score: {assessment.priority_score}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded font-bold bg-rose-600 text-white">{assessment.level}</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800">{assessment.predicted_disposition} Bed</span>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAction('accept')}
              className={`py-2 px-3 rounded-lg font-bold border flex items-center justify-center gap-2 transition ${
                action === 'accept'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Accept AI Suggestion
            </button>
            <button
              type="button"
              onClick={() => setAction('override')}
              className={`py-2 px-3 rounded-lg font-bold border flex items-center justify-center gap-2 transition ${
                action === 'override'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Clinical Override
            </button>
          </div>

          {action === 'override' && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Overridden Level</label>
                  <select
                    value={finalLevel}
                    onChange={(e) => setFinalLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                  >
                    <option value="P1">P1 (Resuscitation / Immediate)</option>
                    <option value="P2">P2 (Very Urgent - HDU)</option>
                    <option value="P3">P3 (Urgent - Ward)</option>
                    <option value="P4">P4 (Less Urgent / Outpatient)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Overridden Disposition</label>
                  <select
                    value={finalDisposition}
                    onChange={(e) => setFinalDisposition(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold"
                  >
                    <option value="ICU">ICU</option>
                    <option value="HDU">HDU</option>
                    <option value="Ward">General Ward</option>
                    <option value="Discharge">Discharge / OPD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Clinical Override Justification (Logged)</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter specific physician clinical rationale for audit trail..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-sans"
                ></textarea>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {presetReasons.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReason(p)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded border border-slate-200 text-left"
                    >
                      {p.slice(0, 36)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white font-bold rounded-lg shadow transition ${
                action === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {loading ? "Recording..." : `Confirm ${action === 'accept' ? 'Acceptance' : 'Override'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
