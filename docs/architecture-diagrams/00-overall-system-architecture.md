# Overall System Architecture

This diagram visualizes the complete multi-tier deployment of the Medical Operations Intelligence & Automation Command System across the browser, Vercel edge runtime, and AWS cloud services.

```mermaid
flowchart TD
    %% TIER 1: CLIENT TIER
    subgraph CLIENT_TIER["1. CLIENT TIER (Browser Runtime)"]
        BrowserUser["User Accesses Application (Vercel Domain)"]
        AuthGuard{"MedOpsAuthGuard<br/>(src/App.tsx)"}
        CognitoUI["Amazon Cognito Hosted UI<br/>(us-east-1 OAuth 2.0 PKCE)"]
        SessionStorage[("sessionStorage<br/>(JWT ID & Access Tokens)")]
        HeaderNav["Global Header Controls<br/>(Facility & Timeframe State)"]
        SidebarNav["Sidebar Navigation<br/>(20 Active Modules)"]
        ActiveModuleView["Mounted Module View<br/>(React 19 + Recharts + Tailwind CSS)"]
        APIService["apiFetch() Wrapper<br/>(src/services/apiService.ts)"]
    end

    %% TIER 2: HOSTING & EDGE REWRITE TIER
    subgraph VERCEL_EDGE["2. HOSTING & EDGE ROUTING (vercel.json)"]
        EdgeRouter{"Vercel Edge Rewrite Engine"}
        StaticRoute["/(.*) -> Frontend Static Assets (Vite dist/)"]
        BackendRoute["/api/(.*) -> FastAPI Backend Service"]
    end

    %% TIER 3: FASTAPI BACKEND TIER
    subgraph FASTAPI_BACKEND["3. FASTAPI BACKEND TIER (backend/app/)"]
        FastAPIMain["FastAPI Entry Point (app.main:app)"]
        OIDCMiddleware["capture_vercel_oidc_token Middleware<br/>(Captures x-vercel-oidc-token into ContextVar)"]
        CORSMiddleware["CORSMiddleware (allow_origins=['*'])"]
        RouterDispatch{"FastAPI Router Dispatch"}
        RouteDashboard["Dashboard Router (/api/dashboard/*)<br/>(routes/dashboard.py)"]
        RouteCopilot["Copilot Router (/api/copilot/query)<br/>(routes/copilot.py)"]
        RouteHealth["Health Router (/api/health)<br/>(routes/health.py)"]
        RouteAthenaGlue["Athena & Glue Diagnostic Routers"]
        DashboardService["Dashboard Analytics Engine (3,360 LOC)<br/>(services/dashboard_service.py)"]
        CopilotService["Copilot Intent & Grounding Engine<br/>(services/copilot_service.py)"]
        SessionManager["AWS Session Provider<br/>(aws/session.py)"]
    end

    %% TIER 4: AWS CLOUD TIER
    subgraph AWS_CLOUD["4. AWS CLOUD SERVICES (ap-south-1 / ap-south-2 / us-east-1)"]
        STSClient["AWS STS (AssumeRoleWithWebIdentity)<br/>(Exchanges Vercel OIDC for 1h Temp Creds)"]
        GlueCatalog[("AWS Glue Data Catalog<br/>(DB: medical_operations_db · 41 Tables)")]
        AthenaEngine["Amazon Athena Query Engine<br/>(ap-south-2 Workgroup: primary)"]
        S3RawData[("Amazon S3 Data Lake (ap-south-1)<br/>s3://medical-operations-bharath-2026/raw/")]
        S3QueryResults[("Amazon S3 Results Bucket<br/>s3://medical-operations-athena-results-bharath-2026/")]
        BedrockRuntime["Amazon Bedrock Runtime (us-east-1)<br/>Model: amazon.nova-lite-v1:0"]
    end

    %% FLOW CONNECTIONS
    BrowserUser --> AuthGuard
    AuthGuard -- "Not Authenticated" --> CognitoUI
    CognitoUI -- "OAuth Code Callback & Token Exchange" --> SessionStorage
    SessionStorage --> AuthGuard
    AuthGuard -- "Authenticated" --> HeaderNav
    HeaderNav --> SidebarNav
    SidebarNav --> ActiveModuleView
    ActiveModuleView --> APIService

    APIService -- "HTTP Request with Bearer Token" --> EdgeRouter
    EdgeRouter -- "Static Request" --> StaticRoute
    EdgeRouter -- "API Request (/api/*)" --> BackendRoute
    BackendRoute --> FastAPIMain

    FastAPIMain --> OIDCMiddleware
    OIDCMiddleware --> CORSMiddleware
    CORSMiddleware --> RouterDispatch

    RouterDispatch --> RouteDashboard
    RouterDispatch --> RouteCopilot
    RouterDispatch --> RouteHealth
    RouterDispatch --> RouteAthenaGlue

    RouteDashboard --> DashboardService
    RouteCopilot --> CopilotService
    RouteHealth --> SessionManager

    DashboardService --> SessionManager
    CopilotService --> DashboardService
    CopilotService --> SessionManager

    SessionManager -- "1. Exchange Vercel OIDC" --> STSClient
    STSClient -- "Temporary IAM Credentials" --> SessionManager

    SessionManager -- "Execute SQL" --> AthenaEngine
    AthenaEngine -- "Read Table Schema" --> GlueCatalog
    AthenaEngine -- "Scan CSV Objects" --> S3RawData
    AthenaEngine -- "Write Query Output" --> S3QueryResults

    SessionManager -- "Direct CSV Read Fallback" --> S3RawData
    SessionManager -- "Invoke Nova Lite LLM" --> BedrockRuntime
```

---

## 📋 Execution Summary

* **Frontend**: React 19 single-page application built with Vite (`src/main.tsx`, `src/App.tsx`).
* **Routing**: Managed by Vercel edge rewrites in [`vercel.json`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/vercel.json), sending `/api/(.*)` to the Python backend and `/(.*)` to static Vite files.
* **Backend**: FastAPI running at [`backend/app/main.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/main.py) with request-scoped OIDC token capture middleware.
* **Workload Identity**: No static keys in production; [`backend/app/aws/session.py`](file:///D:/Development-of-Healthcare-Operations-Intelligence-Dashboard-with-Decision-Analytics/backend/app/aws/session.py) uses AWS STS `AssumeRoleWithWebIdentity` to exchange Vercel's identity token for 1-hour AWS credentials.
* **AWS Services**: Amazon Athena executes serverless SQL queries on Glue database `medical_operations_db` over S3, while Bedrock runs `amazon.nova-lite-v1:0` in `us-east-1`.
