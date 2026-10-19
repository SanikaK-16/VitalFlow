import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, ShieldAlert, RefreshCw } from 'lucide-react';
import api from '../api';

export default function AlertsView() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    setLoading(true);
    api.getAlerts().then(res => {
      setAlerts(res.data || []);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAck = async (id) => {
    await api.ackAlert(id);
    fetchAlerts();
  };

  const handleResolve = async (id) => {
    await api.resolveAlert(id);
    fetchAlerts();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Operational Clinical Alerts Console
          </h1>
          <p className="text-xs text-slate-500">
            Automated threshold monitors: ICU capacity &gt; 90%, P1 prolonged wait, ventilator deficits, surge spikes
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No active alerts in this facility
          </div>
        ) : (
          alerts.map(a => {
            const isCritical = a.severity === 'critical';
            const isActive = a.status === 'active';
            return (
              <div
                key={a.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                  isActive
                    ? (isCritical ? 'bg-rose-50/70 border-rose-300' : 'bg-amber-50/70 border-amber-300')
                    : 'bg-white border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${isCritical ? 'text-rose-600' : 'text-amber-600'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{a.message}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                      <span>Type: <strong className="font-mono text-slate-700">{a.type}</strong></span>
                      <span>•</span>
                      <span>Status: <strong className="uppercase">{a.status}</strong></span>
                      <span>•</span>
                      <span>Logged: {new Date(a.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isActive && (
                    <>
                      <button
                        onClick={() => handleAck(a.id)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleResolve(a.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                      >
                        Resolve
                      </button>
                    </>
                  )}
                  {!isActive && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
