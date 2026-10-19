import React, { useState, useEffect } from 'react';
import { HeartPulse, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';
import api from '../api';

export default function EquipmentView() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipment = () => {
    setLoading(true);
    api.getEquipment().then(res => {
      setEquipment(res.data || []);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Critical Medical Equipment &amp; Ventilator Inventory</h1>
          <p className="text-slate-500">Telemetry tracking for mechanical ventilators, defibrillators, and infusion pumps</p>
        </div>
        <button onClick={fetchEquipment} className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-semibold">
          Refresh Equipment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {equipment.map(eq => {
          const isAvail = eq.status === 'available';
          return (
            <div key={eq.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900">{eq.type}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {eq.status.replace('_', ' ')}
                </span>
              </div>
              <div className="font-mono text-slate-500 text-[11px]">Serial: {eq.serial}</div>
              {eq.assigned_patient_code && (
                <div className="p-2 bg-blue-50 text-blue-900 rounded-lg font-medium text-[11px]">
                  Assigned to Patient: <strong>{eq.assigned_patient_code}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
