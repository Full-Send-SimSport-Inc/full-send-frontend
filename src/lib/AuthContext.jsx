import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      // Use our base44 client to ensure Nonce and Cookies are sent
      const userData = await base44.get('/me');
      
      if (userData && userData.authenticated) {
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Standard WP AJAX login or JWT - usually simpler to redirect to wp-login
      // but if you have a custom endpoint, call it here.
      // For now, we rely on the WP login cookie.
      await checkLoginStatus();
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // Redirect to the actual WordPress logout URL
    window.location.href = window.appParams?.logoutUrl || '/wp-login.php?action=logout';
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, checkLoginStatus, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);