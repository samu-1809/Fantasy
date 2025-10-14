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
import TeamDetailScreen from '../team/TeamDetailScreen';
import NotificacionScreen from '../notificacion/NotificacionScreen';

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
  
  // 🆕 Usar authChecked del contexto
  const { user, logout, isAuthenticated, loading: authLoading, authChecked } = useAuth();

  // 🆕 EFECTO PRINCIPAL MEJORADO: Navegación sincronizada
  useEffect(() => {
    console.log('🔍 Fantasy - Estado actual:', {
      currentScreen,
      user: user ? `${user.username} (id:${user.id})` : 'null',
      isAuthenticated,
      authLoading,
      authChecked,
      datosUsuario: datosUsuario ? `object (equipo: ${!!datosUsuario?.equipo})` : 'null',
      appLoading
    });

    // 🆕 Esperar a que la autenticación esté completamente verificada
    if (!authChecked || authLoading) {
      console.log('⏳ Fantasy: Esperando verificación de autenticación...');
      return;
    }

    // 🆕 Usuario NO autenticado - ir a login
    if (!isAuthenticated) {
      console.log('🚪 Fantasy: Usuario no autenticado, navegando a login');
      setCurrentScreen('login');
      setDatosUsuario(null);
      return;
    }

    // 🆕 Usuario autenticado pero sin datos - cargar datos
    if (isAuthenticated && user && !datosUsuario && !appLoading) {
      console.log('🎯 Fantasy: Usuario autenticado, cargando datos...');
      cargarDatosUsuario();
      return;
    }

    // 🆕 Usuario autenticado con datos - decidir navegación
    if (isAuthenticated && user && datosUsuario) {
      console.log('🏆 Fantasy: Usuario autenticado con datos, verificando equipo...');
      
      if (datosUsuario.es_admin) {
        console.log('👑 Fantasy: Es admin, navegando a admin');
        setCurrentScreen('admin');
      } else if (!datosUsuario.equipo) {
        console.log('➕ Fantasy: No tiene equipo, navegando a crear equipo');
        setCurrentScreen('createTeam');
      } else {
        console.log('📊 Fantasy: Tiene equipo, navegando a dashboard');
        setCurrentScreen('dashboard');
      }
    }
  }, [isAuthenticated, user, datosUsuario, authLoading, authChecked, appLoading]);

  // 🆕 Función mejorada para cargar datos
  const cargarDatosUsuario = async () => {
    if (!user) return;
    
    console.log('🚀 Fantasy: Iniciando carga de datos para:', user.username);
    setAppLoading(true);
    setError(null);
    
    try {
      const datos = await cargarDatosIniciales(user);
      console.log('✅ Fantasy: Datos cargados exitosamente:', {
        tieneEquipo: !!datos.equipo,
        equipoId: datos.equipo?.id,
        cantidadJugadores: datos.jugadores?.length,
        es_admin: datos.es_admin
      });
      
      setDatosUsuario(datos);
    } catch (err) {
      console.error('❌ Fantasy: Error cargando datos:', err);
      setError('Error cargando datos: ' + err.message);
      
      // 🆕 Reintentar después de un tiempo si falla
      setTimeout(() => {
        console.log('🔄 Fantasy: Reintentando carga de datos...');
        cargarDatosUsuario();
      }, 1000);
    } finally {
      setAppLoading(false);
    }
  };

  // 🆕 HANDLERS mejorados
  const handleLoginSuccess = () => {
    console.log('✅ Fantasy: Login exitoso, la sincronización se encargará del resto');
    // No hacer nada más aquí - el efecto principal manejará la navegación
  };

  const handleRegisterSuccess = () => {
    console.log('✅ Fantasy: Registro exitoso, redirigiendo a login...');
    setCurrentScreen('login');
  };

  const handleTeamClick = (teamId) => {
    setSelectedTeamId(teamId);
    setCurrentScreen('team-detail');
  };

  const handleBackFromTeam = () => {
    setCurrentScreen('rankings');
    setSelectedTeamId(null);
  };

  const handleLogout = () => {
    console.log('🚪 Fantasy: Cerrando sesión...');
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
        console.log('🔄 Fantasy: Actualizando datos...');
        const datos = await cargarDatosIniciales(user, true);
        setDatosUsuario(datos);
        console.log('✅ Fantasy: Datos actualizados correctamente');
      } catch (err) {
        console.error('❌ Fantasy: Error actualizando datos:', err);
        setError('Error al actualizar los datos: ' + err.message);
      } finally {
        setAppLoading(false);
      }
    }
  };

  const renderScreen = () => {
    // 🆕 Mostrar carga inicial hasta que la autenticación esté verificada
    if (!authChecked || authLoading) {
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
      
      case 'rankings':
        return (
          <RankingsScreen 
            datosUsuario={datosUsuario} 
            onTeamClick={handleTeamClick}
          />
        );

      case 'notificacion':
        return (
          <NotificacionScreen 
            onNavigate={setCurrentScreen}
            onRefresh={handleRefreshData}
          />
        );

      case 'calendar':
        return <CalendarScreen />;
      
      case 'team-detail':
        return (
          <TeamDetailScreen 
            equipoId={selectedTeamId}
            onBack={handleBackFromTeam}
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
                    !['login', 'register', 'admin', 'team-detail'].includes(currentScreen) && 
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