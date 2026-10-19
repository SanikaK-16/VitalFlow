import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import IntakeModal from './components/IntakeModal';
import OverrideModal from './components/OverrideModal';
import HospitalModal from './components/HospitalModal';

import DashboardView from './views/DashboardView';
import TriageQueueView from './views/TriageQueueView';
import BedManagementView from './views/BedManagementView';
import SimulationLabView from './views/SimulationLabView';
import AmbulancesView from './views/AmbulancesView';
import ReferralsView from './views/ReferralsView';
import PatientsView from './views/PatientsView';
import AlertsView from './views/AlertsView';
import AuditTrailView from './views/AuditTrailView';
import StaffView from './views/StaffView';
import EquipmentView from './views/EquipmentView';
import AuthView from './views/AuthView';

import api, { setAuthToken, getStoredToken } from './api';
import { Activity } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStoredToken()));
  const [authChecking, setAuthChecking] = useState(Boolean(getStoredToken()));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [queueData, setQueueData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [user, setUser] = useState(null);

  // Modal States
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [overrideModalData, setOverrideModalData] = useState(null);
  const [hospitalModalOpen, setHospitalModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('vitalflow_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('vitalflow_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Initial Data Fetch
  const refreshAllData = useCallback(async () => {
    try {
      const [sumRes, qRes, alRes, hospRes] = await Promise.all([
        api.getDashboardSummary('today'),
        api.getQueue(),
        api.getAlerts(),
        api.getHospital()
      ]);
      setSummary(sumRes.data);
      setQueueData(qRes.data?.queue || []);
      setAlerts(alRes.data || []);
      setHospital(hospRes.data);
    } catch (err) {
      console.error("Data refresh error:", err);
    }
  }, []);

  // Check existing session on mount
  useEffect(() => {
    const existingToken = getStoredToken();
    if (existingToken) {
      api.getMe()
        .then(res => {
          setUser(res.data);
          if (res.data?.hospital) {
            setHospital(res.data.hospital);
          }
          setIsAuthenticated(true);
          refreshAllData();
        })
        .catch(() => {
          setAuthToken(null);
          setIsAuthenticated(false);
        })
        .finally(() => {
          setAuthChecking(false);
        });
    } else {
      setAuthChecking(false);
    }
  }, [refreshAllData]);

  // WebSocket live synchronization scoped to current hospital
  useEffect(() => {
    if (!isAuthenticated) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hospId = hospital?.id || 1;
    const currentToken = getStoredToken() || '';
    const wsUrl = `${protocol}//${window.location.host}/ws?hospital_id=${hospId}&token=${currentToken}`;
    let ws = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`WebSocket connected to VitalFlow event bus for Hospital #${hospId}`);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("Real-time operational event received:", msg);
          refreshAllData();
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket fallback notice:", err);
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [isAuthenticated, hospital?.id, refreshAllData]);

  // Global Keyboard Shortcuts (Ctrl+K for quick admit)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isAuthenticated) {
          setIntakeOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  const handleAuthSuccess = ({ token, user, hospital }) => {
    setUser(user);
    setHospital(hospital);
    setIsAuthenticated(true);
    refreshAllData();
  };

  const handleLogout = () => {
    setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setHospital(null);
    setSummary(null);
    setQueueData([]);
    setAlerts([]);
  };

  const handlePatientIntakeSuccess = (result) => {
    refreshAllData();
    setSelectedPatientId(result.patient.id);
    setActiveTab('triage-queue');
  };

  const handleDecisionRecorded = () => {
    refreshAllData();
  };

  // 1. Session verification loading state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs font-medium tracking-wide">Connecting to VitalFlow Hospital Operations Platform...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render dedicated Hospital Login / Sign Up portal
  if (!isAuthenticated) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  // 3. Authenticated: Render full hospital operational suite
  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
      {/* Global Header */}
      <Navbar
        hospital={hospital}
        user={user}
        activeAlerts={alerts}
        onOpenIntake={() => setIntakeOpen(true)}
        onOpenHospitalModal={() => setHospitalModalOpen(true)}
        onSelectTab={setActiveTab}
        activeTab={activeTab}
        onLogout={handleLogout}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />

      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Dynamic Views Viewport */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-slate-50/60 focus:outline-none">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              onSelectPatient={setSelectedPatientId}
              onSelectTab={setActiveTab}
              onOpenIntake={() => setIntakeOpen(true)}
            />
          )}

          {activeTab === 'triage-queue' && (
            <TriageQueueView
              queueData={queueData}
              selectedPatientId={selectedPatientId}
              onSelectPatient={setSelectedPatientId}
              onOpenOverrideModal={setOverrideModalData}
              onAllocateBedDirect={refreshAllData}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              onSelectPatient={setSelectedPatientId}
              onSelectTab={setActiveTab}
              onOpenIntake={() => setIntakeOpen(true)}
            />
          )}

          {activeTab === 'beds' && (
            <BedManagementView
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'simulation' && (
            <SimulationLabView />
          )}

          {activeTab === 'ambulances' && (
            <AmbulancesView />
          )}

          {activeTab === 'referrals' && (
            <ReferralsView
              queueData={queueData}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView />
          )}

          {activeTab === 'audit' && (
            <AuditTrailView />
          )}

          {activeTab === 'staff' && (
            <StaffView />
          )}

          {activeTab === 'equipment' && (
            <EquipmentView />
          )}
        </main>
      </div>

      {/* Modals */}
      <IntakeModal
        isOpen={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onSubmitSuccess={handlePatientIntakeSuccess}
      />

      <OverrideModal
        isOpen={Boolean(overrideModalData)}
        onClose={() => setOverrideModalData(null)}
        assessment={overrideModalData}
        onDecisionRecorded={handleDecisionRecorded}
      />

      <HospitalModal
        isOpen={hospitalModalOpen}
        onClose={() => setHospitalModalOpen(false)}
        hospital={hospital}
        onUpdateHospital={setHospital}
      />
    </div>
  );
}
