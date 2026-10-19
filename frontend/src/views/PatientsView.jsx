import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, Activity, ArrowRight, Clock, PlusCircle } from 'lucide-react';
import api from '../api';

export default function PatientsView({ onSelectPatient, onSelectTab, onOpenIntake }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchPatients = () => {
    setLoading(true);
    api.getPatients(search, status).then(res => {
      setPatients(res.data || []);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchPatients();
  }, [search, status]);

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Patient Intake &amp; Clinical Directory
          </h1>
          <p className="text-xs text-slate-500">
            Comprehensive registry of active, admitted, and discharged emergency patients
          </p>
        </div>

        <button
          onClick={onOpenIntake}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, patient name, or complaint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'waiting', 'admitted', 'discharged'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-md capitalize transition font-medium ${
                status === s ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Patient Code</th>
                <th className="py-3 px-4">Demographics</th>
                <th className="py-3 px-4">Chief Complaint &amp; Note</th>
                <th className="py-3 px-4">Vitals &amp; NEWS2</th>
                <th className="py-3 px-4">Triage Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <span className="font-extrabold font-mono text-sm text-slate-900">{p.code}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.age}y • {p.gender} • {p.blood_group}</div>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-800 truncate">{p.chief_complaint}</div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">{p.triage_note}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {p.latest_vitals ? (
                      <span className="text-slate-700">
                        SpO₂: <strong>{p.latest_vitals.spo2}%</strong> • HR: {p.latest_vitals.hr} • BP: {p.latest_vitals.sbp}/{p.latest_vitals.dbp}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {p.latest_triage ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          p.latest_triage.level === 'P1' ? 'bg-rose-100 text-rose-700' :
                          p.latest_triage.level === 'P2' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {p.latest_triage.level}
                        </span>
                        <span className="font-bold font-mono text-blue-700 text-xs">
                          {p.latest_triage.priority_score}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'waiting' ? 'bg-amber-100 text-amber-800' :
                      p.status === 'admitted' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => { onSelectPatient(p.id); onSelectTab('triage-queue'); }}
                      className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded font-semibold text-xs transition"
                    >
                      View in Queue →
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
