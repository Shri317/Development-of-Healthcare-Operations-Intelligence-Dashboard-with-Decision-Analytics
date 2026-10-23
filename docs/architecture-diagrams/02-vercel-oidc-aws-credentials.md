# Keyless Workload Identity Flow (Vercel OIDC -> AWS STS)

This diagram visualizes how the FastAPI backend securely communicates with AWS services without storing static IAM access keys in cloud environment variables.

```mermaid
flowchart TD
    %% SUBGRAPH: INCOMING REQUEST
    subgraph INCOMING_HTTP["1. INCOMING HTTP REQUEST"]
        FrontendRequest["Browser sends HTTP request to /api/*"]
        VercelEdge["Vercel Edge Platform attaches workload JWT:<br/>Header: 'x-vercel-oidc-token'"]
    end

    %% SUBGRAPH: FASTAPI MIDDLEWARE
    subgraph BACKEND_MIDDLEWARE["2. FASTAPI OIDC MIDDLEWARE (backend/app/main.py)"]
        CaptureMiddleware["capture_vercel_oidc_token() Middleware"]
        SetContext["set_vercel_oidc_token(token)<br/>Stores token in contextvars.ContextVar"]
        CallNext["Execute FastAPI Route (await call_next(request))"]
        ResetContext["reset_vercel_oidc_token(token_context)<br/>Cleanup in finally block"]
    end

    %% SUBGRAPH: SESSION RESOLUTION
    subgraph BOTO3_SESSION_RESOLVER["3. BOTO3 SESSION PROVIDER (backend/app/aws/session.py)"]
        GetSessionCall["get_boto3_session(region_name)"]
        CheckExplicit{"Explicit AWS_ACCESS_KEY_ID<br/>in Settings?"}
        UseExplicitCreds["Use static AWS_ACCESS_KEY_ID &<br/>AWS_SECRET_ACCESS_KEY"]
        CallOIDCExchange["_get_vercel_oidc_credentials()"]
        ReadToken["Read VERCEL_OIDC_TOKEN env or ContextVar"]
        ReadRole["Read AWS_ROLE_ARN env"]
        HasTokenAndRole{"OIDC Token & Role ARN present?"}
    end

    %% SUBGRAPH: AWS STS
    subgraph AWS_STS_FEDERATION["4. AWS STS OPENID CONNECT FEDERATION"]
        InitSTS["Initialize boto3.client('sts', region='ap-south-2')"]
        AssumeRoleCall["sts.assume_role_with_web_identity(<br/>RoleArn=role_arn,<br/>RoleSessionName='vercel-medical-operations',<br/>WebIdentityToken=oidc_token,<br/>DurationSeconds=3600<br/>)"]
        STSIssuerValidation{"AWS STS validates Vercel JWT issuer<br/>via https://oidc.vercel.com/.well-known/openid-configuration"}
        STSCredentials[("AWS STS Returns Temporary Credentials:<br/>• AccessKeyId<br/>• SecretAccessKey<br/>• SessionToken<br/>• Duration: 1 Hour")]
    end

    %% SUBGRAPH: CLIENT CREATION
    subgraph AWS_SERVICE_CLIENTS["5. BOTO3 CLIENT DISPATCH"]
        InitSession["boto3.Session(region_name, aws_access_key_id, aws_secret_access_key, aws_session_token)"]
        AthenaClient["get_athena_client() -> boto3 Athena Client"]
        S3Client["get_s3_client() -> boto3 S3 Client"]
        GlueClient["get_glue_client() -> boto3 Glue Client"]
        BedrockClient["get_bedrock_client() -> boto3 Bedrock-Runtime Client"]
    end

    %% SUBGRAPH: FALLBACK
    subgraph LOCAL_CHAIN_FALLBACK["6. LOCAL DEVELOPER FALLBACK"]
        DefaultChain["Normal boto3 credential chain<br/>(~/.aws/credentials or IAM Task Role)"]
    end

    %% CONNECTIONS
    FrontendRequest --> VercelEdge
    VercelEdge --> CaptureMiddleware
    CaptureMiddleware --> SetContext
    SetContext --> CallNext
    CallNext --> GetSessionCall
    CallNext --> ResetContext

    GetSessionCall --> CheckExplicit
    CheckExplicit -- "Yes (Local .env override)" --> UseExplicitCreds --> InitSession
    CheckExplicit -- "No (Production Default)" --> CallOIDCExchange

    CallOIDCExchange --> ReadToken
    ReadToken --> ReadRole
    ReadRole --> HasTokenAndRole

    HasTokenAndRole -- "Yes (Running on Vercel)" --> InitSTS
    InitSTS --> AssumeRoleCall
    AssumeRoleCall --> STSIssuerValidation
    STSIssuerValidation --> STSCredentials
    STSCredentials --> InitSession

    HasTokenAndRole -- "No (Local development)" --> DefaultChain
    DefaultChain --> InitSession

    InitSession --> AthenaClient
    InitSession --> S3Client
    InitSession --> GlueClient
    InitSession --> BedrockClient
```

---

## 📋 Execution Summary

* **Zero Static Secrets**: The cloud repository contains zero persistent AWS IAM access keys, eliminating credential leakage risks.
* **ContextVar Isolation**: The `capture_vercel_oidc_token` middleware uses Python's `contextvars.ContextVar` to safely isolate tokens per asynchronous request coroutine.
* **STS Web Identity Federation**: AWS STS validates Vercel's cryptographically signed JWT token against Vercel's OIDC discovery endpoint and assumes the specified IAM role.
* **Short-Lived Credentials**: Temporary credentials expire automatically after 3,600 seconds (1 hour).
* **Multi-Tier Fallback**: If OIDC is absent, `session.py` transparently falls back to local developer credentials (`~/.aws/credentials`).
