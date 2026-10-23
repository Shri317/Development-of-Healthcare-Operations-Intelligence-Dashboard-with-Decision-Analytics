# Amazon Cognito OAuth 2.0 PKCE Authentication Flow

This diagram visualizes the browser-public Proof Key for Code Exchange (PKCE) flow implemented in `src/services/cognitoAuth.ts` and `src/context/AuthContext.tsx`.

```mermaid
flowchart TD
    %% SUBGRAPH: USER & BROWSER
    subgraph USER_ACTION["USER ACTION & APP MOUNT"]
        UserMount["User opens Application in Browser"]
        CheckAuth{"AuthProvider mounts<br/>(src/context/AuthContext.tsx)"}
    end

    %% SUBGRAPH: LOCAL SESSION CHECK
    subgraph SESSION_EVALUATION["SESSION EVALUATION (sessionStorage)"]
        GetStoredSession["getStoredSession()<br/>Read 'medops_cognito_session_v1'"]
        HasSession{"Active session found?"}
        CheckExpiry{"Token expiring within 60s?<br/>(Date.now >= expiresAt - 60000)"}
        CallRefresh["refreshSession(currentSession)<br/>POST /oauth2/token (grant_type=refresh_token)"]
        RefreshSuccess{"Refresh succeeded?"}
        SetAuthUser["Set User & Token state<br/>isAuthenticated = true"]
        RenderDashboard["Render <MedOpsDashboard />"]
    end

    %% SUBGRAPH: PKCE CHALLENGE CREATION
    subgraph PKCE_INITIATION["PKCE CHALLENGE INITIATION (src/services/cognitoAuth.ts)"]
        GenVerifier["generateRandomString(64)<br/>Cryptographic code_verifier"]
        GenChallenge["generateCodeChallenge(verifier)<br/>SHA-256 Hash + Base64URL encode"]
        GenState["generateRandomString(32)<br/>CSRF state token"]
        StorePKCE["sessionStorage.setItem():<br/>'medops_cognito_pkce_verifier'<br/>'medops_cognito_pkce_state'"]
        RedirectHostedUI["window.location.assign()<br/>Redirect to Cognito /oauth2/authorize<br/>(client_id, code_challenge, S256, state)"]
    end

    %% SUBGRAPH: COGNITO HOSTED UI
    subgraph COGNITO_PORTAL["AMAZON COGNITO MANAGED LOGIN (us-east-1)"]
        CognitoLoginUI["User Authenticates via Cognito Hosted UI<br/>(Email / Password / MFA)"]
        CognitoRedirect["Cognito redirects back to redirect_uri<br/>?code=AUTH_CODE&state=STATE"]
    end

    %% SUBGRAPH: TOKEN EXCHANGE
    subgraph TOKEN_EXCHANGE["AUTHORIZATION CODE & TOKEN EXCHANGE"]
        CallbackDetect{"URL contains ?code= & ?state= ?"}
        HandleCallback["handleAuthCallback()<br/>(src/services/cognitoAuth.ts)"]
        ValidateState{"state matches stored PKCE state?"}
        CSRFError["Throw 'OAuth2 State CSRF validation failed'"]
        GetVerifier["Retrieve stored code_verifier from sessionStorage"]
        CleanPKCEStorage["Remove temporary PKCE keys from sessionStorage"]
        PostToken["POST to ${cognitoDomain}/oauth2/token<br/>Headers: application/x-www-form-urlencoded<br/>Body: grant_type=authorization_code, code, code_verifier"]
        CleanURL["window.history.replaceState()<br/>Strip ?code= from URL address bar"]
        ParseTokens["Receive JSON: id_token, access_token, refresh_token"]
        DecodeJWT["jwtDecode(id_token)<br/>Extract: sub, email, cognito:groups, username"]
        FormatRole["formatCognitoRole(groups)<br/>Map ADMIN -> Enterprise Administrator"]
        SaveSession["sessionStorage.setItem('medops_cognito_session_v1', session)"]
    end

    %% SUBGRAPH: ERROR HANDLING
    subgraph AUTH_ERROR_HANDLING["ERROR HANDLING"]
        AuthErrorScreen["Render <AuthErrorScreen /><br/>(Display reason + 'Retry Login' button)"]
    end

    %% CONNECTIONS
    UserMount --> CheckAuth
    CheckAuth --> CallbackDetect

    CallbackDetect -- "Yes (OAuth Return)" --> HandleCallback
    HandleCallback --> ValidateState
    ValidateState -- "State Mismatch" --> CSRFError --> AuthErrorScreen
    ValidateState -- "State Valid" --> GetVerifier
    GetVerifier --> CleanPKCEStorage
    CleanPKCEStorage --> PostToken
    PostToken --> CleanURL
    CleanURL --> ParseTokens
    ParseTokens --> DecodeJWT
    DecodeJWT --> FormatRole
    FormatRole --> SaveSession
    SaveSession --> SetAuthUser

    CallbackDetect -- "No (Standard Navigation)" --> GetStoredSession
    GetStoredSession --> HasSession
    HasSession -- "Session Exists" --> CheckExpiry
    CheckExpiry -- "Valid & Not Expiring" --> SetAuthUser
    CheckExpiry -- "Expiring Soon" --> CallRefresh
    CallRefresh --> RefreshSuccess
    RefreshSuccess -- "Success" --> SetAuthUser
    RefreshSuccess -- "Failed" --> GenVerifier

    HasSession -- "No Session" --> GenVerifier
    GenVerifier --> GenChallenge
    GenChallenge --> GenState
    GenState --> StorePKCE
    StorePKCE --> RedirectHostedUI
    RedirectHostedUI --> CognitoLoginUI
    CognitoLoginUI --> CognitoRedirect
    CognitoRedirect --> CallbackDetect

    SetAuthUser --> RenderDashboard
```

---

## 📋 Execution Summary

* **Public Client Safety**: Browser single-page applications cannot safeguard client secrets; this implementation uses **PKCE (Proof Key for Code Exchange)** with SHA-256 (`S256`).
* **Session Storage Isolation**: Tokens are stored in browser `sessionStorage` under `medops_cognito_session_v1`, keeping sessions tab-isolated and protected against long-term `localStorage` XSS persistence.
* **URL Sanitization**: Authorization codes are purged from the browser address bar immediately via `window.history.replaceState()` to prevent shoulder-surfing and history leakage.
* **Silent Refresh**: Prior to expiration (60s buffer), `refreshSession()` quietly swaps the refresh token at `/oauth2/token` for a fresh session without interrupting the user.
* **Role Derivation**: Decodes the Cognito ID token claims (`cognito:groups`) using `jwt-decode` and maps groups (`ADMIN`, `DOCTOR`, `BILLING`) to formatted enterprise roles.
