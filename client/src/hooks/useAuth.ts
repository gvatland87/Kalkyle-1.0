import { useState, useEffect, useCallback } from 'react';
import api, { setToken, getToken } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (err) {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      setToken(response.data.token);
      setUser(response.data.user);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Innlogging feilet');
      return false;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', { email, password, name });
      setToken(response.data.token);
      setUser(response.data.user);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registrering feilet');
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };
}
