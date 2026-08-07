import axios from 'axios';
import type {
  AnalyzeBomRequest,
  AnalyzeBomResponse,
  ExplainRequest,
  ExplainResponse,
  DashboardStats,
  MaterialSummary,
  DecisionSummary,
  IngestResponse,
} from '@/types';
import { broadcastAuthError } from '@/contexts/UserContext';

const TOKEN_KEY = 'bom_access_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

// Attach bearer token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — broadcast auth error to force logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      broadcastAuthError();
    }
    return Promise.reject(error);
  },
);

// ─── Data ─────────────────────────────────────────────────────────────────────

export async function fetchStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/api/data/stats');
  return data;
}

export async function fetchMaterials(plant?: string): Promise<MaterialSummary[]> {
  const params = plant ? { plant } : {};
  const { data } = await api.get<MaterialSummary[]>('/api/data/materials', { params });
  return data;
}

export async function ingestLocalData(): Promise<{ results: Array<Record<string, unknown>> }> {
  const { data } = await api.post('/api/data/ingest-local');
  return data;
}

export async function generateDemoData(): Promise<{ results: Array<Record<string, unknown>> }> {
  const { data } = await api.post('/api/data/generate-demo');
  return data;
}

export async function uploadFile(
  dataType: string,
  file: File,
): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<IngestResponse>(
    `/api/data/upload/${dataType}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

// ─── Decision ─────────────────────────────────────────────────────────────────

export async function analyzeBom(request: AnalyzeBomRequest): Promise<AnalyzeBomResponse> {
  const { data } = await api.post<AnalyzeBomResponse>('/api/analyze-bom', request);
  return data;
}

export async function fetchDecisions(
  limit = 20,
  offset = 0,
): Promise<{ total: number; items: DecisionSummary[] }> {
  const { data } = await api.get('/api/decisions', { params: { limit, offset } });
  return data;
}

export async function fetchDecision(decisionId: string) {
  const { data } = await api.get(`/api/decisions/${decisionId}`);
  return data;
}

// ─── Explain ──────────────────────────────────────────────────────────────────

export async function explainDecision(request: ExplainRequest): Promise<ExplainResponse> {
  const { data } = await api.post<ExplainResponse>('/api/explain', request);
  return data;
}
