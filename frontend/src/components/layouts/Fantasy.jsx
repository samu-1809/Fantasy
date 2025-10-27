// Fantasy.jsx
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
import MovimientosMercadoScreen from '../common/MovimientosMercadoScreen';
import RealTeamsScreen from '../real_teams/RealTeamsScreen';


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
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedRealTeamId, setSelectedRealTeamId] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  console.log('🔗 URL de API que se usará:', API_URL);
  // 🎯 VOLVER al uso simple del contexto
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();

  console.log('🔍 Fantasy - Estado actual:', {
    currentScreen,
    user: user ? `${user.username} (id:${user.id})` : 'null',
    isAuthenticated,
    authLoading,
    datosUsuario: datosUsuario ? `object (equipo: ${!!datosUsuario?.equipo})` : 'null',
    appLoading
  });

  // 🎯 EFECTO 1: Cargar datos del usuario cuando se autentica (VERSIÓN ANTERIOR)
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      if (user && isAuthenticated && !datosUsuario) {
        console.log('🔄 Usuario autenticado detectado, cargando datos...');
        
        setAppLoading(true);
        setError(null);
        try {
          console.log('🔄 Cargando datos para usuario:', user.username);
          const datos = await cargarDatosIniciales(user);
          
          console.log('📦 Datos recibidos:', {
            tieneEquipo: !!datos.equipo,
            es_admin: datos.es_admin
          });
          
          setDatosUsuario(datos);
          
          // 🎯 DECISIÓN DE PANTALLA BASADA EN DATOS
          if (datos.es_admin) {
            console.log('👑 Redirigiendo a admin');
            setCurrentScreen('admin');
          } else if (!datos.equipo) {
            console.log('➕ Redirigiendo a crear equipo');
            setCurrentScreen('createTeam');
          } else {
            console.log('📊 Redirigiendo a dashboard');
            setCurrentScreen('dashboard');
          }
          
        } catch (err) {
          console.error('❌ Error cargando datos:', err);
          setError('Error al cargar los datos del usuario: ' + err.message);
        } finally {
          setAppLoading(false);
        }
      }
    };

    cargarDatosUsuario();
  }, [user, isAuthenticated, datosUsuario]);

  // 🎯 EFECTO 2: Redirigir a login si no está autenticado (VERSIÓN ANTERIOR)
  useEffect(() => {
    if (!authLoading && !isAuthenticated && currentScreen !== 'login' && currentScreen !== 'register') {
      console.log('🚪 Usuario no autenticado, redirigiendo a login...');
      setCurrentScreen('login');
      setDatosUsuario(null);
    }
  }, [isAuthenticated, currentScreen, authLoading]);

  // 🎯 EFECTO 3: Redirigir cuando la autenticación se completa (NUEVO - MEJORA)
  useEffect(() => {
    // Solo actuar cuando la verificación de auth ha terminado
    if (!authLoading) {
      if (isAuthenticated && user && datosUsuario && currentScreen === 'login') {
        console.log('🚀 REDIRIGIENDO: Todo listo para navegar desde login');
        // La navegación ya se maneja en el efecto 1, pero por si acaso
        if (datosUsuario.es_admin && currentScreen !== 'admin') {
          setCurrentScreen('admin');
        } else if (!datosUsuario.equipo && currentScreen !== 'createTeam') {
          setCurrentScreen('createTeam');
        } else if (currentScreen !== 'dashboard') {
          setCurrentScreen('dashboard');
        }
      }
    }
  }, [isAuthenticated, user, datosUsuario, currentScreen, authLoading]);

  // 🎯 HANDLERS (MANTENER de la versión anterior)
  const handleLoginSuccess = () => {
    console.log('✅ Login exitoso en Fantasy');
    // El efecto 1 se encargará de cargar los datos y redirigir
  };

  const handleRegisterSuccess = () => {
    console.log('✅ Registro exitoso, redirigiendo a login...');
    setCurrentScreen('login');
  };

  const handleTeamClick = (teamId) => {
    setSelectedTeamId(teamId);
    setCurrentScreen('team-detail');
  };

   const handleRealTeamClick = (teamId) => {
    setSelectedRealTeamId(teamId);
    setCurrentScreen('real-team-detail');
  };

  const handleBackFromRealTeam = () => {
    setCurrentScreen('real-teams');
    setSelectedRealTeamId(null);
  };

  const handleBackFromTeam = () => {
    setCurrentScreen('rankings');
    setSelectedTeamId(null);
  };

  const handleLogout = () => {
    console.log('🚪 Cerrando sesión...');
    logout();
    setCurrentScreen('login');
    setDatosUsuario(null);
    setError(null);
  };

  // Fantasy.jsx - en handleRefreshData
  const handleRefreshData = async () => {
    if (user) {
      setAppLoading(true);
      setError(null);
      try {
        console.log('🔄 Actualizando datos...');
        const datos = await cargarDatosIniciales(user);
        setDatosUsuario(datos);
        console.log('✅ Datos actualizados correctamente');
        
        // Disparar evento para actualizar notificaciones
        window.dispatchEvent(new Event('notificacionesActualizadas'));
      } catch (err) {
        console.error('❌ Error actualizando datos:', err);
        setError('Error al actualizar los datos: ' + err.message);
      } finally {
        setAppLoading(false);
      }
    }
  };

  const renderScreen = () => {
    // 🎯 MOSTRAR CARGA solo durante la verificación inicial de auth
    if (authLoading) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl text-gray-600">Verificando autenticación...</p>
          </div>
        </div>
      );
    }

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

    if (error && !appLoading) {
      return (
        <ErrorScreen
          error={error}
          onRetry={handleRefreshData}
        />
      );
    }

    if (appLoading) {
      return <LoadingScreen />;
    }
    
    switch (currentScreen) {

      case 'dashboard':
        return <DashboardScreen 
          datosUsuario={datosUsuario} 
          onRefresh={handleRefreshData}
        />;
        
      case 'market':
        return (
          <MarketScreen
            datosUsuario={datosUsuario}
            onFichajeExitoso={handleRefreshData}
          />
        );

      case 'movimientos-mercado':
        return <MovimientosMercadoScreen />;
      
      case 'rankings':
        return (
          <RankingsScreen 
            datosUsuario={datosUsuario} 
            onTeamClick={handleTeamClick}
          />
        );

      case 'calendar':
        return <CalendarScreen />;

        case 'real-teams':
        return (
          <RealTeamsScreen 
            onTeamClick={handleRealTeamClick}
          />
        );
      
      case 'admin':
        return (
          <AdminScreen
            datosUsuario={datosUsuario}
            setCurrentScreen={setCurrentScreen}
            cargarDatosIniciales={async () => {
              const nuevosDatos = await cargarDatosIniciales(user);
              setDatosUsuario(nuevosDatos);
              return nuevosDatos;
            }}
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

   const showNavBar = isAuthenticated && 
                    !['login', 'register', 'admin'].includes(currentScreen) && 
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
    </div>
  );
};

export default Fantasy;