# Workflow Automation Engine Workflow

This diagram visualizes the live rule evaluation engine in `WorkflowAutomationEngine.tsx` and `backend/app/services/dashboard_service.py`.

```mermaid
flowchart TD
    %% USER ACTION
    subgraph USER_ACTION["1. USER ACTION"]
        UserNav["User selects 'Workflow Automation Engine' in Sidebar"]
        TriggerAction["User clicks 'Evaluate Rule' or 'Trigger Workflow Action'"]
    end

    %% REACT FRONTEND
    subgraph REACT_FRONTEND["2. REACT FRONTEND (WorkflowAutomationEngine.tsx)"]
        Mount["Component mounts with selectedFacility, selectedTimeframe"]
        SetLoading["setLoading(true), setError(null)"]
        CallAPI["fetchWorkflowAutomation(selectedFacility, selectedTimeframe)"]
        HandleToast["handleExecuteAction() triggers UI Notification Toast Banner"]
    end

    %% API SERVICE
    subgraph API_SERVICE["3. API SERVICE (src/services/apiService.ts)"]
        Req["GET /api/dashboard/workflow-automation?facility_id={fac}&timeframe={tf}"]
        Auth["Attach Authorization: Bearer <token>"]
    end

    %% FASTAPI BACKEND
    subgraph FASTAPI_BACKEND["4. FASTAPI ROUTE (backend/app/routes/dashboard.py)"]
        RouteWorkflow["@router.get('/workflow-automation')<br/>get_workflow(facility_id, timeframe, ...)"]
    end

    %% ANALYTICS ENGINE
    subgraph ANALYTICS_ENGINE["5. RULE EVALUATION ENGINE (dashboard_service.py)"]
        ServiceFunc["get_workflow_automation(facility_id, timeframe)"]
        LoadData["_load_table() loads:<br/>• inventory.csv<br/>• claims.csv<br/>• appointments.csv<br/>• emergency_visits.csv<br/>• quality_incidents.csv"]
        
        EvalRule1["Rule WF-01: Pharmacy Depletion Threshold<br/>Match: inventory[current_stock <= reorder_level]<br/>Count triggered records & generate PO trigger action"]
        
        EvalRule2["Rule WF-02: High-Value Claim Denial Alert<br/>Match: claims[claim_status == 'Denied' and claimed_amount > 100000]<br/>Count matches & route to clinical appeals specialist"]
        
        EvalRule3["Rule WF-03: ED Door-to-Doctor SLA Breach<br/>Match: emergency_visits[waiting_time_minutes > 30]<br/>Trigger clinical staffing surge protocol"]
        
        EvalRule4["Rule WF-04: Critical Incident CAPA Escalation<br/>Match: quality_incidents[severity == 'Critical']<br/>Require immediate clinical governance review"]
        
        BuildRuleOutput["Assemble Rules Array:<br/>Rule ID, Name, Category, Triggered Count, Status, Action Type, Execution History Log"]
    end

    %% AWS DATA LAYER
    subgraph AWS_DATA_SOURCES["6. AWS DATA LAYER"]
        Cache{"_TABLE_CACHE Hit?"}
        AthenaQuery["Amazon Athena Serverless SQL<br/>SELECT * FROM inventory, claims, emergency_visits"]
        S3Direct["Direct S3 Read Fallback<br/>s3://medical-operations-bharath-2026/raw/"]
    end

    %% RESPONSE & UI
    subgraph RESPONSE_AND_UI["7. JSON RESPONSE & FRONTEND RENDERING"]
        JSONRes["HTTP 200 JSON Response:<br/>{ rules: [...], executionLogs: [...], activeRuleCount, triggeredRuleCount }"]
        UpdateState["setData(res), setLoading(false)"]
        RenderCards["Render Automation KPI Stat Cards:<br/>• Monitored Automation Rules Count<br/>• Actively Triggered Threshold Exceptions<br/>• Auto-Mitigation Success Rate %<br/>• Mean Time to Exception Resolution"]
        RenderRules["Render Interactive Rule Cards:<br/>• Condition Logic · Triggered Record Badges<br/>• Action Type: Dispatch Notification / Generate Restock PO<br/>• 'Re-evaluate Rule' Action Button"]
    end

    %% ERROR & FALLBACK
    subgraph ERROR_HANDLING["8. ERROR & FALLBACK HANDLING"]
        CatchErr["Catch API error -> setError(err.message)"]
        ShowError["Render Workflow Automation Error Notice"]
    end

    %% CONNECTIONS
    UserNav --> Mount
    Mount --> SetLoading
    SetLoading --> CallAPI
    CallAPI --> Req
    Req --> Auth
    Auth --> RouteWorkflow
    RouteWorkflow --> ServiceFunc
    ServiceFunc --> LoadData
    LoadData --> Cache
    Cache -- "Miss" --> AthenaQuery
    AthenaQuery -- "Fail" --> S3Direct
    AthenaQuery -- "Success" --> EvalRule1
    S3Direct --> EvalRule1
    Cache -- "Hit" --> EvalRule1

    EvalRule1 --> EvalRule2 --> EvalRule3 --> EvalRule4
    EvalRule4 --> BuildRuleOutput
    BuildRuleOutput --> JSONRes
    JSONRes --> UpdateState
    UpdateState --> RenderCards & RenderRules
    RenderRules --> TriggerAction
    TriggerAction --> HandleToast

    CallAPI -. "Network Error" .-> CatchErr --> ShowError
```

---

## 📋 Execution Summary

* **Frontend Component**: [`src/components/modules/WorkflowAutomationEngine.tsx`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/src/components/modules/WorkflowAutomationEngine.tsx).
* **API Endpoint**: `GET /api/dashboard/workflow-automation?facility_id={fac}&timeframe={tf}`.
* **Backend Handler**: `get_workflow_automation()` in [`backend/app/services/dashboard_service.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/services/dashboard_service.py#L2030-L2150).
* **Rule Engine**: Evaluates four operational threshold conditions across inventory, claims, emergency visits, and clinical quality incidents against active data tables.
* **Action Realism**: Action buttons trigger feedback via toast banners (`handleExecuteAction`) rather than mutating third-party transactional hospital systems.
