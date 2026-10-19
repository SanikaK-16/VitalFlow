import React, { useState, useEffect } from 'react';
import { Share2, Building2, MapPin, HeartPulse, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../api';

export default function ReferralsView({ queueData = [] }) {
  const [networkHospitals, setNetworkHospitals] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(queueData[0]?.patient_id || 1);
  const [rankedReferrals, setRankedReferrals] = useState([]);
  const [referralReason, setReferralReason] = useState('Critical ICU bed deficit in host facility');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedPatientId) {
      api.getReferralRecommendations(selectedPatientId)
        .then(res => setRankedReferrals(res.data || []))
        .catch(console.error);
    }
  }, [selectedPatientId]);

  const handleCreateReferral = async (hospitalId, hospitalName) => {
    if (!confirm(`Confirm emergency transfer referral to ${hospitalName}?`)) return;
    setSubmitting(true);
    try {
      await api.createReferral({
        patient_id: selectedPatientId,
        to_hospital_id: hospitalId,
        reason: referralReason
      });
      alert(`Transfer referral dispatched to ${hospitalName}! Coordinated ambulance alert triggered.`);
      setSubmitting(false);
    } catch (e) {
      alert(e.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Network Hospital Referral &amp; Transfer Ranking
        </h1>
        <p className="text-xs text-slate-500">
          Algorithmic multi-facility load balancing: score = CareMatch + FreeBeds − DistancePenalty − ETAPenalty
        </p>
      </div>

      {/* Target Patient Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700">Patient Requiring Transfer:</span>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-900 focus:outline-none"
          >
            {queueData.map(p => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.patient_code} - {p.patient_name} ({p.level} • Score: {p.effective_priority})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-500">Reason:</span>
          <input
            type="text"
            value={referralReason}
            onChange={(e) => setReferralReason(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 text-xs w-64"
          />
        </div>
      </div>

      {/* Ranked Destinations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Algorithmic Destination Ranking
          </h3>
          <span className="text-xs text-slate-400 font-mono">Updated dynamically based on live city network telemetry</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Network Facility</th>
                <th className="py-3 px-4">Transit Distance</th>
                <th className="py-3 px-4">Estimated ETA</th>
                <th className="py-3 px-4">ICU &amp; Vent Free</th>
                <th className="py-3 px-4">Algorithmic Match</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rankedReferrals.map((dest, idx) => (
                <tr key={dest.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                    #{idx + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>{dest.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    {dest.distance_km} km
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                    ~{dest.estimated_eta_mins} mins
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {dest.icu_free} ICU • {dest.vent_free} Vent
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold font-mono text-emerald-600">
                        {dest.match_score}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        ({dest.recommendation})
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleCreateReferral(dest.id, dest.name)}
                      disabled={submitting}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                    >
                      Dispatch Referral
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
