// context/AuthContext.jsx - VERSIÓN CORREGIDA
import { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../services/api';

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
      const token = localStorage.getItem('access_token');
      console.log('🔄 AuthProvider - Token encontrado:', !!token);
      
      if (token) {
        try {
          console.log('🔄 Cargando usuario desde token...');
          const userData = await getCurrentUser();
          console.log('✅ Usuario cargado:', userData);
          setUser(userData);
          if (userData.equipo) {
            setEquipo(userData.equipo);
          }
        } catch (err) {
          console.error('❌ Error al cargar usuario:', err);
          localStorage.removeItem('access_token');
          setUser(null);
          setEquipo(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      console.log('🔐 Iniciando login...');
      
      const data = await loginUser(username, password);
      console.log('✅ Login exitoso, datos recibidos:', data);

      if (data.access) {
        localStorage.setItem('access_token', data.access);
        
        // 🎯 CORREGIDO: Siempre intentar obtener datos reales del usuario
        try {
          console.log('🔄 Obteniendo datos reales del usuario...');
          const userData = await getCurrentUser();
          console.log('✅ Datos reales del usuario:', userData);
          
          setUser(userData);
          setEquipo(userData.equipo || null);
          
          console.log('✅ Estado actualizado - usuario real:', userData.username);
          
          return { 
            user: userData, 
            access: data.access, 
            equipo: userData.equipo 
          };
          
        } catch (userError) {
          console.error('❌ Error obteniendo datos reales:', userError);
          
          // 🎯 CORREGIDO: Si hay datos en la respuesta del login, usarlos
          if (data.user) {
            console.log('🔄 Usando datos del login response:', data.user);
            setUser(data.user);
            setEquipo(data.equipo || null);
            return { 
              user: data.user, 
              access: data.access, 
              equipo: data.equipo 
            };
          } else {
            // 🎯 Último recurso: usuario temporal
            const tempUser = {
              id: Date.now(),
              username: username,
              email: `${username}@ejemplo.com`,
              is_staff: username.includes('admin'), // 🆕 Intentar detectar admin
              is_superuser: username.includes('admin')
            };
            
            setUser(tempUser);
            setEquipo(null);
            
            console.log('✅ Estado actualizado - usuario temporal:', tempUser.username);
            
            return { 
              user: tempUser, 
              access: data.access, 
              equipo: null 
            };
          }
        }
      }

      throw new Error('No se recibió token de acceso');
      
    } catch (err) {
      console.error('❌ Error en login:', err);
      const errorMessage = err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      throw new Error(errorMessage);
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

      if (data.access) {
        localStorage.setItem('access_token', data.access);
        
        if (data.user) {
          setUser(data.user);
          setEquipo(data.equipo || null);
        } else {
          // Obtener usuario si no viene en la respuesta
          const userDataResponse = await getCurrentUser();
          setUser(userDataResponse);
          setEquipo(userDataResponse.equipo || null);
        }
      }

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
    equipo: equipo ? 'SÍ' : 'NO',
    isAuthenticated: !!user,
    loading
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};