/**
 * Amazon Cognito Configuration for MedOps Intelligence
 * 
 * Safe, browser-public OAuth2 / OIDC settings.
 * Client Secret is NOT used (Authorization Code Grant with PKCE is public-client safe).
 */

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  domain: string;
  clientId: string;
  redirectUri: string;
  logoutUri: string;
  scopes: string[];
}

// Clean trailing slash from domain if present
const rawDomain = (
  import.meta.env.VITE_COGNITO_DOMAIN || 
  'https://us-east-1fs4pnkogh.auth.us-east-1.amazoncognito.com'
).trim().replace(/\/+$/, '');

// Ensure domain starts with https://
const formattedDomain = rawDomain.startsWith('http://') || rawDomain.startsWith('https://')
  ? rawDomain
  : `https://${rawDomain}`;

export const cognitoConfig: CognitoConfig = {
  region: (import.meta.env.VITE_COGNITO_REGION || 'us-east-1').trim(),
  userPoolId: (import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_fs4PnK0gh').trim(),
  domain: formattedDomain,
  clientId: (import.meta.env.VITE_COGNITO_CLIENT_ID || '241i1ehcindfsu1d77953or31u').trim(),
  redirectUri: (
    import.meta.env.VITE_COGNITO_REDIRECT_URI || 
    'https://development-of-healthcare-operation.vercel.app/'
  ).trim(),
  logoutUri: (
    import.meta.env.VITE_COGNITO_LOGOUT_URI || 
    'https://development-of-healthcare-operation.vercel.app/'
  ).trim(),
  scopes: (import.meta.env.VITE_COGNITO_SCOPES || 'email openid phone')
    .trim()
    .split(/\s+/)
    .filter(Boolean),
};
