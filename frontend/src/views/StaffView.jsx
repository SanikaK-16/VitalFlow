import React, { useState, useEffect } from 'react';
import { Stethoscope, User, ShieldCheck, HeartPulse, RefreshCw } from 'lucide-react';
import api from '../api';

export default function StaffView() {
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = () => {
    setLoading(true);
    Promise.all([api.getDoctors(), api.getNurses()]).then(([dRes, nRes]) => {
      setDoctors(dRes.data || []);
      setNurses(nRes.data || []);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Clinical Staff on Duty</h1>
          <p className="text-slate-500">Live roster for doctors, trauma specialists, and critical care nurses</p>
        </div>
        <button onClick={fetchStaff} className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-semibold">
          Refresh Staff
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Doctors */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-blue-600 font-bold uppercase text-[11px]">
            <Stethoscope className="w-4 h-4" />
            <span>Emergency &amp; Critical Care Physicians</span>
          </div>
          <div className="divide-y divide-slate-100">
            {doctors.map(d => (
              <div key={d.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{d.name}</div>
                  <div className="text-slate-500">{d.specialization}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {d.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Nurses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-purple-600 font-bold uppercase text-[11px]">
            <User className="w-4 h-4" />
            <span>Nursing &amp; Triage Specialists</span>
          </div>
          <div className="divide-y divide-slate-100">
            {nurses.map(n => (
              <div key={n.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{n.name}</div>
                  <div className="text-slate-500">Shift: {n.shift}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {n.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
