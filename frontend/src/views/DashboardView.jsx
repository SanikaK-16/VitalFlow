import React, { useState } from 'react';
import {
  Users, AlertCircle, Bed, ShieldAlert,
  ChevronRight, Clock, Plus, Activity, Truck
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function DashboardView({
  summary,
  onSelectPatient,
  onSelectTab,
  onOpenIntake
}) {
  const [timeRange, setTimeRange] = useState('today');

  if (!summary) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center">
        <Activity className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span>Loading command center...</span>
      </div>
    );
  }

  const {
    kpis = {},
    surge = {},
    priority_queue_top5 = [],
    bed_occupancy = [],
    arrivals_by_hour = [],
    incoming_ambulances = [],
    active_alerts = []
  } = summary;

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      {/* Page Title & Action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Emergency Command Center
          </h1>
          <p className="text-xs text-slate-500">
            Real-time hospital operations, queue priority, and capacity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-0.5 rounded-lg flex text-xs">
            {['today', '7d'].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-md capitalize transition font-medium ${
                  timeRange === r
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r === 'today' ? 'Today' : 'Past 7 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Primary High-Level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Emergencies */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Active Emergencies</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {kpis.active_emerg ?? 3}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {kpis.patients_today ?? 3} admitted today
          </span>
        </div>

        {/* Critical P1 Patients */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Critical (P1) Priority</span>
            <AlertCircle className={`w-4 h-4 ${kpis.p1_waiting > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold ${kpis.p1_waiting > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {kpis.p1_waiting ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {kpis.p1_waiting > 0 ? "Requires immediate resuscitation bed" : "Zero critical patients waiting"}
          </span>
        </div>

        {/* Available Beds */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Available Beds</span>
            <Bed className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {kpis.beds_free ?? 7}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {kpis.icu_free ?? 2} ICU beds · {kpis.vent_free ?? 1} ventilators free
          </span>
        </div>

        {/* Hospital Surge Status */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Surge Capacity</span>
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {surge.surge_level || "Normal"}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Load Index: {surge.surge_index || 30}% (Normal operations)
          </span>
        </div>
      </div>

      {/* Main Row: Triage Waiting Queue (Left) & Bed Occupancy (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Triage Priority Queue (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-sm text-slate-900">
                  Current Waiting Queue
                </h2>
                <p className="text-[11px] text-slate-500">
                  Prioritized continuously by clinical acuity and wait time
                </p>
              </div>

              <button
                onClick={() => onSelectTab('triage-queue')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <span>View Full Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {priority_queue_top5.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No patients waiting in queue
                </div>
              ) : (
                priority_queue_top5.map((item) => (
                  <div
                    key={item.patient_id}
                    onClick={() => { onSelectPatient(item.patient_id); onSelectTab('triage-queue'); }}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.level === 'P1' ? 'bg-rose-100 text-rose-700' :
                        item.level === 'P2' ? 'bg-amber-100 text-amber-700' :
                        item.level === 'P3' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.level}
                      </span>
                      <div>
                        <div className="font-semibold text-xs text-slate-800">
                          {item.patient_code} • {item.patient_name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>Target: <strong className="text-slate-600 font-medium">{item.disposition}</strong></span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {item.wait_minutes}m wait
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          Score {item.effective_priority}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Average waiting time: <strong className="text-slate-700 font-mono">{kpis.avg_wait_min ?? 4.2}m</strong></span>
            <button
              onClick={() => onSelectTab('triage-queue')}
              className="text-blue-600 hover:underline font-medium"
            >
              Open Triage Console →
            </button>
          </div>
        </div>

        {/* Right: Department Bed Capacity (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-sm text-slate-900">
                  Bed Availability by Department
                </h2>
                <p className="text-[11px] text-slate-500">
                  Live occupancy across hospital units
                </p>
              </div>

              <button
                onClick={() => onSelectTab('beds')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Manage Beds
              </button>
            </div>

            <div className="space-y-4 pt-1">
              {bed_occupancy.map((b) => (
                <div key={b.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{b.name} Unit</span>
                    <span className="text-slate-500 font-medium font-mono">
                      {b.occupied} / {b.total} beds ({b.occupancy}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        b.occupancy >= 80 ? 'bg-rose-500' :
                        b.occupancy >= 60 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${b.occupancy}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 bg-slate-50 p-3 rounded-lg text-xs text-slate-600 flex items-center justify-between">
            <span>ICU Availability:</span>
            <span className="font-semibold text-emerald-700">
              {kpis.icu_free ?? 2} beds free (Ready for admission)
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Admissions Trend (Left) & Active Alerts / Ambulances (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admissions & Hourly Flow */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs text-slate-800">
              Today's Patient Arrival Trend
            </h3>
            <span className="text-[11px] text-slate-400">Compared to weekly baseline</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={arrivals_by_hour}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, borderColor: '#e2e8f0' }} />
                <Line type="monotone" dataKey="today" stroke="#2563eb" strokeWidth={2} dot={{ r: 2.5 }} name="Today" />
                <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1.5} name="Average" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Operational Alerts & Ambulances */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-xs text-slate-800">
                Hospital Alerts &amp; Incoming EMS
              </h3>
              <button
                onClick={() => onSelectTab('alerts')}
                className="text-xs text-blue-600 hover:underline"
              >
                All Alerts
              </button>
            </div>

            <div className="space-y-2.5">
              {incoming_ambulances.length > 0 && incoming_ambulances.map(a => (
                <div
                  key={a.code}
                  onClick={() => onSelectTab('ambulances')}
                  className="p-2.5 bg-blue-50/50 hover:bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between text-xs cursor-pointer transition"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-semibold text-slate-800">{a.code}</span>
                      <span className="text-slate-400 text-[11px] block">{a.patient_summary || "Emergency patient"}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    ETA {a.eta_min}m
                  </span>
                </div>
              ))}

              {active_alerts.slice(0, 2).map(al => (
                <div
                  key={al.id}
                  onClick={() => onSelectTab('alerts')}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between text-xs cursor-pointer transition"
                >
                  <div>
                    <span className="font-medium text-slate-800">{al.message}</span>
                    <span className="text-[10px] text-slate-400 block">{new Date(al.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    al.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {al.severity}
                  </span>
                </div>
              ))}

              {incoming_ambulances.length === 0 && active_alerts.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  Operations normal. No active alerts.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Staff active: 2 Doctors · 4 Nurses</span>
            <span>FC Road Pune EMS Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}
