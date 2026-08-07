// ─── API Types ────────────────────────────────────────────────────────────────

export interface ComponentScore {
  material: string;
  quantity: number;
  unit: string;
  scrap_percent: number;
}

export interface Candidate {
  id: string;
  source_order: string | null;
  source_orders: string[];
  occurrence_count: number;
  source_type: string;
  components: ComponentScore[];
  feasible: boolean;
  violations: string[];
  scores: Record<string, number>;
  total_score: number;
  rank: number;
}

export interface AnalyzeBomRequest {
  material: string;
  plant: string;
  quantity: number;
  due_date?: string;
  constraints: {
    must_use_registered_components: boolean;
    avoid_components: string[];
    max_components?: number;
    min_quantity_per_component?: number;
  };
  scoring_profile: {
    cost_weight: number;
    lead_time_weight: number;
    risk_weight: number;
    historical_success_weight: number;
  };
}

export interface AnalyzeBomResponse {
  request_id: string;
  material: string;
  plant: string;
  quantity: number;
  candidates_count: number;
  candidates: Candidate[];
  trace_id: string;
  computed_at: string;
}

export interface ExplainRequest {
  decision_id: string;
  candidate_id?: string;
}

export interface ExplainResponse {
  decision_id: string;
  candidate_id: string | null;
  explanation: string;
  model_used: string;
  tokens_used: number;
}

export interface DecisionSummary {
  id: string;
  material: string;
  plant: string;
  quantity: number;
  status: string;
  candidates_count: number;
  recommended: string | null;
  created_at: string | null;
}

export interface DashboardStats {
  total_materials: number;
  total_bom_headers: number;
  total_bom_items: number;
  total_order_chains: number;
  total_decisions: number;
  total_production_orders: number;
  total_planned_orders: number;
  total_sales_orders: number;
}

export interface MaterialSummary {
  material: string;
  plant: string;
  bom_count: number;
  latest_order: string | null;
}

export interface IngestResponse {
  status: string;
  records_ingested: number;
  source_file: string;
  object_type: string;
  message: string;
}
