import React, { useState } from 'react';
import { X, Heart, Wind, Thermometer, Activity, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../api';

export default function IntakeModal({ isOpen, onClose, onSubmitSuccess }) {
  const [formData, setFormData] = useState({
    code: '',
    name: 'Rajesh Kumar',
    age: 58,
    gender: 'Male',
    blood_group: 'O+',
    chief_complaint: 'Severe chest pain, breathless',
    triage_note: 'Acute retrosternal chest pain radiating to left arm, diaphoretic, breathless on minimal exertion.',
    arrival_mode: 'Walk-in',
    vitals: {
      hr: 122,
      sbp: 86,
      dbp: 54,
      spo2: 88.0,
      temp: 37.4,
      rr: 26,
      consciousness: 'Alert'
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleVitalsChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: val
      }
    }));
  };

  const setDemoPreset = (type) => {
    if (type === 'PT104') {
      setFormData({
        code: 'PT104',
        name: 'Rajesh Kumar',
        age: 58,
        gender: 'Male',
        blood_group: 'O+',
        chief_complaint: 'Severe chest pain, breathless',
        triage_note: 'Acute retrosternal crushing pain, breathless, diaphoretic, cyanotic lips',
        arrival_mode: 'Walk-in',
        vitals: {
          hr: 122,
          sbp: 86,
          dbp: 54,
          spo2: 88.0,
          temp: 37.4,
          rr: 26,
          consciousness: 'Alert'
        }
      });
    } else if (type === 'P2') {
      setFormData({
        code: 'PT105',
        name: 'Suresh Patil',
        age: 44,
        gender: 'Male',
        blood_group: 'A+',
        chief_complaint: 'High fever and severe abdominal cramps',
        triage_note: 'Right iliac fossa guarding, febrile, vomiting x3 today',
        arrival_mode: 'Walk-in',
        vitals: {
          hr: 104,
          sbp: 112,
          dbp: 74,
          spo2: 95.0,
          temp: 38.6,
          rr: 21,
          consciousness: 'Alert'
        }
      });
    } else {
      setFormData({
        code: 'PT106',
        name: 'Pooja Nair',
        age: 26,
        gender: 'Female',
        blood_group: 'B+',
        chief_complaint: 'Superficial kitchen burn on forearm',
        triage_note: 'Erythematous 2nd degree burn, vitals stable, alert',
        arrival_mode: 'Walk-in',
        vitals: {
          hr: 76,
          sbp: 118,
          dbp: 76,
          spo2: 99.0,
          temp: 36.8,
          rr: 16,
          consciousness: 'Alert'
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        code: formData.code?.trim() || undefined,
        age: parseInt(formData.age),
        vitals: {
          ...formData.vitals,
          hr: parseInt(formData.vitals.hr),
          sbp: parseInt(formData.vitals.sbp),
          dbp: parseInt(formData.vitals.dbp),
          spo2: parseFloat(formData.vitals.spo2),
          temp: parseFloat(formData.vitals.temp),
          rr: parseInt(formData.vitals.rr)
        }
      };

      const res = await api.createPatient(payload);
      setLoading(false);
      onSubmitSuccess(res.data);
      onClose();
    } catch (err) {
      setLoading(false);
      const errMsg = err.response?.data?.detail || err.message || "Failed to intake patient";
      setError(errMsg);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Patient Emergency Admission</h3>
              <p className="text-xs text-slate-400">Clinical Triage &amp; Bed Priority Assessment</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Clinical Presets */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">Quick Test Cases:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDemoPreset('PT104')}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium px-2.5 py-1 rounded border border-rose-200 transition"
            >
              PT104 (Chest Pain / P1)
            </button>
            <button
              type="button"
              onClick={() => setDemoPreset('P2')}
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium px-2.5 py-1 rounded border border-amber-200 transition"
            >
              P2 Urgent (Abdominal)
            </button>
            <button
              type="button"
              onClick={() => setDemoPreset('P4')}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium px-2.5 py-1 rounded border border-emerald-200 transition"
            >
              P4 Routine (Minor)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Demographics */}
          <div>
            <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-500">
              1. Patient Demographics & Identification
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Patient ID <span className="text-[10px] text-slate-400 font-normal">(Auto if blank)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PT107"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-600 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Age</label>
                <input
                  type="number"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Arrival Mode</label>
                <select
                  value={formData.arrival_mode}
                  onChange={(e) => setFormData({ ...formData, arrival_mode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white"
                >
                  <option value="Walk-in">Walk-in</option>
                  <option value="Ambulance">Ambulance (108)</option>
                  <option value="Referral">Network Referral</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Blood Group</label>
                <input
                  type="text"
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Vitals Grid (NEWS2 Parameters) */}
          <div>
            <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-500">
              2. Clinical Vitals (NEWS2 Parameters)
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  required
                  value={formData.vitals.hr}
                  onChange={(e) => handleVitalsChange('hr', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Systolic BP (mmHg)</label>
                <input
                  type="number"
                  required
                  value={formData.vitals.sbp}
                  onChange={(e) => handleVitalsChange('sbp', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Diastolic BP (mmHg)</label>
                <input
                  type="number"
                  required
                  value={formData.vitals.dbp}
                  onChange={(e) => handleVitalsChange('dbp', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-rose-600 font-bold mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.vitals.spo2}
                  onChange={(e) => handleVitalsChange('spo2', e.target.value)}
                  className="w-full bg-rose-50 border border-rose-300 text-rose-900 rounded px-2 py-1.5 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Resp Rate (/min)</label>
                <input
                  type="number"
                  required
                  value={formData.vitals.rr}
                  onChange={(e) => handleVitalsChange('rr', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.vitals.temp}
                  onChange={(e) => handleVitalsChange('temp', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono font-bold text-slate-900"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-600 font-medium mb-1">Consciousness (AVPU)</label>
                <select
                  value={formData.vitals.consciousness}
                  onChange={(e) => handleVitalsChange('consciousness', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-900 font-semibold"
                >
                  <option value="Alert">Alert (A - fully oriented)</option>
                  <option value="Voice">Voice (V - responds to verbal)</option>
                  <option value="Pain">Pain (P - responds to pain)</option>
                  <option value="Unresponsive">Unresponsive (U - coma)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clinical Presentation & Notes */}
          <div>
            <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-500">
              3. Clinical Notes &amp; Assessment
            </h4>
            <div className="space-y-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Chief Complaint</label>
                <input
                  type="text"
                  required
                  value={formData.chief_complaint}
                  onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
                  placeholder="e.g. Severe chest pain, breathless"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Clinical Intake Note</label>
                <textarea
                  rows={2}
                  value={formData.triage_note}
                  onChange={(e) => setFormData({ ...formData, triage_note: e.target.value })}
                  placeholder="Paramedic or intake nurse clinical notes..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:bg-white text-[11px]"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm flex items-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Evaluating Urgency...</span>
                </>
              ) : (
                <span>Admit Patient &amp; Calculate Priority</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
