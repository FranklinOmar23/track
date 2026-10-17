import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

const leerUsuarioGuardado = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Dato guardado dañado: mejor pedir el perfil de nuevo que romper la app
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(leerUsuarioGuardado);

  const guardarUsuario = (usuario) => {
    localStorage.setItem(USER_KEY, JSON.stringify(usuario));
    setUser(usuario);
  };

  // Al abrir la app se refresca el perfil: si el admin cambió permisos o viajes, se aplican sin volver a entrar
  useEffect(() => {
    if (!token) return;
    api.fetchMe().then(guardarUsuario).catch(() => {});
  }, [token]);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    guardarUsuario(data.usuario);
    setToken(data.token);
    return data.usuario;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  /** ¿El usuario actual tiene este permiso? (editar, pagos, crear_viajes, reportes, actividad) */
  const puede = useCallback((permiso) => !!user && (user.esAdmin || !!user.permisos?.[permiso]), [user]);

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    esAdmin: !!user?.esAdmin,
    puede,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
