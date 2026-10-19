import axios from 'axios';

const API_BASE = '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set auth token if stored
const token = localStorage.getItem('vitalflow_token');
if (token) {
  client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export const setAuthToken = (newToken) => {
  if (newToken) {
    localStorage.setItem('vitalflow_token', newToken);
    client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  } else {
    localStorage.removeItem('vitalflow_token');
    delete client.defaults.headers.common['Authorization'];
  }
};

export const getStoredToken = () => localStorage.getItem('vitalflow_token');

export const api = {
  // Auth & Hospital
  login: (email, password) => client.post('/auth/login', { email, password }),
  registerHospital: (data) => client.post('/auth/register-hospital', data),
  getDemoAccounts: () => client.get('/auth/demo-accounts'),
  getMe: () => client.get('/auth/me'),
  getHospital: () => client.get('/auth/hospital'),
  updateHospital: (data) => client.put('/auth/hospital', data),

  // Dashboard
  getDashboardSummary: (range = 'today') => client.get(`/dashboard/summary?range=${range}`),

  // Patients & Vitals
  getPatients: (search = '', status = 'all') => client.get(`/patients?search=${search}&status=${status}`),
  getPatient: (id) => client.get(`/patients/${id}`),
  createPatient: (data) => client.post('/patients', data),
  updatePatientVitals: (id, vitals) => client.post(`/patients/${id}/vitals`, vitals),
  dischargePatient: (id) => client.post(`/patients/${id}/discharge`),

  // Queue & Max Heap
  getQueue: () => client.get('/queue'),
  getHeapTree: () => client.get('/queue/heap-tree'),

  // Triage & Clinician Decisions (C3)
  getTriage: (patientId) => client.get(`/triage/${patientId}`),
  recordDecision: (assessmentId, data) => client.post(`/triage/${assessmentId}/decision`, data),

  // Beds & Allocations
  getBeds: (wardId = null, status = 'all', type = 'all') => {
    let url = `/beds?status=${status}&type=${type}`;
    if (wardId) url += `&ward_id=${wardId}`;
    return client.get(url);
  },
  getBedRecommendations: (patientId) => client.get(`/beds/recommend?patient_id=${patientId}`),
  allocateBed: (bedId, patientId) => client.post(`/beds/${bedId}/allocate`, { patient_id: patientId }),
  releaseBed: (bedId) => client.post(`/beds/${bedId}/release`),

  // Resources
  getWards: () => client.get('/wards'),
  getEquipment: () => client.get('/equipment'),
  allocateEquipment: (id, patientId) => client.post(`/equipment/${id}/allocate`, { patient_id: patientId }),
  getDoctors: () => client.get('/doctors'),
  getNurses: () => client.get('/nurses'),
  getAmbulances: () => client.get('/ambulances'),
  updateAmbulance: (id, data) => client.patch(`/ambulances/${id}`, data),
  getNetworkHospitals: () => client.get('/network'),
  getReferralRecommendations: (patientId) => client.get(`/referrals/recommend?patient_id=${patientId}`),
  createReferral: (data) => client.post('/referrals', data),

  // Alerts
  getAlerts: () => client.get('/alerts'),
  ackAlert: (id) => client.post(`/alerts/${id}/ack`),
  resolveAlert: (id) => client.post(`/alerts/${id}/resolve`),

  // Audit & Reports
  getAuditTrail: () => client.get('/audit'),
  exportReportUrl: (type) => `/api/v1/reports/${type}?format=csv`,

  // Simulation Lab & AI Research (C1, C2, C3, C4)
  runSimulationExperiment: (hours = 12, runs = 5) => client.post('/simulation/experiment', { hours, runs }),
  getAiModelInfo: () => client.get('/ai/model-info'),
  getAiFairnessReport: () => client.get('/ai/fairness-report')
};

export default api;
