import React, { useState, useEffect } from 'react';
import { Menu, Users, TrendingUp, Trophy, Settings, LogOut, Plus, Minus, Search, RefreshCw, Calendar, Star} from 'lucide-react';

const FantasyFutsalWireframes = () => {
  const API_URL = 'http://127.0.0.1:8000/api';
  
  const [currentScreen, setCurrentScreen] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentAuthScreen, setCurrentAuthScreen] = useState('login');
  
  // Estados para datos
  const [equipoActual, setEquipoActual] = useState(null);
  const [ligaActual, setLigaActual] = useState(null);
  const [mercado, setMercado] = useState([]);
  const [clasificacion, setClasificacion] = useState([]);
  const [jugadores, setJugadores] = useState([]);

  const screens = {
    login: 'Login/Registro',
    dashboard: 'Dashboard',
    market: 'Mercado',
    rankings: 'Clasificación',
    admin: 'Panel Admin'
  };

  // Funciones API
  const handleResponse = async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
      throw new Error(error.message || 'Error en la petición');
    }
    return response.json();
};

  const getEquipo = async (id) => {
    const response = await fetch(`${API_URL}/equipos/${id}/`);
    return handleResponse(response);
  };

  const getLiga = async (id) => {
    const response = await fetch(`${API_URL}/ligas/${id}/`);
    return handleResponse(response);
  };

  const getMercado = async (ligaId) => {
    const response = await fetch(`${API_URL}/mercado/?liga_id=${ligaId}`);
    return handleResponse(response);
  };

  const getClasificacion = async (ligaId) => {
    const response = await fetch(`${API_URL}/clasificacion/?liga_id=${ligaId}`);
    return handleResponse(response);
  };

  const getJugadores = async () => {
    const response = await fetch(`${API_URL}/jugadores/`);
    return handleResponse(response);
  };

  const ficharJugador = async (equipoId, jugadorId, enBanquillo = false) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/equipos/${equipoId}/fichar_jugador/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        jugador_id: jugadorId,
        en_banquillo: enBanquillo
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al fichar jugador');
    }
    return await response.json();
  };
  const venderJugador = async (equipoId, jugadorId) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/equipos/${equipoId}/vender_jugador/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        jugador_id: jugadorId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al vender jugador');
    }

    return await response.json();
  };
  const fetchMiEquipo = async () => {
      try {
          const token = localStorage.getItem('access_token');
          const response = await fetch(`${API_URL}/equipos/mi_equipo/`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          
          if (response.ok) {
              const equipo = await response.json();
              console.log('Mi equipo:', equipo);
          }
      } catch (error) {
          console.error('Error cargando equipo:', error);
      }
  };
  const asignarPuntos = async (jornadaId, puntos) => {
    const response = await fetch(`${API_URL}/puntuaciones/asignar_puntos/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jornada_id: jornadaId, puntos }),
    });
    return handleResponse(response);
  };

  // Cargar datos iniciales al hacer login
  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const equipo = await getEquipo(1);
      setEquipoActual(equipo);
      
      const liga = await getLiga(equipo.liga);
      setLigaActual(liga);
      
      const mercadoData = await getMercado(equipo.liga);
      setMercado(mercadoData);
      
      const clasificacionData = await getClasificacion(equipo.liga);
      setClasificacion(clasificacionData);
      
      const jugadoresData = await getJugadores();
      setJugadores(jugadoresData);
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Error cargando datos:', err);
    }
  };

    const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setCurrentScreen('login');
  };

  const NavBar = ({ role }) => (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">⚽ Fantasy Fútbol Sala</h1>
      </div>
      <div className="flex gap-6 items-center">
        <button onClick={() => setCurrentScreen('dashboard')} className="hover:text-gray-300 flex items-center gap-1">
          🧤 Mi Equipo
        </button>
        <button onClick={() => setCurrentScreen('market')} className="hover:text-gray-300 flex items-center gap-1">
          💰 Mercado
        </button>
        <button onClick={() => setCurrentScreen('rankings')} className="hover:text-gray-300 flex items-center gap-1">
          🏆 Clasificación
        </button>
        <button onClick={() => setCurrentScreen('calendar')} className="hover:text-gray-300 flex items-center gap-1">
          📅 Calendario
        </button>
        <div className="w-px h-6 bg-gray-600"></div>
        <button 
          onClick={cargarDatosIniciales}
          className="hover:text-gray-300 flex items-center gap-1"
          title="Recargar datos"
        >
          <RefreshCw size={18} />
        </button>
        <button
          onClick={handleLogout}
          className="cursor-pointer hover:text-gray-300 flex items-center gap-1"
        >
          <LogOut size={20} />
          Salir
        </button>
      </div>
    </div>
  );

  const PlayerCard = ({ player, positionLabel, onRemove }) => {
    const getBadgeColor = (pts) => {
      if (pts > 0) return 'bg-green-500';
      if (pts < 0) return 'bg-red-500';
      return 'bg-gray-400';
    };

    const formatValue = (value) => {
      return `€${(value / 1000000).toFixed(1)}M`;
    };

    return (
      <div className="flex flex-col items-center cursor-pointer group relative">
        <div className="mb-1 bg-gray-900/80 text-white text-xs font-bold px-2 py-0.5 rounded">
          {positionLabel}
        </div>
        <div className="relative">
          <Users size={48} className="text-blue-600 group-hover:text-blue-800 transition-colors drop-shadow-lg" />
          <div className={`absolute -top-1 -right-1 ${getBadgeColor(0)} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white`}>
            0
          </div>
        </div>
        <div className="mt-2 bg-white/90 backdrop-blur px-3 py-1 rounded-lg shadow-md text-center min-w-[120px]">
          <div className="font-bold text-sm">{player.nombre}</div>
          <div className="text-xs text-gray-600">{formatValue(player.valor)} • {player.puntos_totales}pts</div>
        </div>
        {onRemove && (
          <button 
            onClick={() => onRemove(player.id)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Minus size={16} />
          </button>
        )}
      </div>
    );
  };

  const RegisterScreen = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',    // ✅ MANTENER
        last_name: ''      // ✅ MANTENER
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validaciones básicas
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setIsLoading(false);
            return;
        }

        // 🆕 Validar que first_name y last_name no estén vacíos
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
            setError('Nombre y apellidos son obligatorios');
            setIsLoading(false);
            return;
        }

        try {
            console.log('📤 Enviando registro:', {
                username: formData.username,
                email: formData.email,
                password: '***',
                password2: '***',
                first_name: formData.first_name,
                last_name: formData.last_name
            });

            const response = await fetch(`${API_URL}/auth/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    password2: formData.confirmPassword,
                    first_name: formData.first_name,
                    last_name: formData.last_name
                }),
            });
            
            console.log('📥 Respuesta status:', response.status);
            const responseText = await response.text();
            console.log('📥 Respuesta completa:', responseText);
            
            if (response.ok) {
                const data = JSON.parse(responseText);
                console.log('✅ Registro exitoso');
                
                // 🆕 MOSTRAR MENSAJE DE ÉXITO Y REDIRIGIR AL LOGIN
                alert('✅ Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
                setCurrentScreen('login');
                
            } else {
                try {
                    const errorData = JSON.parse(responseText);
                    console.error('❌ Error del servidor:', errorData);
                    setError(errorData.error || JSON.stringify(errorData));
                } catch {
                    console.error('❌ Error del servidor:', responseText);
                    setError(responseText || 'Error en el registro');
                }
            }
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            setError('Error de conexión: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-96 border-2 border-gray-300">
                <h2 className="text-2xl font-bold mb-6 text-center">⚽ Crear Cuenta</h2>
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleRegister}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Usuario *</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
                                placeholder="Elige un usuario"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
                                placeholder="tu@email.com"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre *</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
                                placeholder="Tu nombre"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Apellido*</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
                                placeholder="Tus apellidos"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Contraseña *</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
                                placeholder="Mínimo 6 caracteres"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-1">Confirmar Contraseña *</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
                                placeholder="Repite tu contraseña"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 bg-green-600 text-white p-3 rounded font-medium hover:bg-green-700 disabled:bg-gray-400"
                            >
                                {isLoading ? 'Creando cuenta...' : 'Registrarse'}
                            </button>
                        </div>
                        
                        <div className="text-center text-sm text-gray-600">
                            ¿Ya tienes cuenta? 
                            <span 
                                className="text-blue-600 cursor-pointer ml-1"
                                onClick={() => setCurrentScreen('login')}
                            >
                                Inicia Sesión
                            </span>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
  };

  const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      
      try {
        const response = await fetch(`${API_URL}/auth/login/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });
        
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          
          // Obtener información del usuario para determinar si es admin
          const userResponse = await fetch(`${API_URL}/auth/user/`, {
            headers: {
              'Authorization': `Bearer ${data.access}`
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // Determinar si es admin (puedes ajustar esta lógica según tu backend)
            const isUserAdmin = userData.is_superuser || userData.is_staff || username === 'admin';
            setIsAdmin(isUserAdmin);
            
            setCurrentScreen(isUserAdmin ? 'admin' : 'dashboard');
            await cargarDatosIniciales();
          }
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Error en el login');
        }
      } catch (error) {
        setError('Error de conexión');
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-96 border-2 border-gray-300">
          <h2 className="text-2xl font-bold mb-6 text-center">⚽ Fantasy Fútbol Sala</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
                  placeholder="Tu usuario"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
                  placeholder="Tu contraseña"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white p-3 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
                </button>
              </div>
              
              <div className="text-center text-sm text-gray-600">
                ¿No tienes cuenta? 
                <span 
                  className="text-blue-600 cursor-pointer ml-1"
                  onClick={() => setCurrentScreen('register')}
                >
                  Regístrate
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const DashboardScreen = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
            <p className="text-xl">Cargando datos...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg">
            <p className="text-red-600 font-bold">Error: {error}</p>
            <button 
              onClick={cargarDatosIniciales}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    if (!equipoActual) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <p>No hay equipo disponible</p>
        </div>
      );
    }

    const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;
    const calcularPuntosTotales = () => equipoActual.jugadores.reduce((sum, j) => sum + j.puntos_totales, 0);
    const miPosicion = clasificacion.findIndex(e => e.equipo_id === equipoActual.id) + 1;

    // Separar jugadores por posición y banquillo
    const portero = equipoActual.jugadores.find(j => j.posicion === 'POR');
    const defensas = equipoActual.jugadores.filter(j => j.posicion === 'DEF');
    const delanteros = equipoActual.jugadores.filter(j => j.posicion === 'DEL');
    
    // Banquillo: todos los jugadores que no están en la alineación base
    // (asumiendo que los primeros 5 son titulares: 1 POR + 2 DEF + 2 DEL)
    const banquillo = equipoActual.jugadores.slice(5); // Jugadores del 6º en adelante

    const totalJugadores = equipoActual.jugadores.length;
    const maxJugadores = 13;

    const puedeVenderJugador = (jugador) => {
      if (!equipoActual || !equipoActual.jugadores) return false;

      const jugadores = equipoActual.jugadores;
      
      // Contar jugadores por posición
      const contarPorPosicion = {
        'POR': jugadores.filter(j => j.posicion === 'POR').length,
        'DEF': jugadores.filter(j => j.posicion === 'DEF').length,
        'DEL': jugadores.filter(j => j.posicion === 'DEL').length
      };

      // Verificar si al vender este jugador quedaría alguna posición vacía
      if (jugador.posicion === 'POR' && contarPorPosicion.POR === 1) {
        return false; // No se puede vender el único portero
      }
      
      if (jugador.posicion === 'DEF' && contarPorPosicion.DEF === 2) {
        return false; // No se puede vender si solo hay 2 defensas
      }
      
      if (jugador.posicion === 'DEL' && contarPorPosicion.DEL === 2) {
        return false; // No se puede vender si solo hay 2 delanteros
      }

      return true;
    };

    const handleVenderJugador = async (jugadorId) => {
      // Buscar el jugador en el equipo actual
      const jugador = equipoActual.jugadores.find(j => j.id === jugadorId);
      
      if (!jugador) {
        alert('Jugador no encontrado en el equipo');
        return;
      }

      // Validar si se puede vender
      if (!puedeVenderJugador(jugador)) {
        const mensajesError = {
          'POR': 'No puedes vender a tu único portero. Debes tener al menos 1 portero en el equipo.',
          'DEF': 'No puedes vender este defensa. Debes tener al menos 2 defensas en el equipo.',
          'DEL': 'No puedes vender este delantero. Debes tener al menos 2 delanteros en el equipo.'
        };
        
        alert(mensajesError[jugador.posicion]);
        return;
      }

      // Si pasa la validación, proceder con la venta
      if (window.confirm(`¿Seguro que quieres vender a ${jugador.nombre}?`)) {
        try {
          await venderJugador(equipoActual.id, jugadorId);
          await cargarDatosIniciales();
          alert('✅ Jugador vendido exitosamente');
        } catch (err) {
          alert('❌ Error al vender jugador: ' + err.message);
        }
      }
    };

    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar role={isAdmin ? 'admin' : 'user'} />
        <div className="p-6">
          {/* Contador de jugadores */}
          <div className="mb-4 bg-white p-4 rounded-lg shadow border-2 border-gray-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Plantilla del Equipo</h3>
                <p className="text-sm text-gray-600">
                  {totalJugadores}/{maxJugadores} jugadores
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                totalJugadores >= maxJugadores 
                  ? 'bg-red-100 text-red-800' 
                  : totalJugadores >= 10 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
              }`}>
                {totalJugadores >= maxJugadores ? 'Plantilla completa' : 
                 totalJugadores >= 10 ? 'Casi completa' : 'Disponible para fichajes'}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Presupuesto</div>
              <div className="text-2xl font-bold text-blue-600">{formatValue(equipoActual.presupuesto)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-sm text-gray-600">Puntos Totales</div>
              <div className="text-2xl font-bold text-green-600">{calcularPuntosTotales()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="text-sm text-gray-600">Posición Liga</div>
              <div className="text-2xl font-bold text-purple-600">{miPosicion}º</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
            <Users size={28} />
            {equipoActual.nombre}
          </h2>

          {/* Campo de fútbol */}
          <div className="bg-amber-50 rounded-lg shadow-2xl p-6 relative overflow-hidden border-4 border-blue-500 max-w-4xl mx-auto">
            <div className="absolute inset-0">
              <div className="absolute left-2 top-2 bottom-2 w-1 bg-blue-500"></div>
              <div className="absolute right-2 top-2 bottom-2 w-1 bg-blue-500"></div>
              <div className="absolute left-2 right-2 bottom-2 h-1 bg-blue-500"></div>
              <div className="absolute left-2 right-2 top-2 h-1 bg-blue-500"></div>
              <div className="absolute left-1/2 top-2 transform -translate-x-1/2 w-24 h-12 border-4 border-blue-500 border-t-0 rounded-b-full"></div>
              <div className="absolute left-1/2 bottom-2 transform -translate-x-1/2 w-48 h-20 border-4 border-blue-500 border-b-0 rounded-t-3xl"></div>
              <div className="absolute left-1/2 bottom-16 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 border-l-4 border-b-4 border-blue-500 rounded-bl-full"></div>
              <div className="absolute bottom-2 right-2 w-6 h-6 border-r-4 border-b-4 border-blue-500 rounded-br-full"></div>
              <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-blue-500"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-blue-500"></div>
            </div>

            <div className="relative z-10">
              <div className="relative z-10 h-96 flex flex-col justify-between py-4 pb-12">
                <div className="flex justify-around px-24">
                  {delanteros.slice(0, 2).map((del, idx) => (
                    <PlayerCard 
                      key={del.id} 
                      player={del} 
                      positionLabel="ATA" 
                      onRemove={handleVenderJugador}
                    />
                  ))}
                </div>

                <div className="flex justify-around px-24">
                  {defensas.slice(0, 2).map((def, idx) => (
                    <PlayerCard 
                      key={def.id} 
                      player={def} 
                      positionLabel="DEF"
                      onRemove={handleVenderJugador}
                    />
                  ))}
                </div>

                <div className="flex justify-center">
                  {portero && (
                    <PlayerCard 
                      player={portero} 
                      positionLabel="POR"
                      onRemove={handleVenderJugador}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Banquillo */}
          {banquillo.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow border-2 border-gray-300 p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users size={20} />
                Banquillo ({banquillo.length} jugadores)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {banquillo.map((jugador) => (
                  <div key={jugador.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-sm">{jugador.nombre}</div>
                        <div className="text-xs text-gray-600 capitalize">
                          {jugador.posicion === 'POR' ? 'Portero' : 
                           jugador.posicion === 'DEF' ? 'Defensa' : 'Delantero'}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-green-600">
                        {formatValue(jugador.valor)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {jugador.puntos_totales} pts
                    </div>
                    <button
                      onClick={() => handleVenderJugador(jugador.id)}
                      className="w-full bg-red-600 text-white py-1 px-3 rounded text-xs hover:bg-red-700"
                    >
                      Vender
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4">
          </div>
        </div>
      </div>
    );
  };

  const jugadorVaAlBanquillo = (jugadorPosicion) => {
    const posicionesDisponibles = obtenerPosicionesDisponibles();
    
    // Si la posición del jugador está disponible en el campo, NO va al banquillo
    // Si NO está disponible, SÍ va al banquillo
    return !posicionesDisponibles.includes(jugadorPosicion);
  };
    const obtenerPosicionesDisponibles = () => {
    if (!equipoActual || !equipoActual.jugadores) return [];
    
    const jugadoresEnCampo = equipoActual.jugadores.filter(j => j.en_banquillo === false);
    
    // Contar cuántos jugadores hay por posición en el campo
    const contarEnCampo = {
      'POR': jugadoresEnCampo.filter(j => j.posicion === 'POR').length,
      'DEF': jugadoresEnCampo.filter(j => j.posicion === 'DEF').length,
      'DEL': jugadoresEnCampo.filter(j => j.posicion === 'DEL').length
    };
    
    // Definir los límites máximos por posición
    const limites = {
      'POR': 1,
      'DEF': 2, 
      'DEL': 2
    };
    
    // Calcular posiciones disponibles (donde no se ha alcanzado el límite)
    const posicionesDisponibles = [];
    
    if (contarEnCampo.POR < limites.POR) posicionesDisponibles.push('POR');
    if (contarEnCampo.DEF < limites.DEF) posicionesDisponibles.push('DEF');
    if (contarEnCampo.DEL < limites.DEL) posicionesDisponibles.push('DEL');
    
    return posicionesDisponibles;
  };

  const MarketScreen = () => {
    const [filtro, setFiltro] = useState('');
    const [posicionFiltro, setPosicionFiltro] = useState('');

    const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

    const handleFichar = async (jugadorId) => {
      try {
        const jugador = mercado.find(j => j.id === jugadorId);
        
        if (!jugador) {
          alert('Jugador no encontrado');
          return;
        }
        
        // Determinar si el jugador irá al banquillo
        const vaAlBanquillo = jugadorVaAlBanquillo(jugador.posicion);
        
        if (vaAlBanquillo) {
          const confirmacion = window.confirm(
            `No hay espacio en el campo para un ${jugador.posicion_display}. ` +
            `¿Quieres fichar a ${jugador.nombre} para el banquillo?`
          );
          
          if (!confirmacion) return;
        }
        
        // Llamar a la API de fichaje (necesitarás modificar el backend para aceptar el parámetro de banquillo)
        await ficharJugador(equipoActual.id, jugadorId, vaAlBanquillo);
        await cargarDatosIniciales();
        
        const mensaje = vaAlBanquillo 
          ? `✅ ${jugador.nombre} fichado para el banquillo`
          : `✅ ${jugador.nombre} fichado para el campo`;
        
        alert(mensaje);
        
      } catch (err) {
        alert('❌ Error al fichar: ' + err.message);
      }
    };

    const mercadoFiltrado = mercado.filter(j => {
      const matchNombre = j.nombre.toLowerCase().includes(filtro.toLowerCase());
      const matchPosicion = posicionFiltro === '' || j.posicion === posicionFiltro;
      return matchNombre && matchPosicion;
    });

    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar role={isAdmin ? 'admin' : 'user'} />
        <div className="p-6">
          <div className="mb-6 bg-white p-6 rounded-lg shadow border-2 border-gray-300">
            <h2 className="text-2xl font-bold mb-4">Mercado de Fichajes</h2>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 border-2 border-gray-300 p-3 rounded bg-gray-50 flex items-center gap-2">
                <Search size={20} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  className="bg-transparent outline-none flex-1"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>
              <select 
                className="border-2 border-gray-300 p-3 rounded bg-white"
                value={posicionFiltro}
                onChange={(e) => setPosicionFiltro(e.target.value)}
              >
                <option value="">Todas las posiciones</option>
                <option value="POR">Portero</option>
                <option value="DEF">Defensa</option>
                <option value="DEL">Delantero</option>
              </select>
            </div>
            <div className="bg-blue-50 p-3 rounded border border-blue-300 text-sm">
              💰 Presupuesto disponible: {equipoActual && formatValue(equipoActual.presupuesto)}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
            <h3 className="text-xl font-bold mb-4">Jugadores Disponibles ({mercadoFiltrado.length})</h3>
            {mercadoFiltrado.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay jugadores disponibles</p>
            ) : (
              <div className="space-y-3">
                {mercadoFiltrado.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded border-2 border-gray-300 hover:bg-gray-100">
                    <div className="flex-1">
                      <div className="font-medium">{player.nombre}</div>
                      <div className="text-sm text-gray-600">{player.posicion_display} • {formatValue(player.valor)} • {player.puntos_totales} pts</div>
                    </div>
                    <button 
                      onClick={() => handleFichar(player.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Fichar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const RankingsScreen = () => (
    <div className="min-h-screen bg-gray-100">
      <NavBar role={isAdmin ? 'admin' : 'user'} />
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
          <h2 className="text-2xl font-bold mb-4">Clasificación - {ligaActual?.nombre}</h2>
          <div className="mb-4 text-sm text-gray-600">Jornada {ligaActual?.jornada_actual} de 30</div>
          
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300 text-left">
                <th className="p-3">Pos</th>
                <th className="p-3">Equipo</th>
                <th className="p-3">Manager</th>
                <th className="p-3 text-right">Puntos</th>
                <th className="p-3 text-right">Presupuesto</th>
              </tr>
            </thead>
            <tbody>
              {clasificacion.map((item) => (
                <tr 
                  key={item.equipo_id} 
                  className={`border-b border-gray-200 ${item.equipo_id === equipoActual?.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-3 font-bold">{item.posicion}</td>
                  <td className="p-3 font-medium">{item.nombre}</td>
                  <td className="p-3 text-gray-600">{item.usuario}</td>
                  <td className="p-3 text-right font-bold">{item.puntos_totales}</td>
                  <td className="p-3 text-right text-green-600">€{(item.presupuesto / 1000000).toFixed(1)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const AdminScreen = ({ jugadores, ligaActual, setCurrentScreen, asignarPuntos, cargarDatosIniciales }) => {
    const [puntuaciones, setPuntuaciones] = useState({});
    const [nuevaJornadaNumero, setNuevaJornadaNumero] = useState('');
    const [vista, setVista] = useState('jornadas');
    const [busqueda, setBusqueda] = useState('');
    const [filtroEquipo, setFiltroEquipo] = useState('todos');
    const [jornadaSeleccionada, setJornadaSeleccionada] = useState(ligaActual?.jornada_actual || 1);
    const [jornadas, setJornadas] = useState([]);
    const [jornadaDetalle, setJornadaDetalle] = useState(null);
    const [partidos, setPartidos] = useState([]);
    const [equiposReales, setEquiposReales] = useState([]);
    const [nuevoPartido, setNuevoPartido] = useState({ equipo_local: '', equipo_visitante: '' });
    
    const jugadoresList = jugadores || [];
    

    // Cargar jornadas y equipos al montar el componente
    useEffect(() => {
        cargarJornadas();
        cargarEquiposReales();
    }, []);

    const cargarJornadas = async () => {
        try {
            const response = await fetch(`${API_URL}/jornadas/`);
            if (response.ok) {
                const data = await response.json();
                setJornadas(data);
            }
        } catch (error) {
            console.error('Error cargando jornadas:', error);
        }
    };

    const cargarEquiposReales = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/equipos-reales/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setEquiposReales(data);
            } else {
                console.error('Error cargando equipos reales');
            }
        } catch (error) {
            console.error('Error cargando equipos reales:', error);
        }
    };

    const cargarPartidosJornada = async (jornadaId) => {
      try {
          const token = localStorage.getItem('access_token');
          const response = await fetch(`${API_URL}/jornadas/${jornadaId}/partidos/`, {
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          if (response.ok) {
              const data = await response.json();
              setPartidos(data);
              setJornadaDetalle(jornadaId);
          }
      } catch (error) {
          console.error('Error cargando partidos:', error);
          setPartidos([]);
      }
  };

    const crearPartido = async (jornadaId) => {
      if (!nuevoPartido.equipo_local || !nuevoPartido.equipo_visitante) {
          alert('Selecciona ambos equipos');
          return;
      }

      try {
          const token = localStorage.getItem('access_token');
          const response = await fetch(`${API_URL}/partidos/`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`  // ← Agregar token aquí
              },
              body: JSON.stringify({
                  jornada: jornadaId,
                  equipo_local: parseInt(nuevoPartido.equipo_local),
                  equipo_visitante: parseInt(nuevoPartido.equipo_visitante),
                  fecha: new Date().toISOString()  // ← Agregar fecha actual
              }),
          });
          
          if (response.ok) {
              alert('Partido creado exitosamente');
              setNuevoPartido({ equipo_local: '', equipo_visitante: '' });
              await cargarPartidosJornada(jornadaId);
          } else {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'Error al crear partido');
          }
      } catch (err) {
          alert('Error al crear partido: ' + err.message);
      }
    };
    const eliminarJornada = async (jornadaId) => {
      if (window.confirm('¿Seguro que quieres eliminar esta jornada? Se eliminarán todos sus partidos.')) {
          try {
              const token = localStorage.getItem('access_token');
              const response = await fetch(`${API_URL}/jornadas/${jornadaId}/`, {
                  method: 'DELETE',
                  headers: {
                      'Authorization': `Bearer ${token}`
                  }
              });
              
              if (response.ok) {
                  alert('Jornada eliminada exitosamente');
                  await cargarJornadas();
              } else {
                  const errorData = await response.json();
                  throw new Error(errorData.detail || 'Error al eliminar jornada');
              }
          } catch (err) {
              alert('Error al eliminar jornada: ' + err.message);
          }
      }
    };
    const eliminarPartido = async (partidoId) => {
      if (window.confirm('¿Seguro que quieres eliminar este partido?')) {
          try {
              const token = localStorage.getItem('access_token');
              const response = await fetch(`${API_URL}/partidos/${partidoId}/`, {
                  method: 'DELETE',
                  headers: {
                      'Authorization': `Bearer ${token}`  // ← Agregar token aquí
                  }
              });
              
              if (response.ok) {
                  alert('Partido eliminado exitosamente');
                  await cargarPartidosJornada(jornadaDetalle);
              } else {
                  const errorData = await response.json();
                  throw new Error(errorData.detail || 'Error al eliminar partido');
              }
          } catch (err) {
              alert('Error al eliminar partido: ' + err.message);
          }
      }
   };

    // Obtener lista única de equipos para el filtro de jugadores
    const equiposFiltro = [...new Set(jugadoresList.map(j => j.equipo_nombre).filter(Boolean))];

    // Filtrar jugadores según búsqueda y equipo
    const jugadoresFiltrados = jugadoresList.filter(jugador => {
        const coincideBusqueda = jugador.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                               jugador.equipo_nombre?.toLowerCase().includes(busqueda.toLowerCase());
        const coincideEquipo = filtroEquipo === 'todos' || jugador.equipo_nombre === filtroEquipo;
        return coincideBusqueda && coincideEquipo;
    });

    const handlePuntuacionChange = (jugadorId, puntos) => {
        setPuntuaciones(prev => ({
            ...prev,
            [jugadorId]: parseInt(puntos) || 0
        }));
    };

    const handleAsignarPuntos = async () => {
        if (Object.keys(puntuaciones).length === 0) {
            alert('No hay puntuaciones para asignar');
            return;
        }

        const puntosArray = Object.entries(puntuaciones).map(([jugador_id, puntos]) => ({
            jugador_id: parseInt(jugador_id),
            puntos
        }));

        try {
            await asignarPuntos(jornadaSeleccionada, puntosArray);
            alert(`Puntos asignados exitosamente para la jornada ${jornadaSeleccionada}`);
            setPuntuaciones({});
            await cargarDatosIniciales();
        } catch (err) {
            alert('Error al asignar puntos: ' + err.message);
        }
    };

  const handleCrearJornada = async () => {
    if (!nuevaJornadaNumero) {
        alert('Ingresa un número de jornada');
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            throw new Error('No hay sesión activa');
        }

        const response = await fetch(`${API_URL}/jornadas/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                numero: parseInt(nuevaJornadaNumero)
            }),
        });
        
        if (response.ok) {
            alert('Jornada creada exitosamente');
            setNuevaJornadaNumero('');
            await cargarJornadas();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Error ${response.status}`);
        }
    } catch (err) {
        alert('Error al crear jornada: ' + err.message);
        console.error('Error detallado:', err);
    }
  };
    const limpiarFiltros = () => {
        setBusqueda('');
        setFiltroEquipo('todos');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Navbar principal */}
            <div className="bg-yellow-600 text-white p-4 shadow-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Settings size={28} />
                        <h1 className="text-xl font-bold">Panel de Administración</h1>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                localStorage.removeItem('access_token');
                                localStorage.removeItem('refresh_token');
                                setCurrentScreen('login');
                            }}
                            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 flex items-center gap-2"
                        >
                            <LogOut size={18} /> Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="mb-6 bg-yellow-50 p-6 rounded-lg shadow border-2 border-yellow-400">
                    <h2 className="text-2xl font-bold mb-2">Panel de Administración</h2>
                    <p className="text-sm text-gray-600">Gestiona jornadas, partidos, puntuaciones y jugadores</p>
                </div>

                {/* Barra interna para cambiar de vista */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setVista('jornadas')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium border-b-4 transition-all ${
                            vista === 'jornadas'
                                ? 'bg-white border-yellow-500 text-yellow-700'
                                : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                        <Calendar size={18} /> Calendario
                    </button>
                    <button
                        onClick={() => setVista('puntuaciones')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium border-b-4 transition-all ${
                            vista === 'puntuaciones'
                                ? 'bg-white border-yellow-500 text-yellow-700'
                                : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                        <Star size={18} /> Puntuaciones
                    </button>
                </div>

                {/* Contenido dinámico según la vista */}
                {vista === 'jornadas' ? (
                    <div className="space-y-6">
                        {/* Panel para crear nueva jornada */}
                        <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
                            <h3 className="text-xl font-bold mb-4">Crear Nueva Jornada</h3>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-2">Número de Jornada</label>
                                    <input
                                        type="number"
                                        value={nuevaJornadaNumero}
                                        onChange={(e) => setNuevaJornadaNumero(e.target.value)}
                                        className="w-full border-2 border-gray-300 p-3 rounded"
                                        placeholder="Ej: 5"
                                    />
                                </div>
                                <button
                                    onClick={handleCrearJornada}
                                    className="bg-green-600 text-white p-3 rounded font-medium hover:bg-green-700 whitespace-nowrap"
                                >
                                    + Crear Jornada
                                </button>
                            </div>
                        </div>

                        {/* Panel de jornadas existentes */}
                        <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
                            <h3 className="text-xl font-bold mb-4">Jornadas Existentes</h3>
                            {jornadas.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No hay jornadas creadas</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {jornadas.map((jornada) => (
                                        <div key={jornada.id} className="border-2 border-gray-300 rounded-lg p-4 hover:border-yellow-500 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div 
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() => cargarPartidosJornada(jornada.id)}
                                                >
                                                    <h4 className="font-bold text-lg">Jornada {jornada.numero}</h4>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                                                        {jornada.partidos_count || 0} partidos
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            eliminarJornada(jornada.id);
                                                        }}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                        title="Eliminar jornada"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Detalles de partidos si esta es la jornada seleccionada */}
                                            {jornadaDetalle === jornada.id && (
                                                <div className="mt-4 space-y-4">
                                                    {/* Lista de partidos */}
                                                    <div className="space-y-2">
                                                        <h5 className="font-semibold text-sm text-gray-700">Partidos:</h5>
                                                        {partidos.length === 0 ? (
                                                            <p className="text-sm text-gray-500 text-center py-2">No hay partidos en esta jornada</p>
                                                        ) : (
                                                            partidos.map((partido) => (
                                                                <div key={partido.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                                    <div className="text-sm">
                                                                        <span className="font-medium">{partido.equipo_local_nombre}</span>
                                                                        <span className="mx-2">vs</span>
                                                                        <span className="font-medium">{partido.equipo_visitante_nombre}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            eliminarPartido(partido.id);
                                                                        }}
                                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                                    >
                                                                        Eliminar
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    {/* Formulario para crear nuevo partido */}
                                                    <div className="border-t pt-3">
                                                        <h5 className="font-semibold text-sm text-gray-700 mb-2">Crear Nuevo Partido:</h5>
                                                        <div className="flex gap-2 mb-2">
                                                            <select
                                                                value={nuevoPartido.equipo_local}
                                                                onChange={(e) => setNuevoPartido(prev => ({ ...prev, equipo_local: e.target.value }))}
                                                                className="flex-1 border border-gray-300 p-2 rounded text-sm"
                                                            >
                                                                <option value="">Equipo Local</option>
                                                                {equiposReales.map(equipo => (
                                                                    <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
                                                                ))}
                                                            </select>
                                                            <select
                                                                value={nuevoPartido.equipo_visitante}
                                                                onChange={(e) => setNuevoPartido(prev => ({ ...prev, equipo_visitante: e.target.value }))}
                                                                className="flex-1 border border-gray-300 p-2 rounded text-sm"
                                                            >
                                                                <option value="">Equipo Visitante</option>
                                                                {equiposReales.map(equipo => (
                                                                    <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                crearPartido(jornada.id);
                                                            }}
                                                            className="w-full bg-blue-600 text-white p-2 rounded text-sm hover:bg-blue-700"
                                                        >
                                                            + Añadir Partido
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                      </div>
                ) : (
                    // Vista de puntuaciones (se mantiene igual)
                    <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
                        <div className="flex flex-col lg:flex-row gap-4 mb-6">
                            {/* Selector de Jornada */}
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-2">Jornada</label>
                                <select
                                    value={jornadaSeleccionada}
                                    onChange={(e) => setJornadaSeleccionada(parseInt(e.target.value))}
                                    className="w-full border-2 border-gray-300 p-3 rounded bg-white"
                                >
                                    {[...Array(ligaActual?.jornada_actual || 1).keys()].map(i => (
                                        <option key={i + 1} value={i + 1}>
                                            Jornada {i + 1}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Buscador */}
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-2">Buscar Jugador</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="w-full border-2 border-gray-300 p-3 pl-10 rounded"
                                        placeholder="Nombre o equipo..."
                                    />
                                </div>
                            </div>

                            {/* Filtro por Equipo */}
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-2">Filtrar por Equipo</label>
                                <select
                                    value={filtroEquipo}
                                    onChange={(e) => setFiltroEquipo(e.target.value)}
                                    className="w-full border-2 border-gray-300 p-3 rounded bg-white"
                                >
                                    <option value="todos">Todos los equipos</option>
                                    {equiposFiltro.map(equipo => (
                                        <option key={equipo} value={equipo}>{equipo}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Botón Limpiar */}
                            <div className="flex items-end">
                                <button
                                    onClick={limpiarFiltros}
                                    className="bg-gray-500 text-white p-3 rounded font-medium hover:bg-gray-600 whitespace-nowrap"
                                >
                                    Limpiar Filtros
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold mb-4">Asignar Puntos - Jornada {jornadaSeleccionada}</h3>
                        
                        <div className="mb-4 text-sm text-gray-600">
                            Mostrando {jugadoresFiltrados.length} de {jugadoresList.length} jugadores
                        </div>
                        
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {jugadoresFiltrados.map((player) => (
                                <div key={player.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded border-2 border-gray-300">
                                    <div className="flex-1">
                                        <div className="font-medium">{player.nombre}</div>
                                        <div className="text-sm text-gray-600">
                                            {player.posicion_display} • {player.equipo_nombre} • €{(player.valor / 1000000).toFixed(1)}M • {player.puntos_totales} pts totales
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600">Puntos:</label>
                                        <input
                                            type="number"
                                            className="w-20 border-2 border-gray-300 p-2 rounded text-center"
                                            placeholder="0"
                                            value={puntuaciones[player.id] || ''}
                                            onChange={(e) => handlePuntuacionChange(player.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t-2 border-gray-300">
                            <button
                                onClick={handleAsignarPuntos}
                                className="w-full bg-green-600 text-white p-4 rounded font-bold hover:bg-green-700"
                            >
                                Aplicar Puntos a Jornada {jornadaSeleccionada}
                            </button>
                            <p className="text-sm text-gray-600 mt-2 text-center">
                                Los valores se recalcularán automáticamente (€0.1M por punto)
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  };

  const CalendarScreen = () => {
    const [jornadas, setJornadas] = useState([]);
    const [partidos, setPartidos] = useState([]);
    const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      cargarCalendario();
    }, []);

    const cargarCalendario = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        
        // Cargar jornadas
        const jornadasResponse = await fetch(`${API_URL}/jornadas/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (jornadasResponse.ok) {
          const jornadasData = await jornadasResponse.json();
          setJornadas(jornadasData);
          
          // Si hay jornadas, cargar partidos de la primera
          if (jornadasData.length > 0) {
            setJornadaSeleccionada(jornadasData[0].id);
            await cargarPartidosJornada(jornadasData[0].id);
          }
        }
      } catch (error) {
        console.error('Error cargando calendario:', error);
      } finally {
        setLoading(false);
      }
    };

    const cargarPartidosJornada = async (jornadaId) => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_URL}/jornadas/${jornadaId}/partidos/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setPartidos(data);
        }
      } catch (error) {
        console.error('Error cargando partidos:', error);
        setPartidos([]);
      }
    };

    const handleJornadaChange = (jornadaId) => {
      setJornadaSeleccionada(jornadaId);
      cargarPartidosJornada(jornadaId);
    };

    if (loading) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
            <p className="text-xl">Cargando calendario...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar role={isAdmin ? 'admin' : 'user'} />
        
        <div className="p-6">
          <div className="mb-6 bg-white p-6 rounded-lg shadow border-2 border-blue-500">
            <h1 className="text-3xl font-bold text-center mb-2">📅 Calendario de Partidos</h1>
            <p className="text-center text-gray-600">Consulta los partidos de cada jornada</p>
          </div>

          {/* Selector de Jornada */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium mb-2">Seleccionar Jornada:</label>
            <select
              value={jornadaSeleccionada || ''}
              onChange={(e) => handleJornadaChange(parseInt(e.target.value))}
              className="w-full border-2 border-gray-300 p-3 rounded"
            >
              <option value="">Selecciona una jornada</option>
              {jornadas.map(jornada => (
                <option key={jornada.id} value={jornada.id}>
                  Jornada {jornada.numero}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de Partidos */}
          <div className="bg-white rounded-lg shadow border-2 border-gray-300">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {jornadaSeleccionada ? `Partidos - Jornada ${jornadas.find(j => j.id === jornadaSeleccionada)?.numero}` : 'Selecciona una jornada'}
              </h2>
              
              {partidos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">No hay partidos en esta jornada</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {partidos.map(partido => (
                    <div key={partido.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-sm text-gray-500">
                          {new Date(partido.fecha).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          partido.jugado 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {partido.jugado ? 'Jugado' : 'Pendiente'}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-center flex-1">
                          <div className="font-bold text-lg">{partido.equipo_local_nombre}</div>
                          {partido.jugado && (
                            <div className="text-2xl font-bold text-blue-600">{partido.goles_local}</div>
                          )}
                        </div>
                        
                        <div className="mx-4 text-gray-400 font-bold">VS</div>
                        
                        <div className="text-center flex-1">
                          <div className="font-bold text-lg">{partido.equipo_visitante_nombre}</div>
                          {partido.jugado && (
                            <div className="text-2xl font-bold text-blue-600">{partido.goles_visitante}</div>
                          )}
                        </div>
                      </div>
                      
                      {partido.jugado && (
                        <div className="text-center mt-3">
                          <div className="text-sm text-gray-600">
                            Resultado: <span className="font-bold">{partido.goles_local} - {partido.goles_visitante}</span>
                          </div>
                        </div>
                      )}
                      
                      {!partido.jugado && (
                        <div className="text-center mt-3">
                          <div className="text-sm text-gray-500">Partido pendiente</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

const renderScreen = () => {
    switch(currentScreen) {
      case 'login': return <LoginScreen />;
      case 'dashboard': return <DashboardScreen />;
      case 'register': return <RegisterScreen />;
      case 'market': return <MarketScreen />;
      case 'calendar': return <CalendarScreen />;
      case 'rankings': return <RankingsScreen />;
      case 'admin': return (
        <AdminScreen 
          jugadores={jugadores}
          ligaActual={ligaActual}
          setCurrentScreen={setCurrentScreen}
          asignarPuntos={asignarPuntos}
          cargarDatosIniciales={cargarDatosIniciales}
        />
      );
      default: return <LoginScreen />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderScreen()}
    </div>
  );
};

export default FantasyFutsalWireframes;
