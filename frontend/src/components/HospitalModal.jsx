import React, { useState } from 'react';
import { X, Building2, Phone, Mail, MapPin, ShieldAlert, CheckCircle, Radio } from 'lucide-react';

export default function HospitalModal({ isOpen, onClose, hospital, onUpdateHospital }) {
  const [status, setStatus] = useState(hospital?.status || 'Operational');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setSaving(true);
    try {
      const res = await fetch('/api/v1/hospital', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateHospital(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">Hospital Facility Profile</h3>
              <p className="text-xs text-slate-400">Institutional Identity & Emergency Readiness</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">{hospital?.name || "CityCare Hospital, Pune"}</span>
              <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                {hospital?.reg_no || "MH-PUN-2024-089"}
              </span>
            </div>
            <div className="text-slate-600 space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{hospital?.address || "14 Shivaji Nagar, FC Road, Pune, Maharashtra"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{hospital?.phone || "+91 20 2567 8900"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{hospital?.email || "emergency@citycarepune.org"}</span>
              </div>
            </div>
          </div>

          {/* Emergency Readiness / Surge Mode Switch */}
          <div>
            <label className="block text-slate-800 font-bold mb-2">Hospital Emergency Readiness Status</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'Operational', color: 'emerald', desc: 'Standard intake & dynamic priority' },
                { name: 'Surge', color: 'amber', desc: 'Elevated triage buffers active' },
                { name: 'Disaster', color: 'rose', desc: 'Mass casualty threshold shifts' }
              ].map(st => (
                <button
                  key={st.name}
                  type="button"
                  onClick={() => handleStatusChange(st.name)}
                  className={`p-3 rounded-xl border text-left transition ${
                    status === st.name
                      ? `border-${st.color}-500 bg-${st.color}-50 ring-2 ring-${st.color}-400/20`
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`font-bold text-sm text-${st.color}-700 flex items-center justify-between`}>
                    <span>{st.name}</span>
                    {status === st.name && <CheckCircle className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{st.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bed & Infrastructure Capacities */}
          <div className="border-t border-slate-200 pt-3">
            <h4 className="font-bold text-slate-700 mb-2 uppercase text-[10px] tracking-wider text-slate-400">
              Department Capacities
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400">ICU Beds</div>
                <div className="font-bold text-slate-800 text-sm">6</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400">HDU Beds</div>
                <div className="font-bold text-slate-800 text-sm">8</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400">General Ward</div>
                <div className="font-bold text-slate-800 text-sm">16</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400">Ventilators</div>
                <div className="font-bold text-slate-800 text-sm">4</div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
