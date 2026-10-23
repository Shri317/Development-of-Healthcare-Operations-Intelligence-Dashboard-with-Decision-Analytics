# AI Copilot Drawer Workflow

This diagram visualizes the slide-over AI Copilot drawer interface (`src/components/copilot/AICopilotDrawer.tsx`).

```mermaid
flowchart TD
    %% USER ACTION
    subgraph USER_ACTION["1. USER ACTION"]
        OpenDrawer["User clicks 'Copilot' toggle button in Global Header<br/>(Available across all 20 modules)"]
        SelectChip["User clicks Quick Prompt Chip or enters custom question<br/>e.g. 'Identify top claim denial drivers'"]
    end

    %% REACT FRONTEND
    subgraph REACT_FRONTEND["2. REACT FRONTEND (AICopilotDrawer.tsx)"]
        ToggleState["setIsCopilotOpen(true)<br/>Slide-over animated drawer appears"]
        AppendQuery["Append user question to conversation state"]
        SetLoading["setLoading(true)"]
        CallAPI["queryAICopilot(queryText, selectedFacility)<br/>(src/services/apiService.ts)"]
    end

    %% API SERVICE
    subgraph API_SERVICE["3. API SERVICE LAYER"]
        Req["POST /api/copilot/query<br/>Body: { question, query, facility_id: selectedFacility }"]
        Auth["Attach Authorization: Bearer <token>"]
    end

    %% FASTAPI BACKEND
    subgraph FASTAPI_BACKEND["4. FASTAPI BACKEND & SERVICE"]
        RouteCopilot["@router.post('/query') (routes/copilot.py)"]
        ProcessQuery["process_copilot_query() (services/copilot_service.py)"]
        
        IntentRoute["Keyword Intent Routing:<br/>Compute verified domain telemetry first"]
        
        BedrockCall["Invoke Amazon Bedrock Nova Lite<br/>(With deterministic fallback on failure)"]
    end

    %% RESPONSE & UI
    subgraph RESPONSE_AND_UI["5. JSON RESPONSE & DRAWER RENDERING"]
        JSONRes["HTTP 200 JSON Response:<br/>{ question, answer, evidence: [...], bedrock_used, ai_explanation, ai_status }"]
        UpdateDrawer["Append AI response, setLoading(false)"]
        
        RenderThread["Render Slide-over Drawer Components:<br/>• Operational Answer Bubble<br/>• AI Model Badge (Nova Lite Active vs Deterministic Fallback)<br/>• Strategic Executive Summary<br/>• Interactive Telemetry Evidence Cards"]
        
        EvidenceClick["User clicks an Evidence Card -> triggers UI toast with metric detail"]
    end

    %% ERROR & FALLBACK
    subgraph ERROR_HANDLING["6. ERROR & FALLBACK HANDLING"]
        CatchErr["Catch network error -> Render inline message error bubble"]
    end

    %% CONNECTIONS
    OpenDrawer --> ToggleState
    ToggleState --> SelectChip
    SelectChip --> AppendQuery
    AppendQuery --> SetLoading
    SetLoading --> CallAPI
    CallAPI --> Req
    Req --> Auth
    Auth --> RouteCopilot
    RouteCopilot --> ProcessQuery
    ProcessQuery --> IntentRoute
    IntentRoute --> BedrockCall
    BedrockCall --> JSONRes
    JSONRes --> UpdateDrawer
    UpdateDrawer --> RenderThread
    RenderThread --> EvidenceClick

    CallAPI -. "Network Error" .-> CatchErr
```

---

## 📋 Execution Summary

* **Frontend Component**: [`src/components/copilot/AICopilotDrawer.tsx`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/src/components/copilot/AICopilotDrawer.tsx).
* **Activation**: Toggled globally via the `Header.tsx` Copilot action button, maintaining conversation state across module changes.
* **Backend Endpoint**: `POST /api/copilot/query`.
* **Visual Elements**: Animated slide-over sheet, suggestion query pills, conversational bubble history, live Bedrock/Fallback status indicators, and structured metric evidence cards.
