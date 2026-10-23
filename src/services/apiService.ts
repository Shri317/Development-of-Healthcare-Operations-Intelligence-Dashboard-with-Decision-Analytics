import { getIdToken, getAccessToken } from './cognitoAuth';

export const API_BASE_URL = '/api';

/**
 * Enterprise API fetch wrapper that injects Cognito Bearer tokens
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  const token = getIdToken() || getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export interface HealthStatus {
  status: string;
  service: string;
  region: string;
  glueDatabase: string;
  s3Bucket: string;
  athenaWorkgroup: string;
  awsServices: {
    s3: string;
    glue: string;
    athena: string;
    bedrock: string;
  };
}

export interface Facility {
  id: string;
  name: string;
  location: string;
  type: string;
}

export interface ExecutiveKPI {
  title: string;
  value: string;
  change: number;
  status: 'positive' | 'negative' | 'neutral';
  target: string;
  category: string;
}

export interface ExecutiveSummaryResponse {
  source: string;
  kpis: ExecutiveKPI[];
  rawMetrics: {
    totalAdmissions: number;
    avgLOS: number;
    totalRevenue: number;
    denialRate: number;
    avgEDWait: number;
    occupancyRate: number;
  };
}

export interface AIExecutiveSummaryResponse {
  status: 'success' | 'fallback' | 'error';
  provider: string;
  model: string;
  facility_id: string;
  facility_label: string;
  timeframe: string;
  generated_at: string;
  data_freshness: string;
  executive_brief: string;
  key_trends: string[];
  operational_concerns: string[];
  management_recommendations: string[];
  observations: string[];
  metrics_used?: Record<string, any>;
  is_fallback: boolean;
  errorMessage?: string | null;
  source?: string;
  kpis?: ExecutiveKPI[];
  rawMetrics?: {
    totalAdmissions: number;
    avgLOS: number;
    totalRevenue: number;
    denialRate: number;
    avgEDWait: number;
    occupancyRate: number;
    [key: string]: any;
  };
}

export interface FacilityComparisonItem {
  id: string;
  name: string;
  location: string;
  admissions: number;
  revenue: number;
  denialRate: number;
  occupancyRate: number;
}

export interface AthenaQueryResult {
  queryExecutionId: string;
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'RUNNING';
  executionTimeMs: number;
  dataScannedMb: string;
  columns: string[];
  rows: Record<string, any>[];
  errorMessage?: string;
}

export interface GlueTableSummary {
  name: string;
  records: string;
  size: string;
  s3Location: string;
  cols: { name: string; type: string }[];
  createTime?: string;
}

export interface GlueTablesResponse {
  status: 'connected' | 'error';
  database: string;
  tableCount: number;
  tables: GlueTableSummary[];
  errorMessage?: string;
}

export interface CopilotEvidenceItem {
  metric: string;
  value: string;
  detail?: string;
}

export interface CopilotResponse {
  question?: string;
  query: string;
  answer: string;
  data_source: string;
  domain: string;
  evidence: CopilotEvidenceItem[];
  method: string;
  bedrock_used: boolean;
  ai_used?: boolean;
  ai_provider?: string;
  model?: string;
  is_fallback?: boolean;
  ai_explanation: string;
  ai_status: string;
  facility_id: string;
  source?: string;
  metricsUsed?: string[];
}

/**
 * Fetches System Health & AWS Service connection statuses from Backend
 */
export async function fetchHealthStatus(): Promise<HealthStatus> {
  const res = await apiFetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error(`Backend Health Check Failed (${res.status})`);
  return res.json();
}

/**
 * Fetches real facility list from Glue / Athena / Dataset backend
 */
export async function fetchFacilities(): Promise<Facility[]> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/facilities`);
  if (!res.ok) throw new Error('Failed to fetch facility list from backend.');
  return res.json();
}

/**
 * Fetches Executive Summary KPI metrics filtered by facility
 */
export async function fetchExecutiveSummary(facilityId: string = 'all', timeframe: string = 'realtime'): Promise<ExecutiveSummaryResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/summary?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch executive summary from backend.');
  return res.json();
}

/**
 * Fetches AI-generated Executive Summary with verified metrics and structured insights
 */
export async function fetchAIExecutiveSummary(facilityId: string = 'all', timeframe: string = 'realtime'): Promise<AIExecutiveSummaryResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/ai-summary?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch AI executive summary from backend.');
  return res.json();
}

/**
 * Fetches cross-facility comparative data
 */
export async function fetchFacilityComparison(timeframe: string = 'realtime'): Promise<FacilityComparisonItem[]> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/facilities-comparison?timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch facility comparison from backend.');
  return res.json();
}

/**
 * Fetches Billing & Revenue metrics
 */
export async function fetchBillingIntelligence(facilityId: string = 'all', timeframe: string = 'realtime') {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/billing?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch billing intelligence from backend.');
  return res.json();
}

/**
 * Fetches Claims & Insurance metrics
 */
export async function fetchClaimsIntelligence(facilityId: string = 'all', timeframe: string = 'realtime') {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/claims?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch claims intelligence from backend.');
  return res.json();
}

/**
 * Fetches Patient Operations metrics
 */
export async function fetchPatientOpsIntelligence(facilityId: string = 'all', timeframe: string = 'realtime') {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/patient-ops?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch patient operations from backend.');
  return res.json();
}

/**
 * Fetches Doctor & Staff metrics
 */
export async function fetchDoctorStaffIntelligence(facilityId: string = 'all', timeframe: string = 'realtime') {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/doctor-staff?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch doctor staff intelligence from backend.');
  return res.json();
}

/**
 * Fetches Laboratory Diagnostics metrics
 */
export async function fetchLaboratoryIntelligence(facilityId: string = 'all', timeframe: string = 'realtime') {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/laboratory?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch laboratory intelligence from backend.');
  return res.json();
}

/**
 * Fetches Pharmacy & Inventory metrics
 */
export async function fetchPharmacyInventoryIntelligence(facilityId: string = 'all', timeframe: string = 'realtime') {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/pharmacy-inventory?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch pharmacy inventory from backend.');
  return res.json();
}

export interface FinancialKPIs {
  operatingProfit: number;
  operatingProfitFormatted: string;
  operatingMarginPct: number;
  revenueVariance: number;
  revenueVarianceFormatted: string;
  revenueVariancePct: number;
  daysCashOnHand: number | null;
  daysCashOnHandFormatted: string;
  operatingExpenses: number;
  operatingExpensesFormatted: string;
  costVariance: number;
  costVarianceFormatted: string;
  costVariancePct: number;
}

export interface PnLStatementRow {
  metric: string;
  actual: number;
  actualFormatted: string;
  budget: number | null;
  budgetFormatted: string;
  variance: string;
  performanceTrend: string;
}

export interface ExpenseCategoryRow {
  category: string;
  amount: number;
}

export interface FinancialIntelligenceResponse {
  source: string;
  facilityId: string;
  kpis: FinancialKPIs;
  pnlStatement: PnLStatementRow[];
  expenseCategories: ExpenseCategoryRow[];
}

/**
 * Fetches Financial Intelligence & P&L Statement metrics
 */
export async function fetchFinancialIntelligence(facilityId: string = 'all', timeframe: string = 'realtime'): Promise<FinancialIntelligenceResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/financial-intelligence?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch financial intelligence from backend.');
  return res.json();
}

export interface VendorRecord {
  vendorId: string;
  name: string;
  category: string;
  rating: number;
  onTimeDeliveryPct: number;
  qualityScore: number;
  avgLeadTimeDays: number;
  riskLevel: string;
  slaStatus: string;
  activePOValue: number;
  activePOValueFormatted: string;
  poCount: number;
  defectRate: number | null;
  defectRateFormatted: string;
}

export interface SupplyChainKPIs {
  totalVendors: number;
  compliantVendors: number;
  avgOnTimeDeliveryPct: number;
  avgQualityScore: number;
  totalPOCount: number;
  totalPOValue: number;
  totalPOValueFormatted: string;
  defectRate: number | null;
  defectRateFormatted: string;
}

export interface SupplyChainResponse {
  source: string;
  facilityId: string;
  kpis: SupplyChainKPIs;
  vendors: VendorRecord[];
}

/**
 * Fetches Supply Chain & Vendor Management metrics
 */
export async function fetchSupplyChainVendors(facilityId: string = 'all', timeframe: string = 'realtime'): Promise<SupplyChainResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/supply-chain-vendors?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch supply chain vendors from backend.');
  return res.json();
}

export interface QualityComplianceKPIs {
  overallComplianceScore: number;
  overallComplianceScoreFormatted: string;
  dataPrivacyComplianceScore?: number | null;
  dataPrivacyComplianceScoreFormatted?: string;
  hipaaComplianceScore: number | null;
  hipaaComplianceScoreFormatted: string;
  infectionRate: number | null;
  infectionRateFormatted: string;
  medicationErrorsToday: number | null;
  medicationErrorsTodayFormatted: string;
  totalMedicationErrors: number;
  totalInfectionIncidents: number;
  totalAudits: number;
  compliantAudits: number;
  minorFindingsAudits: number;
  majorFindingsAudits: number;
  totalFindingsCount: number;
  totalIncidents: number;
  activeCAPACount: number;
  totalCAPACount: number;
  capaByStatus: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  incidentsByType: Record<string, number>;
  incidentsByStatus: Record<string, number>;
  auditsByType: Record<string, number>;
  totalComplaints: number;
  avgComplaintResolutionHours: number;
  complaintsByStatus: Record<string, number>;
}

export interface QualityIncidentRecord {
  incidentId: string;
  incidentDate: string;
  facilityId: string;
  facilityName: string;
  departmentId: string;
  departmentName: string;
  incidentType: string;
  severity: string;
  status: string;
  correctiveActionRequired: string;
  actionId?: string | null;
  actionType?: string | null;
  actionStatus?: string | null;
  actionDueDate?: string | null;
}

export interface QualityAuditRecord {
  auditId: string;
  facilityId: string;
  facilityName: string;
  departmentId: string;
  departmentName: string;
  auditDate: string;
  auditType: string;
  complianceScore: number;
  findingsCount: number;
  status: string;
}

export interface CorrectiveActionRecord {
  actionId: string;
  incidentId: string;
  facilityId: string;
  facilityName: string;
  actionType: string;
  dueDate: string;
  actionStatus: string;
}

export interface QualityComplianceResponse {
  source: string;
  facilityId: string;
  kpis: QualityComplianceKPIs;
  incidents: QualityIncidentRecord[];
  audits: QualityAuditRecord[];
  correctiveActions: CorrectiveActionRecord[];
}

/**
 * Fetches Quality & Regulatory Compliance metrics
 */
export async function fetchQualityCompliance(facilityId: string = 'all', timeframe: string = 'realtime'): Promise<QualityComplianceResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/quality-compliance?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch quality compliance metrics from backend.');
  return res.json();
}

export interface ForecastDataPoint {
  day: string;
  ActualVolume: number | null;
  PredictedVolume: number;
  PredictedStaffing: number;
}

export interface DenialReasonBreakdown {
  reason: string;
  count: number;
  amount: number;
  amountFormatted: string;
}

export interface OperationalAnomalyItem {
  title: string;
  cause: string;
  severity: string;
  color: string;
}

export interface FlowBottleneckItem {
  stage: string;
  avgWaitMinutes: number;
  avgDurationMinutes: number;
  eventCount: number;
}

export interface AIPredictiveKPIs {
  peakForecastVolume: number;
  peakForecastVolumeFormatted: string;
  forecastTrendPct: number;
  forecastTrendFormatted: string;
  projectedStaffRequired: number;
  projectedStaffRequiredFormatted: string;
  staffingRatioStandard: string;
  clinicianUtilizationPct: number;
  totalAppointments: number;
  noShowCount: number;
  overallNoShowRate: number;
  overallNoShowRateFormatted: string;
  totalClaims: number;
  deniedClaimsCount: number;
  overallDenialRate: number;
  overallDenialRateFormatted: string;
  totalDeniedAmount: number;
  totalDeniedAmountFormatted: string;
  modelAccuracy: number | null;
  modelAccuracyFormatted: string;
  methodology: string;
}

export interface AIPredictiveResponse {
  source: string;
  facilityId: string;
  kpis: AIPredictiveKPIs;
  forecastChart: ForecastDataPoint[];
  noShowByBooking: Record<string, number>;
  noShowByDepartment: Record<string, number>;
  denialsByReason: DenialReasonBreakdown[];
  denialRateByPayer: Record<string, number>;
  anomalies: OperationalAnomalyItem[];
  bottlenecks: FlowBottleneckItem[];
}

/**
 * Fetches AI & Predictive Intelligence metrics from real dataset
 */
export async function fetchAIPredictiveIntelligence(facilityId: string = 'all', timeframe: string = 'realtime'): Promise<AIPredictiveResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/ai-predictive-intelligence?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch AI & predictive intelligence metrics from backend.');
  return res.json();
}

export interface WorkflowRuleRecord {
  id: string;
  name: string;
  sourceDataset: string;
  triggerCondition: string;
  actionDescription: string;
  channel: string;
  status: string;
  actionStatus: string;
  isTriggered: boolean;
  triggeredRecordCount: number;
  monitoredRecordCount: number;
  severity: string;
  summary: string;
}

export interface WorkflowAutomationKPIs {
  activeRulesCount: number;
  totalConditionsDetected: number;
  totalConditionsDetectedFormatted: string;
  actionsExecutedCount: number;
  actionsExecutedFormatted: string;
  manualHoursSaved: number | null;
  manualHoursSavedFormatted: string;
  deliveryRate: number | null;
  deliveryRateFormatted: string;
  dispatchChannelSummary: string;
}

export interface WorkflowAutomationResponse {
  source: string;
  facilityId: string;
  kpis: WorkflowAutomationKPIs;
  rules: WorkflowRuleRecord[];
}

/**
 * Fetches Workflow Automation Engine rules and detected trigger conditions
 */
export async function fetchWorkflowAutomation(facilityId: string = 'all', timeframe: string = 'realtime'): Promise<WorkflowAutomationResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/workflow-automation?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch workflow automation metrics from backend.');
  return res.json();
}

export interface PipelineStage {
  step: number;
  id: string;
  name: string;
  category: string;
  activeState: string;
  description: string;
  metrics: string;
  status: 'ACTIVE' | 'STANDBY' | 'PENDING_AUTH' | 'ERROR';
  source: string;
}

export interface PipelineInfrastructure {
  dataLayer: {
    activeSource: string;
    localDataset: {
      status: string;
      path: string;
      tableCount: number;
      totalRecords: number;
    };
    awsS3: {
      status: string;
      bucket: string;
      region?: string;
      fileCount?: number;
      error?: string | null;
    };
    awsGlue: {
      status: string;
      database: string;
      tableCount: number;
      error?: string | null;
    };
    awsAthena: {
      status: string;
      workgroup: string;
      outputLocation: string;
      error?: string | null;
    };
  };
  analyticsEngine: {
    status: string;
    framework: string;
    activeModulesCount: number;
    modules: string[];
  };
  predictiveEngine: {
    status: string;
    models: {
      name: string;
      type: string;
      horizon?: string;
      status: string;
    }[];
  };
  automationEngine: {
    status: string;
    activeRulesCount: number;
    triggersDetected: number;
    triggersDetectedFormatted: string;
    actionsExecuted: number;
    actionsExecutedFormatted: string;
    dispatchersConnected: boolean;
    dispatcherStatus: string;
    executionHistoryStatus: string;
  };
}

export interface PipelineStatusResponse {
  source: string;
  facilityId: string;
  timeframe: string;
  dataFreshness: string;
  infrastructure: PipelineInfrastructure;
  pipelineStages: PipelineStage[];
  executionSummary: {
    totalPipelineStages: number;
    operationalStages: number;
    standbyOrPendingStages: number;
    executionMode: string;
    executionHistory: string;
  };
}

/**
 * Fetches real Data -> AI -> Automation Pipeline execution architecture and metrics
 */
export async function fetchPipelineStatus(facilityId: string = 'all', timeframe: string = 'realtime'): Promise<PipelineStatusResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/pipeline-status?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch pipeline status from backend.');
  return res.json();
}


/**
 * Executes a SQL query via backend Amazon Athena Query Engine
 */
export async function executeAthenaQuery(sqlQuery: string, maxResults: number = 100): Promise<AthenaQueryResult> {
  const res = await apiFetch(`${API_BASE_URL}/athena/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sqlQuery, maxResults }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Athena API HTTP Error' }));
    throw new Error(err.detail || 'Athena query execution failed');
  }
  return res.json();
}

/**
 * Fetches AWS Glue Data Catalog table metadata
 */
export async function fetchGlueTables(): Promise<GlueTablesResponse> {
  const res = await apiFetch(`${API_BASE_URL}/glue/tables`);
  if (!res.ok) throw new Error('Failed to fetch AWS Glue table catalog.');
  return res.json();
}

/**
 * Sends natural language questions to Backend AI Copilot
 */
export async function queryAICopilot(query: string, facilityId: string = 'all'): Promise<CopilotResponse> {
  const res = await apiFetch(`${API_BASE_URL}/copilot/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: query, query, facility_id: facilityId, facilityId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Copilot API Error' }));
    throw new Error(err.detail || 'Copilot query failed');
  }
  return res.json();
}

export interface DrilldownFacility {
  id: string;
  name: string;
  location: string;
  revenue: number;
  revenueFormatted: string;
  healthScore: number;
  admissions: number;
  doctorCount: number;
  departments: string[];
}

export interface DrilldownDepartment {
  name: string;
  count: number;
}

export interface DrilldownProvider {
  id: string;
  name: string;
  facilityId: string;
  facilityName: string;
  departmentId: string;
  departmentName: string;
  specialization: string;
  experienceYears: number;
  employmentType: string;
  patientsSeen: number;
  patientsSeenFormatted: string;
  utilizationRate: number;
  revenueGenerated: number;
  revenueGeneratedFormatted: string;
  revenueSource: string;
  overtimeHours: number;
  surgeries: number;
}

export interface OperationsDrilldownResponse {
  source: string;
  selectedFacility: string;
  selectedDepartment: string;
  facilities: DrilldownFacility[];
  departments: DrilldownDepartment[];
  providers: DrilldownProvider[];
  totalProvidersCount: number;
  totalEnterpriseProviders: number;
  dataFreshness: string;
}

/**
 * Fetches verified Enterprise -> Facility -> Department -> Provider drilldown data
 */
export async function fetchOperationsDrilldown(
  facilityId: string = 'all',
  department?: string | null,
  timeframe: string = 'realtime'
): Promise<OperationsDrilldownResponse> {
  let url = `${API_BASE_URL}/dashboard/drilldown?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`;
  if (department && department !== 'all') {
    url += `&department=${encodeURIComponent(department)}`;
  }
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch operations drilldown metrics from backend.');
  return res.json();
}

export interface MedicalCodingResponse {
  totalClaimsEvaluated: number;
  codingDocumentationDenials: number;
  financialExposure: number;
  financialExposureFormatted: string;
  documentationDischargeHolds: number;
  meanDischargeDelayHours: number;
  denialReasonsBreakdown: Array<{
    reason: string;
    count: number;
    amount: number;
    amountFormatted: string;
  }>;
  recentAuditClaims: Array<{
    claimId: string;
    billId: string;
    patientId: string;
    patientName: string;
    facilityId: string;
    payer: string;
    claimedAmount: number;
    claimedAmountFormatted: string;
    denialReason: string;
    submissionDate: string;
    status: string;
  }>;
  dataSource: string;
  dataIntegrityNote: string;
}

export async function fetchMedicalCodingIntelligence(
  facilityId: string = 'all',
  timeframe: string = 'realtime'
): Promise<MedicalCodingResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/medical-coding?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch medical coding intelligence from backend.');
  return res.json();
}

export interface EmergencyCriticalResponse {
  totalVisits: number;
  meanWaitMinutes: number;
  meanTreatmentMinutes: number;
  admissionRate: number;
  admittedCount: number;
  triageBreakdown: Array<{
    level: number;
    label: string;
    count: number;
    percentage: number;
  }>;
  dispositionBreakdown: Array<{
    disposition: string;
    count: number;
  }>;
  arrivalModeBreakdown: Array<{
    mode: string;
    count: number;
  }>;
  icuStats: {
    totalStays: number;
    ventilationRequiredCount: number;
    ventilationRate: number;
    meanVentilatorHours: number;
    meanAcuityScore: number;
    outcomes: Array<{ outcome: string; count: number }>;
  };
  totalPhysicalBeds: number;
  bedTelemetryNote: string;
  dataSource: string;
}

export async function fetchEmergencyCriticalIntelligence(
  facilityId: string = 'all',
  timeframe: string = 'realtime'
): Promise<EmergencyCriticalResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/emergency-critical?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch emergency & critical intelligence from backend.');
  return res.json();
}

export interface PatientExperienceResponse {
  totalFeedback: number;
  overallRating: number;
  csatScore: number;
  npsScore: number;
  sentimentBreakdown: Array<{
    sentiment: string;
    count: number;
    percentage: number;
  }>;
  feedbackChannelBreakdown: Array<{
    channel: string;
    count: number;
  }>;
  complaints: {
    total: number;
    resolved: number;
    inProgress: number;
    open: number;
    meanResolutionHours: number;
    categories: Array<{ category: string; count: number }>;
  };
  recentFeedback: Array<{
    feedbackId: string;
    patientId: string;
    patientName: string;
    facilityId: string;
    departmentId: string;
    rating: number;
    sentiment: string;
    channel: string;
    date: string;
  }>;
  dataSource: string;
}

export async function fetchPatientExperienceIntelligence(
  facilityId: string = 'all',
  timeframe: string = 'realtime'
): Promise<PatientExperienceResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/patient-experience?facility_id=${encodeURIComponent(facilityId)}&timeframe=${encodeURIComponent(timeframe)}`);
  if (!res.ok) throw new Error('Failed to fetch patient experience intelligence from backend.');
  return res.json();
}

export interface SecurityGovernanceResponse {
  posture: {
    phiDataClassification: string;
    credentialIsolation: string;
    awsSessionState: string;
    encryptionAtRest: string;
    encryptionInTransit: string;
    networkControls: string;
    activeRbacRolesCount: number;
    rbacRoles: string[];
  };
  auditLogs: Array<{
    id: string;
    timestamp: string;
    user: string;
    role: string;
    action: string;
    resource: string;
    status: string;
  }>;
  dataSource: string;
}

export async function fetchSecurityGovernanceIntelligence(): Promise<SecurityGovernanceResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/security-governance`);
  if (!res.ok) throw new Error('Failed to fetch security governance posture from backend.');
  return res.json();
}

export interface IntegrationsStatusResponse {
  integrations: Array<{
    name: string;
    type: string;
    protocol: string;
    status: string;
    latency: string;
    isAws: boolean;
    details: string;
  }>;
  localEngineActive: boolean;
  cloudActive: boolean;
  dataSource: string;
}

export async function fetchIntegrationsStatus(): Promise<IntegrationsStatusResponse> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/integrations-status`);
  if (!res.ok) throw new Error('Failed to fetch integrations status from backend.');
  return res.json();
}

export async function pingIntegrationEndpoint(name: string): Promise<{
  success: boolean;
  service: string;
  status: string;
  latency: string;
  message: string;
}> {
  const res = await apiFetch(`${API_BASE_URL}/dashboard/integrations-ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error('Failed to ping integration service.');
  return res.json();
}


