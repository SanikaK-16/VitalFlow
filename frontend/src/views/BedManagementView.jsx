import React, { useState, useEffect } from 'react';
import { Bed, HeartPulse, RefreshCw, CheckCircle, ShieldAlert, User, Check, Plus } from 'lucide-react';
import api from '../api';

export default function BedManagementView({ onSelectTab }) {
  const [beds, setBeds] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchBeds = () => {
    setLoading(true);
    api.getBeds(null, filterStatus, filterType)
      .then(res => {
        setBeds(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBeds();
  }, [filterType, filterStatus]);

  const handleReleaseBed = async (bedId, bedNum) => {
    if (!confirm(`Are you sure you want to discharge and release ${bedNum}?`)) return;
    try {
      await api.releaseBed(bedId);
      fetchBeds();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Bed Management & Dynamic Optimization Matrix
          </h1>
          <p className="text-xs text-slate-500">
            Real-time status across ICU, High Dependency Units (HDU), and General Emergency Wards
          </p>
        </div>

        <button
          onClick={fetchBeds}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Matrix</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Care Level:</span>
          {['all', 'ICU', 'HDU', 'General'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-md capitalize transition font-medium ${
                filterType === t
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'all' ? 'All Units' : t}
            </button>
          ))}
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Bed Status:</span>
          {['all', 'available', 'occupied'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-md capitalize transition font-medium ${
                filterStatus === s
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s === 'all' ? 'All Statuses' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Bed Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading beds...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {beds.map(bed => {
            const isAvail = bed.status === 'available';
            return (
              <div
                key={bed.id}
                className={`rounded-2xl p-4 border transition flex flex-col justify-between ${
                  isAvail
                    ? 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
                    : 'bg-slate-50/80 border-slate-200 shadow-none'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-base text-slate-900">{bed.number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {bed.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mb-3 font-medium">
                    {bed.ward_name} ({bed.type})
                  </div>

                  {/* Capabilities Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
                    {bed.oxygen && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        O₂ Ready
                      </span>
                    )}
                    {bed.monitor && (
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                        Telemetry
                      </span>
                    )}
                    {bed.vent_compatible && (
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-100">
                        Vent-Port
                      </span>
                    )}
                  </div>

                  {/* Occupant if occupied */}
                  {bed.current_patient && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs mb-3 space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {bed.current_patient.code} • {bed.current_patient.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {bed.current_patient.age} yrs • {bed.current_patient.gender}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  {isAvail ? (
                    <button
                      onClick={() => onSelectTab('triage-queue')}
                      className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition text-center"
                    >
                      Assign Waiting Patient →
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReleaseBed(bed.id, bed.number)}
                      className="w-full py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded-lg text-xs font-bold transition text-center"
                    >
                      Discharge &amp; Release Bed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
