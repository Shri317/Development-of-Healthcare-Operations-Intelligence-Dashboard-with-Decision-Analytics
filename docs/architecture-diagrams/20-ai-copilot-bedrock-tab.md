# Medical Operations AI Agent Tab Workflow

This diagram visualizes the complete execution flow of the **Dedicated AI Copilot Tab** (`src/components/modules/MedicalOpsAIAgentTab.tsx`), including Amazon Bedrock Nova Lite invocation and deterministic analytics failover.

```mermaid
flowchart TD
    %% USER ACTION
    subgraph USER_ACTION["1. USER ACTION"]
        UserNav["User selects 'Medical Operations AI Agent' in Sidebar"]
        SubmitQuestion["User types question into prompt bar & clicks Send<br/>e.g. 'What is our current claim denial rate across facilities?'"]
    end

    %% REACT FRONTEND
    subgraph REACT_FRONTEND["2. REACT FRONTEND (MedicalOpsAIAgentTab.tsx)"]
        AppendUserMsg["Append user question to message thread"]
        SetLoading["setLoading(true), setCopilotState('processing')"]
        CallAPI["queryAICopilot(queryText, selectedFacility)"]
    end

    %% API SERVICE
    subgraph API_SERVICE["3. API SERVICE LAYER (src/services/apiService.ts)"]
        Req["POST /api/copilot/query<br/>Body: { question: queryText, query: queryText, facility_id: fac }"]
        Auth["apiFetch() injects Authorization: Bearer <token>"]
    end

    %% FASTAPI BACKEND
    subgraph FASTAPI_BACKEND["4. FASTAPI ROUTE (backend/app/routes/copilot.py)"]
        RouteCopilot["@router.post('/query')<br/>Validates question is not empty"]
    end

    %% COPILOT SERVICE: INTENT ROUTING
    subgraph INTENT_ROUTING["5. INTENT ROUTING & DETERMINISTIC ANALYTICS (copilot_service.py)"]
        ProcessQuery["process_copilot_query(user_query, facility_id)"]
        CheckKeywords{"Evaluate Query Keywords"}
        
        RoutePharmacy["['medicine', 'inventory', 'stock', 'pharmacy']<br/>-> get_pharmacy_inventory_intelligence()"]
        RouteClaims["['denial', 'denied', 'claim', 'payer']<br/>-> get_claims_intelligence()"]
        RouteBilling["['revenue', 'billed', 'billing', 'ar', 'profit']<br/>-> get_billing_intelligence()"]
        RouteSupply["['supplier', 'vendor', 'purchase order', 'po']<br/>-> get_supply_chain_vendors()"]
        RouteQuality["['quality', 'incident', 'capa', 'compliance']<br/>-> get_quality_compliance()"]
        RouteStaff["['doctor', 'physician', 'staff', 'workload']<br/>-> get_doctor_staff_intelligence()"]
        RouteLab["['lab', 'test', 'diagnostic', 'turnaround', 'tat']<br/>-> get_laboratory_intelligence()"]
        RouteEmergency["['emergency', 'ed wait', 'length of stay', 'los']<br/>-> get_patient_ops_intelligence()"]
        RouteDefault["Default / General Operations<br/>-> get_executive_summary()"]

        BuildFactualGrounding["Build Deterministic Telemetry Package:<br/>• Direct Answer String<br/>• Structured Evidence Array [{ metric, value, detail }]<br/>• Computational Domain & Data Source (Athena / S3 / CSV)<br/>• Mathematical Methodology Description"]
    end

    %% AMAZON BEDROCK LLM
    subgraph BEDROCK_INVOCATION["6. AMAZON BEDROCK INVOCATION (backend/app/aws/bedrock.py)"]
        BuildPrompt["Construct Strict Bounding Prompt:<br/>'Answer based STRICTLY on the following verified metrics...<br/>Direct Answer: ... Evidence: ... Method: ...<br/>Provide concise executive operational summary. Do NOT invent data.'"]
        
        GetBedrockClient["get_bedrock_client() via AWS STS temporary credentials"]
        
        InvokeModel["bedrock.invoke_model(<br/>modelId='amazon.nova-lite-v1:0',<br/>body={ messages: [{ role: 'user', content: [{ text: prompt }] }],<br/>       inferenceConfig: { maxTokens: 1000 } }<br/>)"]
        
        BedrockResult{"Bedrock Call Status?"}
        ParseNovaText["Parse res_json['output']['message']['content'][0]['text']<br/>bedrock_used = True<br/>ai_status = 'Amazon Bedrock: Active (amazon.nova-lite-v1:0)'"]
        
        CatchBedrockError["Catch ResourceNotFound / AccessDenied / Expired / Quota error:<br/>bedrock_used = False<br/>ai_status = 'Amazon Bedrock: Standby / Fallback Active'"]
        
        BuildFallback["ai_explanation = 'Deterministic Analytics Mode: Query resolved directly<br/>from verified telemetry... Foundation model is in standby.'"]
    end

    %% RESPONSE & UI
    subgraph RESPONSE_AND_UI["7. JSON RESPONSE & FRONTEND RENDERING"]
        JSONRes["HTTP 200 JSON Response:<br/>{ question, answer, data_source, domain, evidence: [...],<br/>  method, bedrock_used, ai_explanation, ai_status }"]
        UpdateUI["Append Assistant Response to Thread, setLoading(false)"]
        RenderDirectAnswer["Display Verified Operational Answer"]
        RenderAIBadge["Render AI Model Status Badge:<br/>• Bedrock Active (Purple Sparkles) OR<br/>• Deterministic Fallback Mode (Amber Shield)"]
        RenderAIExplanation["Display Executive Strategic Takeaway (Bedrock Summary or Fallback)"]
        RenderEvidence["Render Structured Telemetry Evidence Cards with Metric Values"]
    end

    %% CONNECTIONS
    UserNav --> SubmitQuestion
    SubmitQuestion --> AppendUserMsg
    AppendUserMsg --> SetLoading
    SetLoading --> CallAPI
    CallAPI --> Req
    Req --> Auth
    Auth --> RouteCopilot
    RouteCopilot --> ProcessQuery

    ProcessQuery --> CheckKeywords
    CheckKeywords --> RoutePharmacy & RouteClaims & RouteBilling & RouteSupply & RouteQuality & RouteStaff & RouteLab & RouteEmergency & RouteDefault

    RoutePharmacy & RouteClaims & RouteBilling & RouteSupply & RouteQuality & RouteStaff & RouteLab & RouteEmergency & RouteDefault --> BuildFactualGrounding

    BuildFactualGrounding --> BuildPrompt
    BuildPrompt --> GetBedrockClient
    GetBedrockClient --> InvokeModel
    InvokeModel --> BedrockResult

    BedrockResult -- "Success" --> ParseNovaText
    BedrockResult -- "Exception / Expired" --> CatchBedrockError
    CatchBedrockError --> BuildFallback

    ParseNovaText --> JSONRes
    BuildFallback --> JSONRes

    JSONRes --> UpdateUI
    UpdateUI --> RenderDirectAnswer --> RenderAIBadge --> RenderAIExplanation --> RenderEvidence
```

---

## 📋 Execution Summary

* **Frontend Component**: [`src/components/modules/MedicalOpsAIAgentTab.tsx`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/src/components/modules/MedicalOpsAIAgentTab.tsx).
* **API Endpoint**: `POST /api/copilot/query`.
* **Backend Controller**: [`backend/app/routes/copilot.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/routes/copilot.py#L14-L21).
* **Business Logic**: [`backend/app/services/copilot_service.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/services/copilot_service.py#L31-L366).
* **AWS Client**: [`backend/app/aws/bedrock.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/aws/bedrock.py#L9-L65).
* **Configured Model**: `amazon.nova-lite-v1:0` in `us-east-1`.
* **Zero Hallucination Guarantee**: Bedrock is never asked to perform raw database querying or mathematical calculations; deterministic Python analytics runs first, providing structured factual evidence that the LLM summarizes.
* **Deterministic Failover**: If Bedrock encounters timeouts, network interruptions, or expired credentials, `bedrock_used` flips to `false` and the user receives verified deterministic figures without crashing.
