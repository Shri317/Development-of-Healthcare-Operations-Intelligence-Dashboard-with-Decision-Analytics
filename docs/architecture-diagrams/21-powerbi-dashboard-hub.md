# Executive Analytics Hub (Power BI Hub) Workflow

This diagram visualizes the multi-domain aggregation workflow in `PowerBIDashboardHub.tsx`.

```mermaid
flowchart TD
    %% USER ACTION
    subgraph USER_ACTION["1. USER ACTION"]
        UserNav["User clicks 'Executive Analytics Hub' in Sidebar<br/>or toggles 'BI Hub' button in Global Header"]
    end

    %% REACT FRONTEND
    subgraph REACT_FRONTEND["2. REACT FRONTEND (PowerBIDashboardHub.tsx)"]
        Mount["Component mounts with selectedFacility, selectedTimeframe"]
        SetLoading["setLoading(true), setError(null)"]
        ParallelDispatch["Promise.all([<br/>  fetchExecutiveSummary(selectedFacility, selectedTimeframe),<br/>  fetchBillingIntelligence(selectedFacility, selectedTimeframe),<br/>  fetchClaimsIntelligence(selectedFacility, selectedTimeframe),<br/>  fetchEmergencyCriticalIntelligence(selectedFacility, selectedTimeframe)<br/>])"]
    end

    %% API SERVICE
    subgraph API_SERVICE["3. API SERVICE (src/services/apiService.ts)"]
        Req1["GET /api/dashboard/summary"]
        Req2["GET /api/dashboard/billing"]
        Req3["GET /api/dashboard/claims"]
        Req4["GET /api/dashboard/emergency-critical"]
        Auth["Attach Authorization: Bearer <token>"]
    end

    %% FASTAPI BACKEND
    subgraph FASTAPI_BACKEND["4. FASTAPI BACKEND ROUTING (backend/app/routes/dashboard.py)"]
        Route1["@router.get('/summary')"]
        Route2["@router.get('/billing')"]
        Route3["@router.get('/claims')"]
        Route4["@router.get('/emergency-critical')"]
    end

    %% ANALYTICS ENGINE
    subgraph ANALYTICS_ENGINE["5. MULTI-DOMAIN ANALYTICS (dashboard_service.py)"]
        ExecSummary["get_executive_summary()"]
        BillingIntel["get_billing_intelligence()"]
        ClaimsIntel["get_claims_intelligence()"]
        EmergencyIntel["get_emergency_critical_intelligence()"]
        
        TablesScanned["Scan S3/Athena Tables in parallel:<br/>admissions, billing, claims, emergency_visits, departments"]
    end

    %% RESPONSE & UI
    subgraph RESPONSE_AND_UI["6. JSON RESPONSES & BI RENDERING"]
        CompositeData["Aggregate Responses into Unified Business Intelligence State"]
        UpdateState["setSummary(res[0]), setBilling(res[1]), setClaims(res[2]), setEmergency(res[3])<br/>setLoading(false)"]
        
        RenderBIHeader["Render Executive BI Control Ribbon:<br/>• Cross-Domain Filter Slicers (Facility, Timeframe, Specialty)<br/>• Export Dataset (CSV / PDF Digest Trigger)"]
        
        RenderBIPanels["Render BI Visualization Tiles:<br/>• Tile 1: Executive KPI Scorecard (Admissions, Occupancy, Margin)<br/>• Tile 2: Financial Realization (Gross Invoiced vs Net Collected)<br/>• Tile 3: Revenue Cycle Denial Exposure (Denial % by Payer)<br/>• Tile 4: Emergency Throughput & Triage Acuity Distribution"]
    end

    %% ERROR & FALLBACK
    subgraph ERROR_HANDLING["7. ERROR & FALLBACK HANDLING"]
        CatchErr["Catch network error -> setError(err.message)"]
        ShowError["Render BI Hub Analytics Error Box"]
    end

    %% CONNECTIONS
    UserNav --> Mount
    Mount --> SetLoading
    SetLoading --> ParallelDispatch
    ParallelDispatch --> Req1 & Req2 & Req3 & Req4
    Req1 & Req2 & Req3 & Req4 --> Auth
    Auth --> Route1 & Route2 & Route3 & Route4
    Route1 --> ExecSummary
    Route2 --> BillingIntel
    Route3 --> ClaimsIntel
    Route4 --> EmergencyIntel

    ExecSummary & BillingIntel & ClaimsIntel & EmergencyIntel --> TablesScanned
    TablesScanned --> CompositeData
    CompositeData --> UpdateState
    UpdateState --> RenderBIHeader --> RenderBIPanels

    ParallelDispatch -. "Fetch Exception" .-> CatchErr --> ShowError
```

---

## 📋 Execution Summary

* **Frontend Component**: [`src/components/modules/PowerBIDashboardHub.tsx`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/src/components/modules/PowerBIDashboardHub.tsx).
* **API Endpoints Aggregated**:
  1. `GET /api/dashboard/summary`
  2. `GET /api/dashboard/billing`
  3. `GET /api/dashboard/claims`
  4. `GET /api/dashboard/emergency-critical`
* **Architecture**: Implements a client-side composite BI workspace, executing parallel asynchronous requests across multiple hospital operational domains to deliver unified executive visibility.
