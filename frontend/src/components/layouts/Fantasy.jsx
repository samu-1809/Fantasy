import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cargarDatosIniciales } from '../../services/api';

// Importar componentes de pantalla
import LoginScreen from '../auth/LoginScreen';
import RegisterScreen from '../auth/RegisterScreen';
import DashboardScreen from '../dashboard/DashboardScreen';
import MarketScreen from '../market/MarketScreen';
import RankingsScreen from '../common/RankingsScreen';
import CalendarScreen from '../common/CalendarScreen';
import AdminScreen from '../admin/AdminScreen';
import NavBar from '../common/NavBar';

// Componente de carga
const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-xl text-gray-600">Cargando Fantasy Fútbol Sala...</p>
      <p className="text-sm text-gray-500 mt-2">Preparando tu experiencia</p>
    </div>
  </div>
);

// Componente de error
const ErrorScreen = ({ error, onRetry }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-red-300 max-w-md text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Error al cargar</h2>
      <p className="text-gray-600 mb-6">{error}</p>
      <button
        onClick={onRetry}
        className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  </div>
);

const Fantasy = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [appLoading, setAppLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🎯 MOVER useAuth AL PRINCIPIO - SIEMPRE SE LLAMA
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();

  console.log('🎮 Fantasy component - estado:', {
    currentScreen,
    authLoading,
    user: user ? user.username : 'null',
    isAuthenticated,
    datosUsuario: datosUsuario ? 'LOADED' : 'NULL'
  });

  // 🎯 MOSTRAR LOADING MIENTRAS AUTH CONTEXT SE INICIALIZA
  // Esto debe estar DESPUÉS de todos los hooks
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Inicializando aplicación...</p>
        </div>
      </div>
    );
  }

  // Efecto para cargar datos cuando el usuario se autentica
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      if (user && isAuthenticated) {
        console.log('🔄 Usuario autenticado detectado, cargando datos...');
        setAppLoading(true);
        setError(null);
        try {
          console.log('🔄 Cargando datos para usuario:', user.username);
          const datos = await cargarDatosIniciales(user);
          setDatosUsuario(datos);
          
          // Determinar pantalla inicial según el rol
          const isAdmin = user.is_superuser || user.is_staff;
          const nuevaPantalla = isAdmin ? 'admin' : 'dashboard';
          
          console.log(`🎯 Redirigiendo a: ${nuevaPantalla}`);
          setCurrentScreen(nuevaPantalla);
          
          console.log('✅ Datos cargados correctamente');
        } catch (err) {
          console.error('❌ Error cargando datos:', err);
          setError('Error al cargar los datos del usuario: ' + err.message);
        } finally {
          setAppLoading(false);
        }
      }
    };

    cargarDatosUsuario();
  }, [user, isAuthenticated]);

  // Efecto para redirigir al login si no está autenticado
  useEffect(() => {
    if (!isAuthenticated && currentScreen !== 'login' && currentScreen !== 'register') {
      setCurrentScreen('login');
      setDatosUsuario(null);
    }
  }, [isAuthenticated, currentScreen]);

  const handleLoginSuccess = () => {
    console.log('✅ Login exitoso en Fantasy');
    // El efecto se encargará de cargar los datos cuando user/isAuthenticated se actualicen
  };

  const handleRegisterSuccess = () => {
    console.log('✅ Registro exitoso, redirigiendo a login...');
    setCurrentScreen('login');
  };

  const handleLogout = () => {
    console.log('🚪 Cerrando sesión...');
    logout();
    setCurrentScreen('login');
    setDatosUsuario(null);
    setError(null);
  };

  const handleRefreshData = async () => {
    if (user) {
      setAppLoading(true);
      setError(null);
      try {
        console.log('🔄 Actualizando datos...');
        const datos = await cargarDatosIniciales(user);
        setDatosUsuario(datos);
        console.log('✅ Datos actualizados correctamente');
      } catch (err) {
        console.error('❌ Error actualizando datos:', err);
        setError('Error al actualizar los datos: ' + err.message);
      } finally {
        setAppLoading(false);
      }
    }
  };

  const handleFichajeExitoso = async () => {
    if (user) {
      try {
        const datos = await cargarDatosIniciales(user);
        setDatosUsuario(datos);
      } catch (err) {
        console.error('❌ Error actualizando después de fichaje:', err);
      }
    }
  };

  const handleAsignarPuntosSuccess = async () => {
    if (user) {
      try {
        const datos = await cargarDatosIniciales(user);
        setDatosUsuario(datos);
      } catch (err) {
        console.error('❌ Error actualizando después de asignar puntos:', err);
      }
    }
  };

  // Renderizar pantalla actual
  const renderScreen = () => {
    // Pantallas de autenticación
    if (currentScreen === 'login') {
      return (
        <LoginScreen
          onSwitchToRegister={() => setCurrentScreen('register')}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }

    if (currentScreen === 'register') {
      return (
        <RegisterScreen
          onSwitchToLogin={() => setCurrentScreen('login')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      );
    }

    // Si hay error general
    if (error && !appLoading) {
      return (
        <ErrorScreen
          error={error}
          onRetry={handleRefreshData}
        />
      );
    }

    // Si está cargando
    if (appLoading) {
      return <LoadingScreen />;
    }

    // Pantallas principales
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen datosUsuario={datosUsuario} />;
      
      case 'market':
        return (
          <MarketScreen
            datosUsuario={datosUsuario}
            onFichajeExitoso={handleFichajeExitoso}
          />
        );
      
      case 'rankings':
        return <RankingsScreen datosUsuario={datosUsuario} />;
      
      case 'calendar':
        return <CalendarScreen />;
      
      case 'admin':
        return (
          <AdminScreen
            datosUsuario={datosUsuario}
            setCurrentScreen={setCurrentScreen}
            cargarDatosIniciales={() => cargarDatosIniciales(user).then(setDatosUsuario)}
          />
        );
      
      default:
        return (
          <ErrorScreen
            error="Pantalla no encontrada"
            onRetry={() => setCurrentScreen('dashboard')}
          />
        );
    }
  };

  // Determinar si mostrar la barra de navegación
  const showNavBar = isAuthenticated && 
                    !['login', 'register'].includes(currentScreen) && 
                    !appLoading && 
                    !error;

  return (
    <div className="min-h-screen bg-gray-100">
      {showNavBar && (
        <NavBar
          onNavigate={setCurrentScreen}
          onRefresh={handleRefreshData}
          onLogout={handleLogout}
          currentScreen={currentScreen}
        />
      )}
      
      {renderScreen()}

      {/* Notificación de error global */}
      {error && !showNavBar && currentScreen !== 'login' && currentScreen !== 'register' && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay global */}
      {appLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-700">Cargando...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fantasy;