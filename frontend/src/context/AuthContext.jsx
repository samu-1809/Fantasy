import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../services/api';

// 🎯 CORREGIDO: Crear el contexto correctamente
const AuthContext = createContext();

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
      const token = localStorage.getItem('accessToken') || localStorage.getItem('access_token');
      
      console.log('🔄 AuthProvider iniciando, token encontrado:', !!token);
      
      if (token) {
        try {
          console.log('🔄 Cargando usuario desde token...');
          const userData = await getCurrentUser();
          console.log('✅ Usuario cargado:', userData);
          setUser(userData);
          setEquipo(userData.equipo || null);
        } catch (err) {
          console.error('❌ Error al cargar usuario:', err);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('access_token');
        }
      }
      setLoading(false);
      console.log('✅ AuthProvider inicializado');
    };

    loadUser();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      console.log('🔐 Iniciando login...');
      const data = await loginUser(username, password);

      console.log('✅ Login exitoso, datos recibidos:', data);

      // 🎯 CORREGIDO: Manejar diferentes formatos de respuesta
      if (data.tokens) {
        // Formato legacy
        localStorage.setItem('accessToken', data.tokens.access);
        if (data.tokens.refresh) {
          localStorage.setItem('refreshToken', data.tokens.refresh);
        }
      } else if (data.access) {
        // Nuevo formato
        localStorage.setItem('accessToken', data.access);
      }

      // 🎯 CORREGIDO: Guardar usuario y equipo
      const userData = data.user || data;
      setUser(userData);
      setEquipo(data.equipo || null);

      console.log('✅ Estado actualizado - usuario:', userData.username);

      return data;
    } catch (err) {
      console.error('❌ Error en login:', err);
      setError(err.message || 'Error al iniciar sesión');
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      console.log('📝 Iniciando registro...');
      
      const data = await registerUser({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        password2: userData.password2,
        first_name: userData.first_name,
        last_name: userData.last_name
      });

      console.log('✅ Registro exitoso, datos:', data);

      // 🎯 CORREGIDO: Manejar token de forma consistente
      if (data.access) {
        localStorage.setItem('accessToken', data.access);
      } else if (data.tokens && data.tokens.access) {
        localStorage.setItem('accessToken', data.tokens.access);
      }

      // Guardar usuario
      const userDataResponse = data.user || data;
      setUser(userDataResponse);
      setEquipo(data.equipo || null);

      return data;
    } catch (err) {
      console.error('❌ Error en registro:', err);
      setError(err.message || 'Error al registrarse');
      throw err;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await logoutUser();
    } catch (err) {
      console.error('❌ Error al hacer logout:', err);
    } finally {
      // Limpiar estado local siempre
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('access_token');
      setUser(null);
      setEquipo(null);
      console.log('✅ Sesión cerrada');
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

  console.log('🔄 AuthProvider renderizado, estado:', {
    user: user ? user.username : 'null',
    isAuthenticated: !!user,
    loading
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};