import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('qm_token'));
  const [loading, setLoading] = useState(true);

  // Restore authenticated user on app load
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('qm_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.auth.me();
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem('qm_token');
          setUser(null);
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        localStorage.removeItem('qm_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem('qm_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (userData) => {
    return await api.auth.register(userData);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('qm_token');
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUserProfile,
        isAuthenticated: !!user,
        isBuyer: user?.role === 'buyer',
        isOwner: user?.role === 'owner',
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
