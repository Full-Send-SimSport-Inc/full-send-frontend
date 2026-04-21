import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

// Define the role weights for hierarchy checks
const ROLE_WEIGHTS = {
  'administrator': 40,
  'executive_committee': 30,
  'committee': 20,
  'member': 10,
  'guest': 0
};

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

  /**
   * Helper to determine if the logged-in user has authority over a target member
   * @param {Object} targetMember - The member record being viewed/edited
   * @returns {Boolean}
   */
  const canManage = (targetMember) => {
    if (!user || !targetMember) return false;

    // 1. Guardrail: You can NEVER use "God Mode" on yourself.
    // If IDs match, you are a regular user subject to strict validation.
    if (parseInt(user.id) === parseInt(targetMember.wp_user_id || targetMember.id)) {
      return false; 
    }

    // 2. Extract highest roles for comparison
    // We assume user.roles is an array from WP (e.g. ['committee', 'member'])
    const userRole = user.roles?.find(r => ROLE_WEIGHTS[r]) || 'member';
    const targetRole = targetMember.roles?.find(r => ROLE_WEIGHTS[r]) || 'member';

    // 3. Hierarchy Check
    // Administrator (40) can manage everyone else.
    // Exec (30) can manage Committee (20) and Members (10).
    // Committee (20) can ONLY manage Members (10).
    return ROLE_WEIGHTS[userRole] > ROLE_WEIGHTS[targetRole];
  };

  const login = async (email, password) => {
    try {
      await checkLoginStatus();
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = window.appParams?.logoutUrl || '/wp-login.php?action=logout';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth, 
      checkLoginStatus, 
      refreshUser: checkLoginStatus, // Alias for onboarding completion
      canManage, // The new hierarchy helper
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);