import React, { useState } from 'react';
import {
  Activity, Search, Plus, Bell, ChevronDown,
  Building2, ShieldAlert, LogOut, AlertTriangle, PanelLeft
} from 'lucide-react';

export default function Navbar({
  hospital,
  user,
  activeAlerts = [],
  onOpenIntake,
  onOpenHospitalModal,
  onSelectTab,
  activeTab,
  onLogout,
  sidebarCollapsed = false,
  onToggleSidebar
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const unreadAlerts = activeAlerts.filter(a => a.status === 'active');

  const tabLabels = {
    'dashboard': 'Dashboard',
    'triage-queue': 'Triage Queue',
    'patients': 'Patients',
    'beds': 'Bed Management',
    'ambulances': 'Ambulances',
    'referrals': 'Referrals',
    'staff': 'Staff',
    'equipment': 'Equipment',
    'alerts': 'Alerts',
    'audit': 'Audit Trail',
    'simulation': 'Operations Simulator'
  };

  return (
    <header className="bg-white border-b border-slate-200 flex-shrink-0 z-30 px-4 lg:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Clean Brand, Toggle & Hospital Status */}
        <div className="flex items-center gap-2.5">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition flex items-center justify-center"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-xs font-bold text-sm tracking-tight">
            <Activity className="w-4 h-4 text-blue-100" />
            <span>VitalFlow</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-200"></div>

          <button
            onClick={onOpenHospitalModal}
            className="flex items-center gap-2 text-left hover:bg-slate-50 px-2 py-1 rounded-md transition"
            title="View Hospital Details"
          >
            <span className="font-semibold text-slate-800 text-sm">
              {hospital?.name || "CityCare Hospital, Pune"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {hospital?.status || "Operational"}
            </span>
          </button>
        </div>

        {/* Center: Clean Search Bar */}
        <div className="hidden md:flex items-center relative flex-1 max-w-sm mx-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search patient, complaint, or bed... (Ctrl+K)"
            className="w-full bg-slate-50 text-xs pl-9 pr-12 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none transition placeholder:text-slate-400"
          />
          <kbd className="absolute right-2.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
            Ctrl+K
          </kbd>
        </div>

        {/* Right: Admit Patient Action, Alerts, User Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenIntake}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Admit Patient</span>
          </button>

          {/* Alerts Bell */}
          <div className="relative">
            <button
              onClick={() => setAlertsOpen(!alertsOpen)}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition"
              title="Notifications & Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {unreadAlerts.length}
                </span>
              )}
            </button>

            {alertsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">Hospital Alerts</span>
                  <span className="text-[11px] bg-rose-50 text-rose-700 font-medium px-2 py-0.5 rounded">
                    {unreadAlerts.length} Active
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto mt-1">
                  {unreadAlerts.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">All alerts resolved</div>
                  ) : (
                    unreadAlerts.map(a => (
                      <div key={a.id} className="py-2.5 text-xs">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${a.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'}`} />
                          <div>
                            <p className="font-medium text-slate-800 leading-snug">{a.message}</p>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={() => { setAlertsOpen(false); onSelectTab('alerts'); }}
                  className="w-full mt-2 pt-2 text-center text-xs text-blue-600 font-medium border-t border-slate-100 hover:underline"
                >
                  View All Alerts
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-200"></div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded-lg transition text-left"
            >
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                DR
              </div>
              <div className="hidden sm:block text-xs">
                <div className="font-semibold text-slate-800 leading-tight">{user?.name || "Dr. Rao"}</div>
                <span className="text-[10px] text-slate-400">{user?.role || "Emergency Medicine"}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-xs z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-semibold text-slate-800">{user?.name || "Dr. Rao"}</p>
                  <p className="text-slate-400 text-[11px] truncate">{user?.email || "dr.rao@vitalflow.health"}</p>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); onOpenHospitalModal(); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Hospital Settings
                </button>
                <button
                  onClick={() => { setProfileOpen(false); onSelectTab('audit'); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  Audit Logs
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => { setProfileOpen(false); if (onLogout) onLogout(); }}
                  className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
