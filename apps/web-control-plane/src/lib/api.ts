import axios from 'axios';
import { auth } from './auth';

/**
 * API client for Control Service via bearer-auth.
 */
const apiBase = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject bearer token into all requests if present
apiBase.interceptors.request.use((config) => {
  const token = auth.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized by clearing session
apiBase.interceptors.response.use(
  (response) => response,
  (error: any) => {
    if (error.response?.status === 401) {
      auth.clearSession();
      // Optionally redirect or notify the UI
      window.dispatchEvent(new CustomEvent('cku_auth_fail'));
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Runs
  getRuns: async () => {
    const res = await apiBase.get('/runs');
    return res.data;
  },
  getRun: async (id: string) => {
    const res = await apiBase.get(`/runs/${id}`);
    return res.data;
  },

  // Gates
  getGates: async () => {
    const res = await apiBase.get('/gates/pending');
    return res.data;
  },
  approveGate: async (runId: string, gateId: string) => {
    const res = await apiBase.post(`/runs/${runId}/gates/${gateId}/approve`);
    return res.data;
  },

  // Audit
  getAuditLog: async (params?: Record<string, any>) => {
    const res = await apiBase.get('/audit', { params });
    return res.data;
  },

  // Projects / Context
  getProjects: async () => {
    const res = await apiBase.get('/projects');
    return res.data;
  },

  // Orgs
  getOrgs: async () => {
      // Placeholder for organizational mapping if any
      return [{ id: 'org-1', name: 'Default Organization' }];
  },

  // Automation
  getAutomationStatus: async () => {
    const res = await apiBase.get('/automation/status');
    return res.data;
  },

  setAutomationMode: async (mode: 'safe' | 'balanced' | 'aggressive') => {
    const res = await apiBase.post('/automation/mode', { mode });
    return res.data;
  },

  getAutoApprovalRules: async () => {
    const res = await apiBase.get('/automation/approvals');
    return res.data;
  },

  getAlertAcknowledgmentRules: async () => {
    const res = await apiBase.get('/automation/alerts');
    return res.data;
  },

  getHealingStrategies: async () => {
    const res = await apiBase.get('/automation/healing');
    return res.data;
  },

  getRollbackStrategies: async () => {
    const res = await apiBase.get('/automation/rollback');
    return res.data;
  },
};
