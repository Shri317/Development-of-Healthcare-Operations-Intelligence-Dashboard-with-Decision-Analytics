# Security & Governance Workflow

This diagram visualizes the health probing, IAM permission verification, and compliance posture workflow in `SecurityGovernance.tsx`.

```mermaid
flowchart TD
    %% USER ACTION
    subgraph USER_ACTION["1. USER ACTION"]
        UserNav["User clicks 'Security & Governance' in Sidebar"]
    end

    %% REACT FRONTEND
    subgraph REACT_FRONTEND["2. REACT FRONTEND (SecurityGovernance.tsx)"]
        Mount["Component mounts<br/>setLoading(true), setError(null)"]
        CallHealthAPI["fetchHealthStatus()<br/>(src/services/apiService.ts)"]
    end

    %% API SERVICE
    subgraph API_SERVICE["3. API SERVICE LAYER"]
        Req["GET /api/health"]
        Auth["Attach Authorization: Bearer <token>"]
    end

    %% FASTAPI BACKEND
    subgraph FASTAPI_BACKEND["4. FASTAPI ROUTE (backend/app/routes/health.py)"]
        RouteHealth["@router.get('')<br/>get_health_status()"]
        ProbeS3["check_s3_bucket_status()<br/>(backend/app/aws/s3.py)"]
        ProbeGlue["fetch_glue_tables()<br/>(backend/app/aws/glue.py)"]
    end

    %% AWS CLOUD TELEMETRY
    subgraph AWS_PROBES["5. LIVE AWS HEALTH TELEMETRY"]
        S3Call["s3.list_objects_v2(<br/>Bucket='medical-operations-bharath-2026', MaxKeys=50<br/>)"]
        GlueCall["glue.get_tables(<br/>DatabaseName='medical_operations_db'<br/>)"]
        CheckAthenaBedrock["Verify Athena Workgroup & Bedrock Nova Lite configuration"]
    end

    %% RESPONSE & UI
    subgraph RESPONSE_AND_UI["6. JSON RESPONSE & FRONTEND RENDERING"]
        JSONRes["HTTP 200 JSON Response:<br/>{ status: 'online', service: '...', region: 'ap-south-2',<br/>  glueDatabase: '...', s3Bucket: '...',<br/>  awsServices: { s3: 'connected', glue: 'connected', athena: 'ready', bedrock: 'ready' } }"]
        UpdateState["setHealth(res), setLoading(false)"]
        
        RenderCloudStatus["Render Real-Time AWS Cloud Perimeter Grid:<br/>• Amazon S3 Data Lake (Bucket Status, Key Count)<br/>• AWS Glue Data Catalog (Database Name, 41 Registered Tables)<br/>• Amazon Athena Query Engine (Workgroup Status)<br/>• Amazon Bedrock Runtime (Nova Lite Model Status)"]
        
        RenderIAMPolicy["Render Least-Privilege IAM Policy Visualizer:<br/>Statements from policy-v2.json (S3, Athena, Glue, Bedrock)"]
        
        RenderHIPAAMatrix["Render HIPAA / DISHA Security Governance Matrix:<br/>• TLS 1.3 In-Transit Encryption · S3 Server-Side AES-256<br/>• Role-Based Access Control (RBAC) & Audit Trails"]
    end

    %% ERROR & FALLBACK
    subgraph ERROR_HANDLING["7. ERROR & FALLBACK HANDLING"]
        CatchErr["Catch connection error -> setHealth({ status: 'degraded' })"]
        ShowDegraded["Render Cloud Service Warning Banner with diagnostics"]
    end

    %% CONNECTIONS
    UserNav --> Mount
    Mount --> CallHealthAPI
    CallHealthAPI --> Req
    Req --> Auth
    Auth --> RouteHealth
    RouteHealth --> ProbeS3 & ProbeGlue
    ProbeS3 --> S3Call
    ProbeGlue --> GlueCall
    S3Call & GlueCall --> CheckAthenaBedrock
    CheckAthenaBedrock --> JSONRes
    JSONRes --> UpdateState
    UpdateState --> RenderCloudStatus --> RenderIAMPolicy --> RenderHIPAAMatrix

    CallHealthAPI -. "Endpoint Unreachable" .-> CatchErr --> ShowDegraded
```

---

## 📋 Execution Summary

* **Frontend Component**: [`src/components/modules/SecurityGovernance.tsx`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/src/components/modules/SecurityGovernance.tsx).
* **API Endpoint**: `GET /api/health`.
* **Backend Route**: [`backend/app/routes/health.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/routes/health.py).
* **AWS Helpers**: [`backend/app/aws/s3.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/aws/s3.py) and [`backend/app/aws/glue.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/aws/glue.py).
* **Governance Visualized**: Live connection status of the AWS data perimeter, rendered IAM policy statements ([`policy-v2.json`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/policy-v2.json)), and healthcare regulatory audit rules.
