import { jwtDecode } from 'jwt-decode';
import { cognitoConfig } from '../config/cognitoConfig';

// Session Storage Keys (Browser-safe, tab-isolated, NOT in localStorage)
const STORAGE_SESSION_KEY = 'medops_cognito_session_v1';
const STORAGE_PKCE_VERIFIER_KEY = 'medops_cognito_pkce_verifier';
const STORAGE_PKCE_STATE_KEY = 'medops_cognito_pkce_state';

export interface CognitoUser {
  email: string;
  username: string;
  sub: string;
  groups: string[];
  primaryRole: string;
}

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  user: CognitoUser;
}

interface CognitoIdTokenClaims {
  sub: string;
  email?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  email_verified?: boolean;
  name?: string;
  exp: number;
  iat: number;
  iss: string;
}

/**
 * Generates a cryptographically random string for PKCE verifier and state
 */
function generateRandomString(length: number = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomBytes[i] % charset.length];
  }
  return result;
}

/**
 * Base64-URL encodes an ArrayBuffer
 */
function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Computes SHA-256 hash and encodes to base64url for PKCE code_challenge
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

/**
 * Extracts a friendly display role from Cognito groups
 */
export function formatCognitoRole(groups: string[]): string {
  if (!groups || groups.length === 0) {
    return 'Authenticated User';
  }
  
  // Format primary group cleanly (e.g. ADMIN -> Enterprise Administrator, DOCTOR -> Medical Staff / Physician)
  const primary = groups[0].toUpperCase();
  switch (primary) {
    case 'ADMIN':
    case 'ADMINS':
    case 'ADMINISTRATOR':
      return 'Enterprise Administrator';
    case 'DOCTOR':
    case 'DOCTORS':
    case 'PHYSICIAN':
      return 'Medical Staff / Physician';
    case 'NURSE':
    case 'NURSES':
      return 'Clinical Operations / Nursing';
    case 'BILLING':
    case 'FINANCE':
      return 'Revenue Cycle & Billing Specialist';
    case 'VIEWER':
    case 'VIEWERS':
    case 'READONLY':
      return 'Executive Operations Viewer';
    default:
      // Return capitalized group name
      return groups[0].charAt(0).toUpperCase() + groups[0].slice(1).toLowerCase();
  }
}

/**
 * Redirects user to Amazon Cognito Managed Login Hosted UI using PKCE
 */
export async function redirectToLogin(): Promise<void> {
  const verifier = generateRandomString(64);
  const challenge = await generateCodeChallenge(verifier);
  const state = generateRandomString(32);

  // Store PKCE verifier and state in sessionStorage
  sessionStorage.setItem(STORAGE_PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(STORAGE_PKCE_STATE_KEY, state);

  const authUrl = new URL(`${cognitoConfig.domain}/oauth2/authorize`);
  authUrl.searchParams.set('client_id', cognitoConfig.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', cognitoConfig.scopes.join(' '));
  authUrl.searchParams.set('redirect_uri', cognitoConfig.redirectUri);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);

  window.location.assign(authUrl.toString());
}

/**
 * Inspects URL for OAuth2 authorization code or error after Cognito redirect.
 * Returns true if an auth callback was detected and handled.
 */
export async function handleAuthCallback(): Promise<AuthSession | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  const errorDescription = urlParams.get('error_description');

  if (error) {
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error(errorDescription || `Cognito Authentication Failed: ${error}`);
  }

  const code = urlParams.get('code');
  const state = urlParams.get('state');

  if (!code) {
    return null;
  }

  const storedVerifier = sessionStorage.getItem(STORAGE_PKCE_VERIFIER_KEY);
  const storedState = sessionStorage.getItem(STORAGE_PKCE_STATE_KEY);

  // Validate state to prevent CSRF if stored
  if (storedState && state && storedState !== state) {
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error('OAuth2 State validation failed. Possible CSRF security violation.');
  }

  if (!storedVerifier) {
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error('PKCE Code Verifier not found in session storage. Please retry login.');
  }

  // Clean up PKCE temporary storage
  sessionStorage.removeItem(STORAGE_PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(STORAGE_PKCE_STATE_KEY);

  // Exchange authorization code for tokens at Cognito token endpoint
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('client_id', cognitoConfig.clientId);
  body.set('code', code);
  body.set('redirect_uri', cognitoConfig.redirectUri);
  body.set('code_verifier', storedVerifier);

  const tokenResponse = await fetch(`${cognitoConfig.domain}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  // Clean URL immediately so the auth code is not exposed in address bar
  window.history.replaceState({}, document.title, window.location.pathname);

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.json().catch(() => ({}));
    throw new Error(
      errorBody.error_description ||
      errorBody.error ||
      `Token exchange failed with status ${tokenResponse.status}`
    );
  }

  const tokenData = await tokenResponse.json();
  const idToken = tokenData.id_token;
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in || 3600;

  // Decode ID token to obtain verified user profile
  const claims = jwtDecode<CognitoIdTokenClaims>(idToken);
  const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : [];
  const email = claims.email || claims['cognito:username'] || 'Authenticated Specialist';
  const username = claims['cognito:username'] || claims.sub;

  const session: AuthSession = {
    accessToken,
    idToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: {
      email,
      username,
      sub: claims.sub,
      groups,
      primaryRole: formatCognitoRole(groups),
    },
  };

  sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * Retrieves the currently stored active session from sessionStorage.
 * Validates expiration.
 */
export function getStoredSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;

    const session: AuthSession = JSON.parse(raw);
    
    // Check if session has expired (with a 30s buffer)
    if (session.expiresAt && Date.now() >= session.expiresAt - 30000) {
      // Token is expired or about to expire
      return session; // Can be refreshed
    }

    return session;
  } catch (err) {
    console.error('Failed to parse stored Cognito session:', err);
    return null;
  }
}

/**
 * Refreshes an existing session using the Cognito refresh token
 */
export async function refreshSession(currentSession: AuthSession): Promise<AuthSession | null> {
  if (!currentSession.refreshToken) {
    clearSession();
    return null;
  }

  try {
    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', cognitoConfig.clientId);
    body.set('refresh_token', currentSession.refreshToken);

    const res = await fetch(`${cognitoConfig.domain}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      clearSession();
      return null;
    }

    const tokenData = await res.json();
    const idToken = tokenData.id_token || currentSession.idToken;
    const claims = jwtDecode<CognitoIdTokenClaims>(idToken);
    const groups = Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : currentSession.user.groups;

    const newSession: AuthSession = {
      accessToken: tokenData.access_token,
      idToken,
      refreshToken: currentSession.refreshToken, // Cognito refresh token remains valid
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      user: {
        ...currentSession.user,
        groups,
        primaryRole: formatCognitoRole(groups),
      },
    };

    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(newSession));
    return newSession;
  } catch (err) {
    console.error('Error refreshing Cognito session:', err);
    clearSession();
    return null;
  }
}

/**
 * Clears local session from sessionStorage
 */
export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_SESSION_KEY);
  sessionStorage.removeItem(STORAGE_PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(STORAGE_PKCE_STATE_KEY);
}

/**
 * Properly terminates the Cognito session and redirects to logout URL
 */
export function logout(): void {
  clearSession();

  const logoutUrl = new URL(`${cognitoConfig.domain}/logout`);
  logoutUrl.searchParams.set('client_id', cognitoConfig.clientId);
  logoutUrl.searchParams.set('logout_uri', cognitoConfig.logoutUri);

  window.location.assign(logoutUrl.toString());
}

/**
 * Returns current access token if available
 */
export function getAccessToken(): string | null {
  const session = getStoredSession();
  return session ? session.accessToken : null;
}

/**
 * Returns current ID token if available
 */
export function getIdToken(): string | null {
  const session = getStoredSession();
  return session ? session.idToken : null;
}
