# MedOps Intelligence: Architecture & Workflow Diagram Index

Welcome to the visual technical architecture catalog for the **Medical Operations Intelligence & Automation System (MedOps Intelligence)**.

This directory contains standalone, self-explanatory architecture and workflow diagrams for every feature and cloud service flow in the project.

---

## 🗺️ Master Diagram Index

### Core System & Cloud Infrastructure
* [00. Overall System Architecture](00-overall-system-architecture.md) — Multi-tier client, Vercel edge rewrite, FastAPI backend, and AWS data/AI cloud services.
* [01. Amazon Cognito OAuth 2.0 PKCE Authentication](01-cognito-pkce-authentication.md) — Browser-public PKCE flow, SHA-256 challenges, token exchange, and sessionStorage isolation.
* [02. Keyless Workload Identity (Vercel OIDC -> AWS STS)](02-vercel-oidc-aws-credentials.md) — Zero static IAM keys: dynamic OIDC token exchange via `AssumeRoleWithWebIdentity`.
* [03. Resilient 4-Tier Data Retrieval Hierarchy](03-resilient-data-retrieval-hierarchy.md) — In-memory Cache -> Amazon Athena -> S3 Bucket Direct Read -> Local CSV Fallback -> Empty DataFrame.

---

### Executive & Core Operational Workflows
* [04. Executive Command Center](04-executive-command-center.md) — Cross-facility operational KPI rollups and comparative performance matrix.
* [05. Patient Operations](05-patient-operations.md) — Inpatient admissions census, average length of stay (LOS), and patient flow.
* [06. Doctor & Staff Intelligence](06-doctor-staff-intelligence.md) — Physician roster utilization, clinical hours, and overtime load analytics.
* [07. Emergency & Critical Operations](07-emergency-critical-operations.md) — ED wait times, door-to-doctor metrics, triage acuity (ESI 1–5), and ICU transfers.

---

### Revenue Cycle & Financial Workflows
* [08. Billing & Revenue Intelligence](08-billing-revenue-intelligence.md) — Gross billed revenue, net collections, accounts receivable (A/R), and payer mix.
* [09. Insurance Claims Automation](09-insurance-claims-automation.md) — Payer denial rate tracking, denial reasons Pareto, and exposed hospital revenue.
* [10. Medical Coding & Documentation](10-medical-coding-documentation.md) — DRG / ICD-10 coding turnaround velocity, unbilled records, and documentation lag.
* [11. Financial Intelligence (P&L)](11-financial-intelligence.md) — Monthly operating profit, operating margins, budget variance, and expense breakdowns.

---

### Clinical, Quality & Supply Workflows
* [12. Laboratory & Diagnostics](12-laboratory-diagnostics.md) — Specimen test turnaround times (TAT), order volumes, and equipment diagnostics.
* [13. Pharmacy & Inventory](13-pharmacy-inventory.md) — Medication stockouts, reorder threshold alerts, and depletion tracking.
* [14. Quality & Compliance](14-quality-compliance.md) — Clinical incident severity matrix, regulatory audits, and active CAPA lifecycle.
* [15. Patient Experience](15-patient-experience.md) — CSAT ratings, Net Promoter Score (NPS), sentiment distribution, and grievance tracking.
* [16. Supply Chain & Vendors](16-supply-chain-vendors.md) — Vendor risk ratings, purchase order fulfillment, and delivery SLA adherence.

---

### AI, Automation & Governance Workflows
* [17. AI Predictive Intelligence](17-ai-predictive-intelligence.md) — 7-day encounter forecast via NumPy polynomial trend regression (`polyfit`) and risk scoring.
* [18. Workflow Automation Engine](18-workflow-automation-engine.md) — Live rule condition evaluation across clinical, supply, and financial thresholds.
* [19. Automation Pipeline Visualizer](19-automation-pipeline-visualizer.md) — End-to-end telemetry monitor: Ingestion -> Query -> Decision -> Action.
* [20. Medical Ops AI Agent Tab](20-ai-copilot-bedrock-tab.md) — Full-screen Bedrock Nova Lite synthesis grounded in deterministic domain metrics with failover.
* [21. Executive Analytics Hub (Power BI Hub)](21-powerbi-dashboard-hub.md) — Composite multi-domain executive workspace aggregating 4 core backend endpoints.
* [22. Security & Governance](22-security-governance.md) — AWS infrastructure connectivity probe and HIPAA audit compliance rules.
* [23. Enterprise Integrations Hub](23-integrations-hub.md) — Live cloud storage telemetry alongside staging connectors (Epic, Cerner, AthenaHealth, Twilio).

---

### Auxiliary Drawers & Modals
* [24. AI Copilot Drawer](24-ai-copilot-drawer.md) — Global slide-over chat drawer with suggestion prompts and evidence cards.
* [25. Enterprise Multi-Department Drilldown](25-enterprise-drilldown-modal.md) — Granular department drilldown matrix across clinical specialties.

---

## 🔍 How to Read Each Diagram

Every diagram follows a standardized vertical flowchart:

```
[USER ACTION]
      ↓
[REACT FRONTEND (Component & State)]
      ↓
[API SERVICE LAYER (src/services/apiService.ts)]
      ↓
[FASTAPI BACKEND ROUTE (backend/app/routes/*)]
      ↓
[ANALYTICS ENGINE (backend/app/services/*)]
      ↓
[AWS DATA SOURCES (Athena / Glue / S3 / Cache)]
      ↓
[DATA TRANSFORMATION & FORMULAS]
      ↓
[JSON RESPONSE]
      ↓
[FRONTEND RENDERING (Recharts / Stat Cards)]
      ↓
[ERROR & FALLBACK BRANCHES]
```
