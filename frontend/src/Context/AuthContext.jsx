import { createContext, useContext, useState } from 'react';
import * as api from '../utils/api';

const TOKEN_KEY = 'rmt_token';
const USER_KEY = 'rmt_user';

const AuthContext = createContext();

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const login = async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    setToken(data.token);
    setUser(data.usuario);
    return data.usuario;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
