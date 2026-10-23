# MedOps User Stories & Acceptance Criteria

**Project:** Development of a Healthcare Operations Intelligence Dashboard with Decision Analytics (MedOps)  
**Standard Story Format:** "As a `[user role]`, I want `[capability]`, so that `[benefit]`."  
**Last Updated:** October 2026  
**Implementation Baseline:** 100% Code-Verified against Live React 19 Frontend and FastAPI Backend  

---

## 1. User Roles Matrix

| Role Identifier | Role Title | Primary Operational Focus | Primary Modules Used |
| :--- | :--- | :--- | :--- |
| **`ROLE-EXEC`** | Chief Executive / Network COO | Macro-operational performance, facility benchmarking | Executive Command Center, Enterprise Drilldown |
| **`ROLE-CMO`** | Chief Medical Officer | Clinical quality, staffing ratios, inpatient mortality | Doctor & Staff Intelligence, Quality & Compliance |
| **`ROLE-CFO`** | Chief Financial Officer | Revenue cycle, claims denial rate, EBITDA margins | Financial Intelligence, Billing & Revenue, Claims |
| **`ROLE-CLIN`** | Clinical Operations Director | Inpatient census, bed occupancy, throughput flow | Patient Operations, Enterprise Drilldown |
| **`ROLE-ED`** | Emergency Department Head | Triage wait times, ambulance divert, left-without-being-seen | Emergency & Critical Operations |
| **`ROLE-PHARM`**| Pharmacy & Materials Manager | Drug stockouts, 90-day expiring medicine batches | Pharmacy & Inventory Management |
| **`ROLE-SCM`** | Supply Chain Coordinator | Vendor on-time delivery, purchase order fulfillment | Supply Chain & Vendor Intelligence |
| **`ROLE-AUDIT`**| Quality & Compliance Auditor | Incident investigations, HIPAA/data privacy adherence | Quality & Compliance, Audit Logs |

---

## 2. Verified User Stories

### Epics 1 & 2: Executive Overview & Patient Operations

#### Story US-01: Consolidated Executive KPI Overview
* **Story ID:** `US-01`
* **Role:** Hospital Administrator / Network COO (`ROLE-EXEC`)
* **User Story:** *As an executive operations director, I want to view high-level KPIs (Total Admissions, Average Length of Stay, Net Revenue, Claims Denial Rate, ED Wait Time, Bed Occupancy, Doctor Utilization, Low Stock Medicines, and Critical Incidents) on a single dashboard, so that I can immediately assess the operational health of the hospital network.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Top-row metric cards render all 9 verified operational metrics with clear values, units, and status badges.
  2. Selecting "All Facilities" displays enterprise aggregates; selecting a specific facility (`FAC001`-`FAC005`) updates metrics instantly.
  3. Real-time, Today, Weekly, Monthly, Quarterly, and YTD timeframe slicers dynamically filter the displayed values.
  4. Values match the backend response from `/api/dashboard/summary`.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/ExecutiveCommandCenter.tsx`, `/api/dashboard/summary`)

#### Story US-02: Real-Time Active Bed Occupancy Tracking
* **Story ID:** `US-02`
* **Role:** Clinical Operations Director (`ROLE-CLIN`)
* **User Story:** *As a clinical operations director, I want to calculate inpatient bed occupancy using currently active admissions divided by available beds, so that I get an accurate real-time view of bed capacity without skew from past discharged patients.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. The bed occupancy calculation uses active admissions (where `discharge_date IS NULL` or in the future) divided by total beds.
  2. The metric is expressed as an exact percentage with single decimal precision (e.g., `78.4%`).
  3. Over-capacity conditions (>85%) display high-urgency amber/rose alert badges.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`backend/app/services/dashboard_service.py:get_executive_summary`, audit-remediated in `test_audit_remediation_fixes.py`)

#### Story US-03: Patient Flow & Throughput Bottleneck Detection
* **Story ID:** `US-03`
* **Role:** Clinical Operations Director (`ROLE-CLIN`)
* **User Story:** *As a patient operations director, I want to analyze patient flow events across triage, examination, transfer, and discharge stages, so that I can pinpoint operational bottlenecks delaying inpatient admissions.*
* **Priority:** `Should Have (P1)`
* **Acceptance Criteria:**
  1. Patient flow stage durations (Triage $\rightarrow$ Consult $\rightarrow$ Bed Assignment $\rightarrow$ Discharge) are visualized in an interactive funnel / bar chart.
  2. Average stage dwell times are reported in minutes.
  3. If no patient flow events exist for a filtered subset, an informative empty state is rendered without throwing runtime errors.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/PatientOperations.tsx`, `/api/dashboard/patient-ops`)

---

### Epic 3: Workforce, Staffing & Emergency Services

#### Story US-04: Clinician Utilization & Nurse-to-Patient Staffing Ratios
* **Story ID:** `US-04`
* **Role:** Chief Medical Officer (`ROLE-CMO`)
* **User Story:** *As a medical director, I want to track doctor workload hours, patient consults per clinician, and nurse shift coverage, so that I can maintain safe nurse-to-patient staffing ratios and prevent physician burnout.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Clinician utilization percentage is calculated as `actual_consult_hours / scheduled_hours * 100`.
  2. Doctor department breakdown displays active patient count per on-duty physician.
  3. Nurse shift attendance and coverage warnings trigger when staffing ratios exceed clinical safety thresholds (>1:4 ICU, >1:6 general ward).
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/DoctorStaffIntelligence.tsx`, `/api/dashboard/staff-intelligence`)

#### Story US-05: Emergency Room Triage & Wait Time Monitoring
* **Story ID:** `US-05`
* **Role:** Emergency Department Head (`ROLE-ED`)
* **User Story:** *As an emergency department head, I want to monitor average ED wait times and triage category volumes in real time, so that I can redirect triage staff and avoid ambulance diversion.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Average emergency wait time is displayed in minutes for each triage acuity level (Resuscitation, Emergent, Urgent, Non-Urgent).
  2. Left Without Being Seen (LWBS) percentage is calculated and flagged if exceeding the 3.0% threshold.
  3. 24-hour hourly arrival distribution chart displays peak emergency influx times.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/EmergencyCriticalOperations.tsx`, `/api/dashboard/emergency-ops`)

---

### Epic 4: Revenue Cycle, Billing & Financial Intelligence

#### Story US-06: Revenue Cycle Clean Claims & Denial Analysis
* **Story ID:** `US-06`
* **Role:** Chief Financial Officer (`ROLE-CFO`)
* **User Story:** *As a hospital billing manager, I want to inspect clean claim rates, primary denial reasons, and aging accounts receivable, so that I can eliminate billing submission errors and accelerate reimbursement cycles.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Clean claim rate is computed as `(total_claims - rejected_claims) / total_claims * 100`.
  2. Claims denial Pareto chart highlights the top denial codes (e.g., Coding Error, Prior Authorization, Eligibility, Timely Filing).
  3. Payer mix breakdown categorizes claims by Medicare, Medicaid, and Commercial insurance carriers.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/BillingRevenueIntelligence.tsx`, `/api/dashboard/billing-intelligence`)

#### Story US-07: Executive Financial P&L and Margin Evaluation
* **Story ID:** `US-07`
* **Role:** Chief Financial Officer (`ROLE-CFO`)
* **User Story:** *As a finance director, I want to view operational revenues, expense categories, and operating profit (EBITDA proxy) across monthly, quarterly, and annual timeframes, so that I can evaluate financial solvency across each network facility.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Operating Profit is computed as `Operating Revenue - Operating Expenses` with margins expressed as percentage.
  2. Monthly timeframe filtering properly matches the selected accounting month (e.g., September 2026) without SQL filter syntax errors.
  3. Transparently handles metrics not present in dataset: Days Cash on Hand displays "Not available from dataset" rather than fabricated numbers.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/FinancialIntelligence.tsx`, `/api/dashboard/financial-intelligence`, audit-remediated in `test_audit_remediation_fixes.py`)

---

### Epic 5: Clinical Diagnostics, Pharmacy & Quality Compliance

#### Story US-08: Laboratory Diagnostics Turnaround Tracking
* **Story ID:** `US-08`
* **Role:** Laboratory Director / Clinical Operations Director (`ROLE-CLIN`)
* **User Story:** *As a laboratory director, I want to track turnaround time (TAT) from sample collection to result verification across test categories (Hematology, Biochemistry, Microbiology), so that diagnostic delays do not impede clinical discharge.*
* **Priority:** `Should Have (P1)`
* **Acceptance Criteria:**
  1. Average turnaround time is computed in hours and compared against target benchmark Service Level Agreements (SLAs).
  2. Critical abnormal lab results flag immediate alert badges with specimen verification logs.
  3. Equipment utilization rate tracks automated analyzer throughput.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/LaboratoryDiagnostics.tsx`, `/api/dashboard/laboratory-diagnostics`)

#### Story US-09: Dynamic 90-Day Rolling Pharmacy Expiration Alerting
* **Story ID:** `US-09`
* **Role:** Pharmacy & Materials Manager (`ROLE-PHARM`)
* **User Story:** *As a hospital chief pharmacist, I want to dynamically flag all medicine batches expiring within a 90-day rolling window from today, so that inventory can be rotated or returned to vendors before obsolescence.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Batch expiration evaluation computes `expiry_date - current_date <= 90 days`.
  2. Critical stockout risks (<15 days supply remaining based on daily dispensing velocity) trigger amber warning highlights.
  3. Total financial value of expiring stock is calculated accurately.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/PharmacyInventory.tsx`, `/api/dashboard/pharmacy-inventory`, audit-remediated in `test_audit_remediation_fixes.py`)

#### Story US-10: Quality Audits, Incident Rates & HIPAA Privacy
* **Story ID:** `US-10`
* **Role:** Quality & Compliance Auditor (`ROLE-AUDIT`)
* **User Story:** *As a clinical quality manager, I want to compute hospital-acquired infection (HAI) incident rates using inpatient admissions as the true denominator, so that quality reporting satisfies healthcare accreditation standards.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Infection Incident Rate formula is verified as `(infection_incidents / total_admissions) * 1000 admissions` (or %).
  2. Data privacy compliance score properly reflects audit findings with standard percentage formatting (e.g., `94.2%`).
  3. Medication administration errors are calculated across the filtered timeframe with zero negative numbers.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/QualityCompliance.tsx`, `/api/dashboard/quality-compliance`, audit-remediated in `test_audit_remediation_fixes.py`)

#### Story US-11: Patient Experience NPS & Sentiment Scoring
* **Story ID:** `US-11`
* **Role:** Chief Medical Officer (`ROLE-CMO`)
* **User Story:** *As a hospital administrator, I want to track Net Promoter Score (NPS) and Patient Satisfaction (CSAT) survey responses, so that I can improve inpatient discharge satisfaction.*
* **Priority:** `Could Have (P2)`
* **Acceptance Criteria:**
  1. Net Promoter Score is calculated as `% Promoters (9-10) - % Detractors (1-6)`.
  2. If a facility has zero survey records in the selected window, CSAT displays "N/A (No survey responses recorded)" instead of a misleading `0.0 / 5.0` rating.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/PatientExperience.tsx`, `/api/dashboard/patient-experience`, audit-remediated in `test_audit_remediation_fixes.py`)

---

### Epic 6: Supply Chain & Vendor Management

#### Story US-12: Multi-Facility Supply Chain Filtering & Vendor Scorecards
* **Story ID:** `US-12`
* **Role:** Supply Chain Coordinator (`ROLE-SCM`)
* **User Story:** *As a procurement manager, I want to filter purchase orders and vendor performance scorecards by facility, so that I can manage localized medical vendor risk without cross-facility data contamination.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Selecting `FAC001` restricts purchase orders and vendor metric computations exclusively to transactions associated with `FAC001`.
  2. Facility ID normalization handles discrepancies cleanly (e.g., matching numeric prefixes or uppercase normalization).
  3. Vendor Quality Scorecard displays Vendor Name, Category, On-Time Delivery Rate (%), Quality Score (0-100), and Compliance Status.
  4. Defect/damage rate is omitted when unrecorded in source datasets, preserving data truthfulness.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/components/modules/SupplyChainVendor.tsx`, `/api/dashboard/supply-chain`, verified in `test_supply_chain_filtering.py`)

---

### Epic 7: AI Copilot & Enterprise Security

#### Story US-13: Zero-PHI AI Operational Briefing Copilot
* **Story ID:** `US-13`
* **Role:** Hospital Administrator / Network COO (`ROLE-EXEC`)
* **User Story:** *As an executive user, I want an AI Copilot that synthesizes operational trends, concerns, and recommendations from aggregate metrics without transmitting any patient-identifiable data to external LLMs, so that our organization maintains strict HIPAA compliance.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. AI prompt grounding uses only aggregated numbers (Total Admissions, Occupancy Rate, Revenue, Denial Rate, Wait Time).
  2. Google Gemini adapter operates as active provider; falls back gracefully to deterministic rule-based insights if unconfigured or throttled.
  3. Interactive slide-over drawer displays structured sections: Executive Brief, Key Trends, Operational Concerns, Management Recommendations.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`backend/app/services/ai_service.py`, `src/components/copilot/AICopilotDrawer.tsx`, `/api/dashboard/ai-summary`)

#### Story US-14: Amazon Cognito PKCE Managed Authentication
* **Story ID:** `US-14`
* **Role:** System Security Administrator (`ROLE-EXEC`)
* **User Story:** *As a security administrator, I want user authentication handled via Amazon Cognito OpenID Connect with PKCE authorization code flow, so that sensitive user credentials never touch client-side storage or insecure channels.*
* **Priority:** `Must Have (P0)`
* **Acceptance Criteria:**
  1. Unauthenticated users are gated by `MedOpsAuthGuard` and redirected to the Amazon Cognito hosted login portal.
  2. Authorization code exchange generates cryptographic `code_verifier` and `code_challenge` (SHA-256).
  3. Secure token storage in memory with session verification and clean logout redirection.
* **Implementation Status:** **VERIFIED / IMPLEMENTED** (`src/services/cognitoAuth.ts`, `src/context/AuthContext.tsx`, `src/config/cognitoConfig.ts`)
