import { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar usuario al iniciar si hay token
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          setEquipo(userData.equipo);
        } catch (err) {
          console.error('Error al cargar usuario:', err);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      const data = await loginUser(username, password);

      // 🆕 NUEVO: Solo guardar access token en localStorage
      // Refresh token está en httpOnly cookie (más seguro)
      if (data.tokens) {
        // Legacy response (RegisterView anterior)
        localStorage.setItem('accessToken', data.tokens.access);
        if (data.tokens.refresh) {
          localStorage.setItem('refreshToken', data.tokens.refresh);
        }
      } else if (data.access) {
        // Nueva response (auth_views con cookies)
        localStorage.setItem('accessToken', data.access);
      }

      // Guardar usuario y equipo
      setUser(data.user);
      setEquipo(data.equipo);

      return data;
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      throw err;
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const data = await registerUser(username, email, password);

      // 🆕 NUEVO: Solo guardar access token en localStorage
      // Refresh token está en httpOnly cookie
      if (data.access) {
        localStorage.setItem('accessToken', data.access);
      } else if (data.tokens?.access) {
        // Legacy fallback
        localStorage.setItem('accessToken', data.tokens.access);
      }

      // Guardar usuario
      setUser(data.user);

      return data;
    } catch (err) {
      setError(err.message || 'Error al registrarse');
      throw err;
    }
  };

  const logout = async () => {
    try {
      // 🆕 Llamar al endpoint de logout para blacklistear el token
      await logoutUser();
    } catch (err) {
      console.error('Error al hacer logout:', err);
    } finally {
      // Limpiar estado local siempre, incluso si la petición falla
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setEquipo(null);
    }
  };

  const value = {
    user,
    equipo,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
