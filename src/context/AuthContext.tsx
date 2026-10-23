import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  type CognitoUser, 
  type AuthSession,
  getStoredSession, 
  handleAuthCallback, 
  redirectToLogin, 
  logout as cognitoLogout, 
  refreshSession,
  clearSession
} from '../services/cognitoAuth';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CognitoUser | null;
  error: string | null;
  accessToken: string | null;
  idToken: string | null;
  login: () => void;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [tokens, setTokens] = useState<{ accessToken: string; idToken: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hasCode = urlParams.has('code');
      const hasError = urlParams.has('error');

      // 1. If returning from Cognito Managed Login redirect
      if (hasCode || hasError) {
        const session = await handleAuthCallback();
        if (session) {
          setUser(session.user);
          setTokens({ accessToken: session.accessToken, idToken: session.idToken });
          setIsLoading(false);
          return;
        }
      }

      // 2. Check for existing active session in sessionStorage
      const existingSession = getStoredSession();
      if (existingSession) {
        // If token will expire within 60 seconds, attempt a background refresh
        if (Date.now() >= existingSession.expiresAt - 60000) {
          const refreshed = await refreshSession(existingSession);
          if (refreshed) {
            setUser(refreshed.user);
            setTokens({ accessToken: refreshed.accessToken, idToken: refreshed.idToken });
            setIsLoading(false);
            return;
          }
          // Refresh failed, proceed to unauthenticated redirect
        } else {
          setUser(existingSession.user);
          setTokens({ accessToken: existingSession.accessToken, idToken: existingSession.idToken });
          setIsLoading(false);
          return;
        }
      }

      // 3. User is unauthenticated: trigger redirect to Cognito Managed Login
      setUser(null);
      setTokens(null);
      
      // Automatic redirection to Cognito Managed Login
      await redirectToLogin();
    } catch (err: any) {
      console.error('Cognito Authentication Error:', err);
      setError(err?.message || 'An unexpected error occurred during Cognito authentication.');
      clearSession();
      setUser(null);
      setTokens(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = useCallback(() => {
    setIsLoading(true);
    setError(null);
    redirectToLogin().catch((err) => {
      setError(err?.message || 'Failed to initiate login redirect.');
      setIsLoading(false);
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setTokens(null);
    cognitoLogout();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const contextValue = useMemo<AuthContextType>(() => ({
    isAuthenticated: !!user && !!tokens,
    isLoading,
    user,
    error,
    accessToken: tokens?.accessToken || null,
    idToken: tokens?.idToken || null,
    login,
    logout,
    clearError,
  }), [user, tokens, isLoading, error, login, logout, clearError]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
