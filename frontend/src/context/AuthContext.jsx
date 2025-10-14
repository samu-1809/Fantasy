// context/AuthContext.jsx - VERSIÓN MEJORADA CON SINCRONIZACIÓN
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
  const [authChecked, setAuthChecked] = useState(false); // 🆕 Nuevo estado para sincronización

  // 🆕 Función sincronizada para establecer autenticación
  const setAuth = (userData, authenticated) => {
    console.log('🔄 AuthContext: Actualizando estado de autenticación', {
      user: userData?.username,
      authenticated
    });
    
    setUser(userData);
    setEquipo(userData?.equipo || null);
    
    if (authenticated) {
      setAuthChecked(true);
    }
    
    // Forzar re-render inmediato
    setTimeout(() => {
      setLoading(false);
    }, 0);
  };

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
          setAuth(userData, true); // 🆕 Usar función sincronizada
        } catch (err) {
          console.error('❌ Error al cargar usuario:', err);
          localStorage.removeItem('access_token');
          setAuth(null, false); // 🆕 Usar función sincronizada
        }
      } else {
        console.log('🔐 AuthProvider: No hay token, usuario no autenticado');
        setAuth(null, false); // 🆕 Usar función sincronizada
      }
    };

    loadUser();
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      console.log('🔐 AuthContext: Iniciando login...');
      
      const data = await loginUser(username, password);
      console.log('✅ AuthContext: Login exitoso, datos recibidos:', data);

      if (data.access) {
        localStorage.setItem('access_token', data.access);
        
        // 🆕 Obtener siempre datos reales del usuario
        try {
          console.log('🔄 AuthContext: Obteniendo datos reales del usuario...');
          const userData = await getCurrentUser();
          console.log('✅ AuthContext: Datos reales del usuario:', userData);
          
          // 🆕 Usar función sincronizada
          setAuth(userData, true);
          
          console.log('✅ AuthContext: Estado actualizado - usuario real:', userData.username);
          
          return { 
            success: true,
            user: userData, 
            access: data.access, 
            equipo: userData.equipo 
          };
          
        } catch (userError) {
          console.error('❌ AuthContext: Error obteniendo datos reales:', userError);
          
          // 🆕 Si hay datos en la respuesta del login, usarlos
          if (data.user) {
            console.log('🔄 AuthContext: Usando datos del login response:', data.user);
            setAuth(data.user, true);
            return { 
              success: true,
              user: data.user, 
              access: data.access, 
              equipo: data.equipo 
            };
          } else {
            throw new Error('No se pudieron obtener los datos del usuario');
          }
        }
      }

      throw new Error('No se recibió token de acceso');
      
    } catch (err) {
      console.error('❌ AuthContext: Error en login:', err);
      const errorMessage = err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      setAuth(null, false); // 🆕 Usar función sincronizada
      return { success: false, error: errorMessage };
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      console.log('📝 AuthContext: Iniciando registro...');
      
      const data = await registerUser({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        password2: userData.password2,
        first_name: userData.first_name,
        last_name: userData.last_name
      });

      console.log('✅ AuthContext: Registro exitoso, datos:', data);

      if (data.access) {
        localStorage.setItem('access_token', data.access);
        
        if (data.user) {
          setAuth(data.user, true); // 🆕 Usar función sincronizada
        } else {
          // Obtener usuario si no viene en la respuesta
          const userDataResponse = await getCurrentUser();
          setAuth(userDataResponse, true); // 🆕 Usar función sincronizada
        }
      }

      return { success: true, data };
    } catch (err) {
      console.error('❌ AuthContext: Error en registro:', err);
      setError(err.message || 'Error al registrarse');
      setAuth(null, false); // 🆕 Usar función sincronizada
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 AuthContext: Cerrando sesión...');
      await logoutUser();
    } catch (err) {
      console.error('❌ AuthContext: Error al hacer logout:', err);
    } finally {
      localStorage.removeItem('access_token');
      setAuth(null, false); // 🆕 Usar función sincronizada
      console.log('✅ AuthContext: Sesión cerrada');
    }
  };

  const value = {
    user,
    equipo,
    loading,
    error,
    authChecked, // 🆕 Exportar nuevo estado
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  console.log('🔄 AuthProvider renderizado, estado:', {
    user: user ? user.username : 'null',
    equipo: equipo ? 'SÍ' : 'NO',
    isAuthenticated: !!user,
    loading,
    authChecked
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook complementario para funcionalidades específicas de auth
export const useAuthData = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const user = await getCurrentUser();
          setUserData(user);
        }
      } catch (err) {
        setError('Error cargando datos de usuario');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  return {
    userData,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      const loadUserData = async () => {
        try {
          const user = await getCurrentUser();
          setUserData(user);
        } catch (err) {
          setError('Error cargando datos de usuario');
        } finally {
          setLoading(false);
        }
      };
      loadUserData();
    }
  };
};