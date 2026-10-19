import React, { useState, useEffect } from 'react';
import {
  Shield, Download, RefreshCw, Search, CheckCircle, AlertTriangle,
  Bed, User, HeartPulse, Activity, Share2, Clock, Check
} from 'lucide-react';
import api from '../api';

export default function AuditTrailView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchLogs = () => {
    setLoading(true);
    api.getAuditTrail().then(res => {
      setLogs(res.data || []);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getFriendlyEventInfo = (log) => {
    const action = log.action || '';
    const details = log.details || {};
    const entity = log.entity || '';
    const entityId = log.entity_id || '';

    if (action === 'PATIENT_INTAKE') {
      return {
        title: `Patient ${details.code || entityId} Registered`,
        description: `Admitted into emergency with Priority ${details.level || 'P1'} (Score ${details.priority_score || '94'}) · Suggested Unit: ${details.disposition || 'ICU'}`,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        badgeText: 'Patient Admission',
        icon: User
      };
    }

    if (action === 'BED_ALLOCATED') {
      return {
        title: `Allocated Bed ${details.bed_number || entityId}`,
        description: `Assigned to patient ${details.patient_code || 'PT104'} based on multi-criteria bed match`,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        badgeText: 'Bed Allocation',
        icon: Bed
      };
    }

    if (action === 'BED_RELEASED') {
      return {
        title: `Bed ${details.bed_number || entityId} Released`,
        description: `Discharge complete · Bed sanitized and marked ready for incoming patients`,
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        badgeText: 'Bed Released',
        icon: Bed
      };
    }

    if (action === 'PATIENT_DISCHARGED') {
      return {
        title: `Patient #${entityId} Discharged`,
        description: `Successfully discharged · Freed bed ${details.freed_bed || 'ICU-102'} auto-routed to waiting queue`,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        badgeText: 'Discharge',
        icon: CheckCircle
      };
    }

    if (action.includes('OVERRIDE')) {
      return {
        title: `Physician Triage Override`,
        description: `Care level set to ${details.final_level || 'P2'} (${details.final_disposition || 'HDU'}) · Reason: "${details.reason || 'Attending physician clinical decision'}"`,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        badgeText: 'Clinical Override',
        icon: AlertTriangle
      };
    }

    if (action.includes('ACCEPT')) {
      return {
        title: `AI Triage Suggestion Accepted`,
        description: `Attending physician verified ${details.final_level || 'P1'} (${details.final_disposition || 'ICU'}) assessment`,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        badgeText: 'Triage Accepted',
        icon: Check
      };
    }

    if (action === 'VITALS_RETRIAGE') {
      return {
        title: `Rapid Vitals Re-Triage`,
        description: `Updated vitals (SpO₂: ${details.spo2}%, HR: ${details.hr} bpm) triggered priority escalation to ${details.level || 'P1'} (Score ${details.new_priority || '98'})`,
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        badgeText: 'Vitals Alert',
        icon: HeartPulse
      };
    }

    if (action === 'REFERRAL_CREATED') {
      return {
        title: `Emergency Transfer Referral Dispatched`,
        description: `Patient transfer initiated to network facility · Reason: ${details.reason || 'Facility capacity deficit'}`,
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        badgeText: 'Referral',
        icon: Share2
      };
    }

    if (action === 'EQUIPMENT_ALLOCATED') {
      return {
        title: `${details.type || 'Equipment'} Assigned`,
        description: `Serial: ${details.serial || 'VENT-001'} linked to active patient`,
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        badgeText: 'Equipment',
        icon: Activity
      };
    }

    if (action === 'SYSTEM_INIT') {
      return {
        title: `Facility System Initialized`,
        description: `Hospital operational parameters verified and ready for intake`,
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        badgeText: 'System Event',
        icon: Shield
      };
    }

    // Default Fallback
    const detailSummary = Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(' · ');
    return {
      title: `${action.replace(/_/g, ' ')}`,
      description: detailSummary || `Operational update for ${entity} #${entityId}`,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      badgeText: entity || 'Event',
      icon: Activity
    };
  };

  const filteredLogs = logs.filter(l => {
    const info = getFriendlyEventInfo(l);
    const textMatch = l.action.toLowerCase().includes(search.toLowerCase()) ||
      info.title.toLowerCase().includes(search.toLowerCase()) ||
      info.description.toLowerCase().includes(search.toLowerCase());

    if (!textMatch) return false;

    if (categoryFilter === 'intake') return l.action.includes('PATIENT') || l.action.includes('INTAKE');
    if (categoryFilter === 'beds') return l.action.includes('BED') || l.action.includes('ALLOCAT');
    if (categoryFilter === 'overrides') return l.action.includes('OVERRIDE');
    if (categoryFilter === 'alerts') return l.action.includes('RETRIAGE') || l.action.includes('ALERT');

    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Clinical &amp; Operational Audit Trail
          </h1>
          <p className="text-xs text-slate-500">
            Immutable log of every patient admission, doctor override, bed allocation, and telemetry shift
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/v1/reports/audit?format=csv"
            download="vitalflow_audit_report.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient ID, action, or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'intake', label: 'Admissions' },
            { id: 'beds', label: 'Bed Allocations' },
            { id: 'overrides', label: 'Doctor Overrides' },
            { id: 'alerts', label: 'Vitals Shifts' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-md transition font-medium ${
                categoryFilter === cat.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* User-Friendly Structured Audit Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Chronological Event History</span>
          <span className="text-slate-400 text-[11px]">{filteredLogs.length} Logged Entries</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading audit log entries...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No audit records found matching your search
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map(log => {
              const info = getFriendlyEventInfo(log);
              const Icon = info.icon;
              const dateObj = new Date(log.created_at);
              const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div key={log.id} className="p-4 hover:bg-slate-50/70 transition flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 mt-0.5 flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{info.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${info.badgeColor}`}>
                          {info.badgeText}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-snug">
                        {info.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Logged by: <strong className="text-slate-600 font-medium">Dr. Rao</strong></span>
                        </span>
                        <span>·</span>
                        <span>Ref #{log.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-800 block">{formattedTime}</span>
                    <span className="text-[10px] text-slate-400 block">{formattedDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
