import axios from 'axios';
import { toast } from 'react-hot-toast';
import type {
  AnalyzeBomRequest,
  AnalyzeBomResponse,
  ExplainRequest,
  ExplainResponse,
  DashboardStats,
  MaterialSummary,
  DecisionSummary,
  IngestResponse,
  AdoptResponse,
  BomCompareResponse,
  OrderOption,
  ProductionAnalyzeRequest,
  ProductionAnalyzeResponse,
  ProductionLineOption,
  ChatMessage,
  ChatResponse,
  AgentToolsResponse,
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

// Surface meaningful server messages; broadcast 401 to force logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const message = 'Unable to reach the server. Please check your network connection.';
      toast.error(message);
      return Promise.reject(new Error(message));
    }
    const status = error.response.status;
    const data = error.response.data;
    const detail = data?.detail;
    const errors = data?.errors;
    let message = 'Something went wrong. Please try again.';
    if (Array.isArray(errors) && errors.length > 0) {
      message = errors.join('; ');
    } else if (typeof detail === 'string') {
      message = detail;
    }
    if (status === 401) {
      broadcastAuthError();
    } else {
      toast.error(message);
    }
    return Promise.reject(new Error(message));
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

export async function decisionAction(
  decisionId: string,
  payload: {
    action: 'approve' | 'reject' | 'override';
    reason?: string | null;
    actor?: string | null;
    override_candidate_id?: string | null;
  },
) {
  const { data } = await api.post(`/api/decisions/${decisionId}/action`, payload);
  return data;
}

// ─── Explain ──────────────────────────────────────────────────────────────────

export async function explainDecision(request: ExplainRequest): Promise<ExplainResponse> {
  const { data } = await api.post<ExplainResponse>('/api/explain', request);
  return data;
}

// ─── Production Persona (Phase 1) ─────────────────────────────────────────────

export async function generateMasterData(): Promise<{
  status: string;
  created: Record<string, number>;
}> {
  const { data } = await api.post('/api/data/generate-master-data');
  return data;
}

export async function analyzeProduction(
  request: ProductionAnalyzeRequest,
): Promise<ProductionAnalyzeResponse> {
  const { data } = await api.post<ProductionAnalyzeResponse>(
    '/api/production/analyze',
    request,
  );
  return data;
}

export async function fetchProductionLines(plant: string): Promise<ProductionLineOption[]> {
  const { data } = await api.get<ProductionLineOption[]>('/api/production/lines', {
    params: { plant },
  });
  return data;
}

export async function fetchPlannedOrders(
  plant: string,
  material?: string,
): Promise<OrderOption[]> {
  const { data } = await api.get<OrderOption[]>('/api/production/planned-orders', {
    params: { plant, ...(material ? { material } : {}) },
  });
  return data;
}

export async function fetchProcessOrders(
  plant: string,
  material?: string,
): Promise<OrderOption[]> {
  const { data } = await api.get<OrderOption[]>('/api/production/process-orders', {
    params: { plant, ...(material ? { material } : {}) },
  });
  return data;
}

export async function compareBom(
  decisionId: string,
  candidateId: string,
): Promise<BomCompareResponse> {
  const { data } = await api.post<BomCompareResponse>('/api/production/compare', {
    decision_id: decisionId,
    candidate_id: candidateId,
  });
  return data;
}

export async function adoptCandidate(payload: {
  decision_id: string;
  candidate_id: string;
  target_order?: string | null;
  reason?: string | null;
}): Promise<AdoptResponse> {
  const { data } = await api.post<AdoptResponse>('/api/production/adopt', payload);
  return data;
}

// ─── Agent Chat ─────────────────────────────────────────────────────────────

export async function sendAgentChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/api/agent/chat', { messages });
  return data;
}

export async function fetchAgentTools(): Promise<AgentToolsResponse> {
  const { data } = await api.get<AgentToolsResponse>('/api/agent/tools');
  return data;
}
