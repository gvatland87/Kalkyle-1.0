import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { user } = await api.getMe();
      setUser(user);
    } catch (err) {
      api.setToken(null);
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
      const { token, user } = await api.login(email, password);
      api.setToken(token);
      setUser(user);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Innlogging feilet');
      return false;
    }
  };

  const register = async (email: string, password: string, name: string, company?: string) => {
    setError(null);
    try {
      const { token, user } = await api.register(email, password, name, company);
      api.setToken(token);
      setUser(user);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrering feilet');
      return false;
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { name?: string; company?: string; currentPassword?: string; newPassword?: string }) => {
    setError(null);
    try {
      const { user: updatedUser } = await api.updateMe(data);
      setUser(updatedUser);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oppdatering feilet');
      return false;
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
  };
}
