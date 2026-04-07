import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('stockai-token');
    const isGuest = localStorage.getItem('stockai-guest');

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      api.get('/auth/me')
        .then(res => {
          if (res.data && !res.data.error) {
            setUser(res.data);
            if (res.data.settings) {
              localStorage.setItem('stockai-settings', JSON.stringify(res.data.settings));
            }
          } else {
            localStorage.removeItem('stockai-token');
            delete api.defaults.headers.common['Authorization'];
          }
        })
        .catch(() => {
          localStorage.removeItem('stockai-token');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else if (isGuest) {
      // Restore guest session
      setUser({
        id: 'guest',
        email: 'guest@investai.local',
        name: 'Guest',
        isGuest: true,
        settings: {},
      });
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const _handleAuthResponse = (res) => {
    if (res.data.error) throw new Error(res.data.error);
    if (res.data.pending_verification) {
      return res.data;
    }
    const { token, user: userData, settings } = res.data;
    localStorage.setItem('stockai-token', token);
    localStorage.removeItem('stockai-guest'); // Clear guest mode on real login
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    if (settings) localStorage.setItem('stockai-settings', JSON.stringify(settings));
    return userData;
  };

  const _handleAuthError = (err) => {
    const msg = err.response?.data?.error || err.message || 'Something went wrong';
    throw new Error(msg);
  };

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      return _handleAuthResponse(res);
    } catch (err) { _handleAuthError(err); }
  };

  const register = async (email, password, name) => {
    try {
      const res = await api.post('/auth/register', { email, password, name });
      return _handleAuthResponse(res);
    } catch (err) { _handleAuthError(err); }
  };

  const verifyEmail = async (email, code) => {
    try {
      const res = await api.post('/auth/verify-email', { email, code });
      return _handleAuthResponse(res);
    } catch (err) { _handleAuthError(err); }
  };

  const resendVerification = async (email) => {
    try {
      const res = await api.post('/auth/resend-verification', { email });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    } catch (err) { _handleAuthError(err); }
  };

  const googleLogin = async (credential) => {
    try {
      const res = await api.post('/auth/google', { credential });
      return _handleAuthResponse(res);
    } catch (err) { _handleAuthError(err); }
  };

  const continueAsGuest = () => {
    const guestUser = {
      id: 'guest',
      email: 'guest@investai.local',
      name: 'Guest',
      isGuest: true,
      settings: {},
    };
    localStorage.setItem('stockai-guest', 'true');
    setUser(guestUser);
    return guestUser;
  };

  const logout = () => {
    localStorage.removeItem('stockai-token');
    localStorage.removeItem('stockai-guest');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateProfile = async (name) => {
    if (!user || user.isGuest) return;
    try {
      await api.put('/auth/profile', { name });
      setUser(prev => ({ ...prev, name }));
    } catch {}
  };

  const saveSettings = async (settings) => {
    localStorage.setItem('stockai-settings', JSON.stringify(settings));
    setUser(prev => prev ? { ...prev, settings } : prev);
    if (user && !user.isGuest) {
      try {
        await api.put('/auth/settings', { settings });
      } catch {}
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, verifyEmail, resendVerification,
      googleLogin, continueAsGuest, logout, updateProfile, saveSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
