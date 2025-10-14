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
  
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();

  // 🎯 EFECTO DE DEBUG
  useEffect(() => {
    console.log('🔍 DEBUG COMPLETO - Estado actual:', {
      currentScreen,
      user: user ? `${user.username} (id:${user.id})` : 'null',
      isAuthenticated,
      datosUsuario: datosUsuario ? {
        tieneEquipo: !!datosUsuario.equipo,
        equipoId: datosUsuario.equipo?.id,
        cantidadJugadores: datosUsuario.jugadores?.length,
        es_admin: datosUsuario.es_admin
      } : 'null',
      appLoading,
      error
    });
  }, [currentScreen, user, isAuthenticated, datosUsuario, appLoading, error]);

  // 🎯 EFECTO PRINCIPAL: Cargar datos cuando el usuario se autentica
  useEffect(() => {
    const cargarDatosUsuario = async () => {
      if (user && isAuthenticated && !datosUsuario && !appLoading) {
        console.log('🎯🎯🎯 Fantasy: Iniciando carga de datos para:', user.username);
        
        setAppLoading(true);
        setError(null);
        
        try {
          console.log('📡 Fantasy: Llamando a cargarDatosIniciales...');
          const datos = await cargarDatosIniciales(user);
          
          console.log('📦📦📦 Fantasy: RESPUESTA COMPLETA de cargarDatosIniciales:', datos);
          console.log('🔍 Fantasy - Análisis de datos recibidos:');
          console.log('   - Tiene equipo:', !!datos.equipo);
          console.log('   - Equipo ID:', datos.equipo?.id);
          console.log('   - Equipo nombre:', datos.equipo?.nombre);
          console.log('   - Cantidad jugadores:', datos.jugadores?.length);
          console.log('   - Es admin:', datos.es_admin);
          
          if (!datos.equipo) {
            console.warn('⚠️⚠️⚠️ ATENCIÓN: Los datos llegaron SIN EQUIPO');
          }
          
          setDatosUsuario(datos);
          
          // Navegación
          const targetScreen = datos.es_admin ? 'admin' : 'dashboard';
          console.log(`🎯 Fantasy: Navegando a ${targetScreen}`);
          setCurrentScreen(targetScreen);
          
        } catch (err) {
          console.error('❌❌❌ Fantasy: Error en cargarDatosIniciales:', err);
          setError('Error cargando datos: ' + err.message);
        } finally {
          setAppLoading(false);
        }
      }
    };

    cargarDatosUsuario();
  }, [user, isAuthenticated]);// ⚠️ IMPORTANTE: No incluir datosUsuario en dependencias

  // 🎯 EFECTO: Redirigir a login si no está autenticado
  useEffect(() => {
    if (!isAuthenticated && currentScreen !== 'login' && currentScreen !== 'register') {
      console.log('🚪 Usuario no autenticado, redirigiendo a login...');
      setCurrentScreen('login');
      setDatosUsuario(null);
    }
  }, [isAuthenticated, currentScreen]);

  // 🎯 HANDLERS
  const handleLoginSuccess = () => {
    console.log('✅ Login exitoso en Fantasy');
    // Los efectos se encargarán de cargar los datos
  };

  const handleRegisterSuccess = () => {
    console.log('✅ Registro exitoso, redirigiendo a login...');
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
        const datos = await cargarDatosIniciales(user, true);
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

  const renderScreen = () => {
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