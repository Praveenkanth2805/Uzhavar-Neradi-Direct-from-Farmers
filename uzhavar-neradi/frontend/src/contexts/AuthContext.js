import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load user on mount (from sessionStorage)
  useEffect(() => {
    const token = sessionStorage.getItem('access');
    if (token) {
      api.get('/users/profile/')
        .then(res => setUser(res.data))
        .catch(() => {
          sessionStorage.removeItem('access');
          sessionStorage.removeItem('refresh');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // in AuthContext.js
const login = async (email, password) => {
  try {
    const res = await api.post('/users/login/', { email, password });
    if (res.data.error) {
      setError(res.data.error);
      return null; // return null to indicate failure
    }
    sessionStorage.setItem('access', res.data.access);
    sessionStorage.setItem('refresh', res.data.refresh);
    setUser(res.data.user);
    setError('');
    return res.data.user; // return the user object
  } catch (err) {
    setError(err.response?.data?.error || 'Login failed');
    return null;
  }
};

  const logout = () => {
    sessionStorage.removeItem('access');
    sessionStorage.removeItem('refresh');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);