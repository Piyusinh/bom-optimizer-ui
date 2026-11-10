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

// ─── Phase 1 — Production Persona ─────────────────────────────────────────────

export type AnchorType = 'MATERIAL' | 'PLANNED_ORDER' | 'PROCESS_ORDER';

export type RankingCriterion =
  | 'COST'
  | 'RECENCY'
  | 'REWORK_CYCLES'
  | 'PRODUCTION_LINE'
  | 'SEASON'
  | 'EFFICIENCY';

export interface ProductionAnchor {
  type: AnchorType;
  value: string;
}

export interface RankingCriterionInput {
  criterion: RankingCriterion;
  priority: number;
}

export interface ProductionAnalyzeRequest {
  plant: string;
  anchor: ProductionAnchor;
  production_line?: string | null;
  date_range?: { from?: string | null; to?: string | null } | null;
  quantity?: number | null;
  ranking_criteria: RankingCriterionInput[];
  constraints: {
    must_use_registered_components: boolean;
    avoid_components: string[];
    max_components?: number;
    min_quantity_per_component?: number;
  };
}

export interface OperationDetail {
  operation_number: number;
  description: string | null;
  work_center: string | null;
  setup_time_hours: number;
  run_time_hours: number;
  teardown_time_hours: number;
  cost_per_hour: number;
  operation_cost: number;
}

export interface ComponentDetail {
  component: string;
  description: string | null;
  material_type: string | null;
  planned_quantity: number;
  actual_quantity: number | null;
  unit: string;
  scrap_percent: number;
  unit_cost: number;
  extended_cost: number;
  available_stock: number | null;
}

export interface CostBreakdown {
  material_cost: number;
  operational_cost: number;
  total_cost: number;
  currency: string;
}

export interface ProductionCandidate {
  id: string;
  rank: number;
  material: string;
  plant: string;
  production_version: string | null;
  alternative_bom: string | null;
  recipe_id: string | null;
  production_line: string | null;
  source_type: string;
  source_orders: string[];
  occurrence_count: number;
  last_used_date: string | null;
  season: string | null;
  avg_cycles: number;
  avg_reprocess_cycles: number;
  total_operation_hours: number;
  cost: CostBreakdown;
  cost_reduction_percent: number | null;
  components: ComponentDetail[];
  operations: OperationDetail[];
  feasible: boolean;
  violations: string[];
  legal_approval_required: boolean;
  criterion_values: Record<string, number>;
  rank_reason: string;
}

export interface ProductionBaseline {
  source: string;
  source_order: string | null;
  production_version: string | null;
  avg_cycles: number;
  avg_reprocess_cycles: number;
  cost: CostBreakdown;
  components: ComponentDetail[];
}

export interface ProductionAnalyzeResponse {
  request_id: string;
  plant: string;
  anchor: ProductionAnchor;
  material: string;
  quantity: number;
  production_line: string | null;
  ranking_criteria: RankingCriterionInput[];
  baseline: ProductionBaseline | null;
  candidates_count: number;
  candidates: ProductionCandidate[];
  trace_id: string;
  computed_at: string;
}

export interface ProductionLineOption {
  work_center: string;
  description: string | null;
  plant: string;
  run_count: number;
}

export interface OrderOption {
  order_id: string;
  material: string;
  plant: string;
  quantity: number;
  start_date: string | null;
  status: string | null;
}

export interface ComponentDiff {
  component: string;
  change_type: 'ADDED' | 'REMOVED' | 'QUANTITY_CHANGED' | 'UNCHANGED';
  baseline_quantity: number | null;
  proposed_quantity: number | null;
  unit: string;
  cost_impact: number;
}

export interface BomCompareResponse {
  decision_id: string;
  candidate_id: string;
  baseline: ProductionBaseline;
  proposed: ProductionCandidate;
  diffs: ComponentDiff[];
  total_cost_delta: number;
  total_cost_delta_percent: number;
}

export interface AdoptResponse {
  adoption_id: string;
  decision_id: string;
  candidate_id: string;
  status: string;
  target_order: string | null;
  message: string;
}

// ─── Agent Chat ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  tool_calls_made: string[];
  model_used: string;
}

export interface AgentToolInfo {
  name: string;
  description: string;
}

export interface AgentToolsResponse {
  tool_count: number;
  tools: AgentToolInfo[];
  guardrails: string[];
}
