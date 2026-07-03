import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (authService.isAuthenticated()) {
        try {
          const res = await authService.getMe();
          setUser(res.user);
          setIsAuthenticated(true);
        } catch {
          authService.logout();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };
    verify();
  }, []);

  const login = useCallback(async (mssid, password, role) => {
    const res = await authService.login(mssid, password, role);
    setUser(res.user);
    setIsAuthenticated(true);
    return res;
  }, []);

  const register = useCallback(async (mssid, password, confirmPassword, role = 'student', mssBatch, collegeName, year) => {
    const res = await authService.register(mssid, password, confirmPassword, role, mssBatch, collegeName, year);
    setUser(res.user);
    setIsAuthenticated(true);
    return res;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = { user, loading, login, register, logout, isAuthenticated };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
