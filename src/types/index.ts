export type TimeframeOption = 'realtime' | 'today' | 'weekly' | 'monthly' | 'quarterly' | 'ytd';

export type RoleType = 'Enterprise Executive' | 'Chief Medical Officer' | 'Chief Financial Officer' | 'Billing & Claims Lead' | 'Operations Director' | 'Compliance Officer';

export interface Facility {
  id: string;
  name: string;
  location: string;
  type: string;
  bedsTotal?: number;
  bedsOccupied?: number;
  doctorsCount?: number;
  monthlyRevenue?: number;
  healthScore?: number;
  denialRate?: number;
  patientSatisfaction?: number;
}

export interface ExecutiveKPI {
  title: string;
  value: string | number;
  change: number; // percentage
  status: 'positive' | 'negative' | 'neutral' | string;
  target: string | number;
  category: string;
}

export interface PatientRecord {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  facility: string;
  department: string;
  status: string;
  checkInTime: string;
  waitTimeMins: number;
  doctor: string;
  admissionDate?: string;
  roomBed?: string;
  predictedLOSDays?: number;
  readmissionRiskScore: number; // 0 - 100
}

export interface ProviderRecord {
  id: string;
  name: string;
  specialty: string;
  facility: string;
  department: string;
  shiftStatus: string;
  patientsSeenToday: number;
  utilizationRate: number; // percentage
  rvuTarget: number;
  rvuAchieved: number;
  revenueGenerated: number;
  overtimeHours: number;
  satisfactionRating: number;
}

export interface ClaimRecord {
  id: string;
  claimNumber: string;
  patientName: string;
  mrn: string;
  payerName: string;
  facility: string;
  amountBilled: number;
  amountExpected: number;
  submissionDate: string;
  status: string;
  agingDays: number;
  denialReason?: string;
  aiDenialRisk: number; // percentage
  cptCodes: string[];
  icd10Codes: string[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  location: string;
  currentStock: number;
  minThreshold: number;
  unitCost: number;
  expiryDate: string;
  vendorName: string;
  status: string;
  predictedDepletionDays: number;
}

export interface LabTest {
  id: string;
  orderId: string;
  patientName: string;
  testName: string;
  category: string;
  priority: string;
  orderTime: string;
  sampleCollectedTime?: string;
  tatMins: number;
  tatTargetMins: number;
  status: string;
  equipmentUsed: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  triggerEvent: string;
  condition: string;
  action: string;
  channel: string;
  status: string;
  executionCount: number;
  lastExecuted: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: string;
}

export interface AICopilotMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  chartData?: any;
  chartType?: 'bar' | 'line' | 'pie' | 'radar';
  recommendedActions?: Array<{ label: string; actionId: string }>;
  data_source?: string;
  domain?: string;
  evidence?: Array<{ metric: string; value: string; detail?: string }>;
  method?: string;
  bedrock_used?: boolean;
  ai_used?: boolean;
  ai_provider?: string;
  model?: string;
  is_fallback?: boolean;
  ai_explanation?: string;
  ai_status?: string;
}
