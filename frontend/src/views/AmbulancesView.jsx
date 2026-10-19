import React, { useState, useEffect } from 'react';
import { Truck, Clock, MapPin, Activity, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../api';

export default function AmbulancesView() {
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAmbulances = () => {
    setLoading(true);
    api.getAmbulances().then(res => {
      setAmbulances(res.data || []);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchAmbulances();
  }, []);

  const handleUpdateStatus = async (id, newStatus, eta) => {
    try {
      await api.updateAmbulance(id, { status: newStatus, eta_min: eta });
      fetchAmbulances();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Incoming EMS Ambulances &amp; Pre-Arrival Triage
          </h1>
          <p className="text-xs text-slate-500">
            Real-time telemetry, location tracking, and pre-hospital priority preparation
          </p>
        </div>
        <button
          onClick={fetchAmbulances}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh EMS Fleet</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {ambulances.map(a => {
          const isEnRoute = a.status === 'en_route';
          return (
            <div
              key={a.id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                isEnRoute
                  ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-400/20'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className={`w-5 h-5 ${isEnRoute ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="font-extrabold text-base text-slate-900">{a.code}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isEnRoute ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Location: <strong>{a.location}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Estimated Arrival: <strong className="font-mono text-rose-600 font-bold">{a.eta_min} mins</strong></span>
                  </div>
                </div>

                {a.patient_summary && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Pre-Hospital Patient Note:</span>
                      <span className="font-bold font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px]">
                        Expected {a.expected_level || 'P1'}
                      </span>
                    </div>
                    <p className="text-slate-600 font-mono text-[11px]">{a.patient_summary}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 text-xs">
                {isEnRoute ? (
                  <button
                    onClick={() => handleUpdateStatus(a.id, 'available', 0)}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition text-center"
                  >
                    Mark Arrived &amp; Intake
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(a.id, 'en_route', 12)}
                    className="w-full py-1.5 bg-slate-200 hover:bg-blue-100 hover:text-blue-700 text-slate-700 rounded-lg font-bold transition text-center"
                  >
                    Dispatch for Emergency
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
