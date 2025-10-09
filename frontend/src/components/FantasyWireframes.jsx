import React, { useState, useEffect } from 'react';
import { Menu, Check, Users, TrendingUp, Trophy, Settings,Save, Edit, LogOut, Plus, Minus, Search, RefreshCw, Calendar, Star} from 'lucide-react';
import {
  getEquipo,
  getLiga,
  getLigas,
  intercambiarJugadores,
  getMercado,
  getClasificacion,
  getJugadores,
  ficharJugador,
  actualizarEstadosBanquillo,
  venderJugador,
  getCurrentUser,
  getJugadoresPorEquipo,
  loginUser,
  registerUser,
  logoutUser,
  asignarPuntos,
  getOfertasRecibidas,
  getMiEquipo,
  getEquipoByUsuario
} from '../services/api';
import MarketScreen from './mercado/MarketScreen';
import OfertasScreen from './ofertas/OfertasScreen';

const FantasyFutsalWireframes = () => {
  const API_URL = 'http://127.0.0.1:8000/api';
  const [currentScreen, setCurrentScreen] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentAuthScreen, setCurrentAuthScreen] = useState('login');
  const [datosUsuario, setDatosUsuario] = useState(null);

  // Estados para datos
  const [equipoActual, setEquipoActual] = useState(null);
  const [ligaActual, setLigaActual] = useState(null);
  const [mercado, setMercado] = useState([]);
  const [clasificacion, setClasificacion] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [ofertasRecibidas, setOfertasRecibidas] = useState([]);

  const screens = {
    login: 'Login/Registro',
    dashboard: 'Dashboard',
    market: 'Mercado',
    rankings: 'Clasificación',
    admin: 'Panel Admin',
    offersReceived: 'Ofertas'
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setCurrentScreen('login');
  };

  // Cargar ofertas recibidas pendientes
  const cargarOfertasPendientes = async () => {
    if (!equipoActual?.id) return;
    try {
      const ofertas = await getOfertasRecibidas(equipoActual.id);
      const pendientes = ofertas.filter(o => o.estado === 'pendiente');
      setOfertasRecibidas(pendientes);
    } catch (error) {
      console.error('Error cargando ofertas:', error);
    }
  };

  // Auto-refresh ofertas cada 30 segundos
  useEffect(() => {
    if (equipoActual?.id) {
      cargarOfertasPendientes();
      const interval = setInterval(cargarOfertasPendientes, 30000);
      return () => clearInterval(interval);
    }
  }, [equipoActual]);

  // Función para actualizar equipo y ofertas
  const handleUpdateEquipo = async () => {
    if (!datosUsuario) return;
    const datos = await cargarDatosIniciales(datosUsuario);
    setEquipoActual(datos.equipo);
    await cargarOfertasPendientes();
  };

const cargarDatosIniciales = async (usuario) => {
    if (!usuario) {
        throw new Error("Usuario no definido");
    }
    
    console.log("👨‍💼 Usuario", usuario.username, "Admin:", usuario.is_superuser || usuario.is_staff);
    
    try {
        const isAdmin = usuario.is_superuser || usuario.is_staff;
        
        if (isAdmin) {
            console.log("Usuario admin, cargando datos de administración");
            
            const jugadoresData = await getJugadores();
            
            console.log("✅ Datos admin cargados");
            
            const ligaPorDefecto = {
                id: 1,
                nombre: "Liga Principal", 
                jornada_actual: 1
            };
            
            return {
                usuario,
                ligaActual: ligaPorDefecto,
                jugadores: jugadoresData || [],
                equipo: null,
                presupuesto: 0
            };
            
        } else {
            console.log("Usuario normal, cargando datos de liga y equipo");
            
            // Obtener liga
            let ligaData;
            if (usuario.liga_id) {
                ligaData = await getLiga(usuario.liga_id);
            } else {
                try {
                    const ligasData = await getLigas();
                    ligaData = ligasData && ligasData.length > 0 ? ligasData[0] : null;
                } catch (error) {
                    console.log("⚠ No se pudieron cargar ligas, usando valor por defecto");
                    ligaData = {
                        id: 1,
                        nombre: "Liga Principal",
                        jornada_actual: 1
                    };
                }
            }
            
            if (!ligaData) {
                ligaData = {
                    id: 1,
                    nombre: "Liga Principal",
                    jornada_actual: 1
                };
            }
            
            // 🆕 MEJORADO: Buscar equipo con múltiples estrategias
            let equipoData = null;
            try {
                console.log(`🔍 Buscando equipo para usuario ID: ${usuario.id}`);
                
                // Intentar con usuario_id primero
                equipoData = await getEquipo(usuario.id);
                console.log("✅ Resultado búsqueda principal:", equipoData ? "ENCONTRADO" : "NO ENCONTRADO");
                
                // Si no funciona, intentar con la alternativa
                if (!equipoData) {
                    console.log("🔄 Intentando búsqueda alternativa...");
                    equipoData = await getEquipoByUsuario(usuario.id);
                    console.log("✅ Resultado búsqueda alternativa:", equipoData ? "ENCONTRADO" : "NO ENCONTRADO");
                }
                
                // Si aún no hay equipo, usar el endpoint /mi-equipo/
                if (!equipoData) {
                    console.log("🔄 Usando endpoint /mi-equipo/...");
                    equipoData = await getMiEquipo();
                    console.log("✅ Resultado /mi-equipo/:", equipoData ? "ENCONTRADO" : "NO ENCONTRADO");
                }
                
            } catch (error) {
                console.error("❌ Error buscando equipo:", error);
            }
            
            console.log("🎯 Equipo final encontrado:", equipoData);
            
            // 🆕 DEBUG MEJORADO - Verificar estructura del equipo
            if (equipoData) {
                console.log("📊 Estructura completa del equipo:", JSON.stringify(equipoData, null, 2));
                console.log("👥 Jugadores en equipoData:", equipoData.jugadores);
                console.log("🔢 Número de jugadores:", equipoData.jugadores ? equipoData.jugadores.length : 0);
                
                if (equipoData.jugadores && equipoData.jugadores.length > 0) {
                    console.log("🎯 Primer jugador ejemplo:", equipoData.jugadores[0]);
                    console.log("✅ Jugadores cargados correctamente en el equipo");
                } else {
                    console.log("❌ No hay jugadores en equipoData.jugadores");
                    
                    // 🆕 ESTRATEGIA MEJORADA para cargar jugadores manualmente
                    try {
                        console.log("🔄 Intentando cargar jugadores manualmente...");
                        
                        // Opción 1: Buscar jugadores por equipo
                        const jugadoresDelEquipo = await getJugadoresPorEquipo(equipoData.id);
                        console.log("👤 Jugadores por equipo API:", jugadoresDelEquipo.length);
                        
                        if (jugadoresDelEquipo.length > 0) {
                            equipoData.jugadores = jugadoresDelEquipo;
                            console.log("✅ Jugadores asignados manualmente desde API específica");
                        } else {
                            // Opción 2: Filtrar todos los jugadores
                            console.log("🔄 Intentando filtrado manual de todos los jugadores...");
                            const todosJugadores = await getJugadores();
                            const jugadoresFiltrados = todosJugadores.filter(j => j.equipo === equipoData.id);
                            console.log("👤 Jugadores filtrados manualmente:", jugadoresFiltrados.length);
                            
                            if (jugadoresFiltrados.length > 0) {
                                equipoData.jugadores = jugadoresFiltrados;
                                console.log("✅ Jugadores asignados manualmente por filtro");
                            } else {
                                console.log("⚠️ El equipo existe pero no tiene jugadores asignados en la base de datos");
                                
                                // 🆕 Verificar en la base de datos
                                console.log("💡 Posibles soluciones:");
                                console.log("   1. Verificar en Django Admin que los jugadores tengan este equipo asignado");
                                console.log("   2. Revisar el proceso de registro de usuarios");
                                console.log("   3. Contactar al administrador del sistema");
                            }
                        }
                    } catch (error) {
                        console.error("❌ Error cargando jugadores manualmente:", error);
                    }
                }
            } else {
                console.log("❌ No se pudo encontrar equipo para el usuario");
                console.log("💡 El usuario necesita crear un equipo o contactar al administrador");
            }
            
            return {
                usuario,
                ligaActual: ligaData,
                jugadores: [],
                equipo: equipoData,
                presupuesto: equipoData?.presupuesto || 0
            };
        }
    } catch (error) {
        console.error("❌ Error cargando datos iniciales:", error);
        
        return {
            usuario,
            ligaActual: {
                id: 1,
                nombre: "Liga Principal",
                jornada_actual: 1
            },
            jugadores: [],
            equipo: null,
            presupuesto: 0
        };
    }
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
        <button
          onClick={() => setCurrentScreen('offersReceived')}
          className="hover:text-gray-300 flex items-center gap-1 relative"
        >
          💸 Ofertas
          {ofertasRecibidas.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {ofertasRecibidas.length}
            </span>
          )}
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

  const RegisterScreen = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',    
        last_name: ''      
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
          console.log('🔐 Intentando login en:', `${API_URL}/auth/login/`);
          
          const data = await loginUser(username, password);
          
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh);
          
          console.log('✅ Login exitoso, token obtenido');
          
          const userData = await getCurrentUser();
          console.log('👤 Datos usuario:', userData);
          
          const isUserAdmin = userData.is_superuser || userData.is_staff || username === 'admin';
          setIsAdmin(isUserAdmin);
          
          // ✅ Cargar datos y guardarlos en el estado
          const datosIniciales = await cargarDatosIniciales(userData);
          setDatosUsuario(datosIniciales);
          setEquipoActual(datosIniciales.equipo);
          setCurrentScreen(isUserAdmin ? 'admin' : 'dashboard');
          
      } catch (error) {
          console.error('❌ Error en login:', error);
          setError(error.message || 'Error en el login');
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
  // Estados para gestión de cambios
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [modoCambio, setModoCambio] = useState(false);
  const [jugadorOrigenCambio, setJugadorOrigenCambio] = useState(null);
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [precioVenta, setPrecioVenta] = useState('');
  const [jugadorAVender, setJugadorAVender] = useState(null);
  const [mostrarModalOpciones, setMostrarModalOpciones] = useState(false);
  
  // 🆕 ESTADOS PARA LA ALINEACIÓN
  const [portero_titular, setPorteroTitular] = useState(null);
  const [defensas_titulares, setDefensasTitulares] = useState([]);
  const [delanteros_titulares, setDelanterosTitulares] = useState([]);
  const [banquillo, setBanquillo] = useState([]);
  const [alineacionCargada, setAlineacionCargada] = useState(false);

  // Efecto para cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (jugadorSeleccionado && !event.target.closest('.modal-content')) {
        setJugadorSeleccionado(null);
        setMostrarModalOpciones(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [jugadorSeleccionado]);

  // 🆕 FUNCIÓN PARA RECARGAR DATOS DEL EQUIPO
  const recargarDatosEquipo = async () => {
    try {
      console.log('🔄 Recargando datos del equipo...');
      const userData = await getCurrentUser();
      const nuevosDatos = await cargarDatosIniciales(userData);
      
      // Actualizar todos los estados
      setDatosUsuario(nuevosDatos);
      setEquipoActual(nuevosDatos.equipo);
      
      console.log('✅ Datos recargados correctamente');
      return nuevosDatos;
    } catch (error) {
      console.error('❌ Error recargando datos:', error);
      throw error;
    }
  };

  // 🆕 FUNCIÓN MEJORADA PARA DETERMINAR TITULARES Y BANQUILLO
  const determinarAlineacion = async (jugadores, equipoId) => {
    console.log('🎯 Determinando alineación...');
    
    const portero = jugadores.find(j => j.posicion === 'POR');
    const defensas = jugadores.filter(j => j.posicion === 'DEF');
    const delanteros = jugadores.filter(j => j.posicion === 'DEL');

    console.log(`📊 Jugadores por posición: POR:${portero ? 1 : 0}, DEF:${defensas.length}, DEL:${delanteros.length}`);

    // 🆕 LÓGICA MEJORADA: Usar en_banquillo si está definido, si no usar puntos
    let defensas_titulares, delanteros_titulares;

    // Si hay jugadores con en_banquillo definido, usarlos
    const defensasEnCampo = defensas.filter(d => d.en_banquillo === false);
    const delanterosEnCampo = delanteros.filter(d => d.en_banquillo === false);

    if (defensasEnCampo.length >= 2) {
      defensas_titulares = defensasEnCampo.slice(0, 2);
    } else {
      // Si no hay suficientes definidos, usar los mejores por puntos
      defensas_titulares = [...defensas]
        .sort((a, b) => b.puntos_totales - a.puntos_totales)
        .slice(0, 2);
    }

    if (delanterosEnCampo.length >= 2) {
      delanteros_titulares = delanterosEnCampo.slice(0, 2);
    } else {
      delanteros_titulares = [...delanteros]
        .sort((a, b) => b.puntos_totales - a.puntos_totales)
        .slice(0, 2);
    }

    const portero_titular = portero;

    console.log('🏆 Titulares seleccionados:');
    console.log('   POR:', portero_titular?.nombre);
    console.log('   DEF:', defensas_titulares.map(d => d.nombre));
    console.log('   DEL:', delanteros_titulares.map(d => d.nombre));

    // Determinar banquillo
    const titulares = [portero_titular, ...defensas_titulares, ...delanteros_titulares].filter(Boolean);
    const banquillo = jugadores.filter(jugador => !titulares.includes(jugador));

    console.log('🪑 Banquillo:', banquillo.map(b => b.nombre));

    // 🆕 PREPARAR DATOS PARA SINCRONIZAR
    const estadosParaSincronizar = jugadores.map(jugador => ({
      jugador_id: jugador.id,
      en_banquillo: !titulares.includes(jugador)
    }));

    // 🆕 SINCRONIZAR CON EL BACKEND
    try {
      console.log('🔄 Sincronizando estados con el backend...');
      await actualizarEstadosBanquillo(equipoId, estadosParaSincronizar);
      console.log('✅ Estados sincronizados correctamente');
    } catch (error) {
      console.error('❌ Error sincronizando estados:', error);
      // No bloquear la UI si falla la sincronización
    }

    return {
      portero_titular,
      defensas_titulares,
      delanteros_titulares,
      banquillo
    };
  };

  // 🆕 EFFECT PARA CARGAR LA ALINEACIÓN CUANDO CAMBIA EL EQUIPO
  useEffect(() => {
    const cargarAlineacion = async () => {
      if (equipoActual && equipoActual.jugadores) {
        try {
          console.log('🔄 Cargando alineación...');
          const alineacion = await determinarAlineacion(equipoActual.jugadores, equipoActual.id);
          
          setPorteroTitular(alineacion.portero_titular);
          setDefensasTitulares(alineacion.defensas_titulares);
          setDelanterosTitulares(alineacion.delanteros_titulares);
          setBanquillo(alineacion.banquillo);
          setAlineacionCargada(true);
          
          console.log('✅ Alineación cargada correctamente');
        } catch (error) {
          console.error('❌ Error cargando alineación:', error);
          setAlineacionCargada(true); // Marcar como cargada incluso si hay error
        }
      }
    };

    cargarAlineacion();
  }, [equipoActual]); // Se ejecuta cuando cambia equipoActual

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
            onClick={recargarDatosEquipo}
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

  // 🆕 MOSTRAR LOADING MIENTRAS SE CARGA LA ALINEACIÓN
  if (!alineacionCargada) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl">Cargando alineación...</p>
        </div>
      </div>
    );
  }

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;
  const calcularPuntosTotales = () => equipoActual.jugadores.reduce((sum, j) => sum + j.puntos_totales, 0);
  const miPosicion = clasificacion.findIndex(e => e.equipo_id === equipoActual.id) + 1;

  const totalJugadores = equipoActual.jugadores.length;
  const maxJugadores = 13;

  // 🆕 FUNCIÓN PARA ETIQUETAS DE POSICIÓN
  const getEtiquetaPosicion = (posicion) => {
    const etiquetas = {
      'POR': 'POR',
      'DEF': 'DEF', 
      'DEL': 'ATA'  // 🎯 DEL se muestra como ATA
    };
    return etiquetas[posicion] || posicion;
  };

  // Función para manejar clic en jugador
  const handleClicJugador = (jugador) => {
    if (modoCambio && jugadorOrigenCambio) {
      // Segundo clic en modo cambio - realizar el intercambio
      realizarCambio(jugadorOrigenCambio, jugador);
    } else {
      // Clic normal - mostrar opciones
      setJugadorSeleccionado(jugador);
      setMostrarModalOpciones(true);
    }
  };

  // Función para iniciar modo cambio
  const iniciarModoCambio = (jugador) => {
    setJugadorOrigenCambio(jugador);
    setModoCambio(true);
    setMostrarModalOpciones(false);
    setJugadorSeleccionado(null);
  };

  // Función para cancelar modo cambio
  const cancelarModoCambio = () => {
    setModoCambio(false);
    setJugadorOrigenCambio(null);
  };

  // 🆕 FUNCIÓN CORREGIDA PARA REALIZAR EL CAMBIO
  const realizarCambio = async (origen, destino) => {
    console.log('🔄 REALIZAR CAMBIO - Datos completos:');
    console.log('   Origen:', origen);
    console.log('   Destino:', destino);
    console.log('   Equipo Actual:', equipoActual);
    
    // Validar que sean de la misma posición
    if (origen.posicion !== destino.posicion) {
      alert(`❌ No puedes cambiar un ${origen.posicion} por un ${destino.posicion}. Deben ser de la misma posición.`);
      cancelarModoCambio();
      return;
    }

    try {
      console.log('📡 Llamando a intercambiarJugadores...');
      await intercambiarJugadores(equipoActual.id, origen.id, destino.id);
      
      console.log('🔄 Recargando datos...');
      await recargarDatosEquipo();
      
      alert(`✅ Cambio realizado: ${origen.nombre} ↔ ${destino.nombre}`);
    } catch (err) {
      console.error('❌ Error en realizarCambio:', err);
      alert('❌ Error al realizar el cambio: ' + err.message);
    } finally {
      cancelarModoCambio();
    }
  };

  // Función para determinar el estado visual del jugador
  const getEstadoJugador = (jugador) => {
    if (modoCambio) {
      if (jugador.id === jugadorOrigenCambio?.id) {
        return 'origen-cambio'; // Jugador origen del cambio
      } else if (jugador.posicion === jugadorOrigenCambio?.posicion) {
        return 'apto-cambio'; // Jugadores de la misma posición (aptos)
      } else {
        return 'no-apto-cambio'; // Jugadores de diferente posición
      }
    } else if (jugador.id === jugadorSeleccionado?.id) {
      return 'seleccionado'; // Jugador seleccionado normal
    }
    return 'normal'; // Estado normal
  };

  // Función para abrir modal de venta
  const abrirModalVenta = (jugador) => {
    setJugadorAVender(jugador);
    setPrecioVenta(jugador.valor.toString());
    setMostrarModalVenta(true);
    setJugadorSeleccionado(null);
    setMostrarModalOpciones(false);
  };

  // Función para cerrar modal de venta
  const cerrarModalVenta = () => {
    setMostrarModalVenta(false);
    setJugadorAVender(null);
    setPrecioVenta('');
  };

  // 🆕 FUNCIÓN CORREGIDA PARA CONFIRMAR VENTA
  const confirmarVentaMercado = async () => {
    if (!jugadorAVender || !precioVenta) return;

    try {
      await venderJugador(equipoActual.id, jugadorAVender.id, parseInt(precioVenta));
      await recargarDatosEquipo();
      cerrarModalVenta();
      alert('✅ Jugador puesto en venta en el mercado');
    } catch (err) {
      alert('❌ Error al poner en venta: ' + err.message);
    }
  };

  const puedeVenderJugador = (jugador) => {
    if (!equipoActual || !equipoActual.jugadores) return false;

    const jugadores = equipoActual.jugadores;
    
    const contarPorPosicion = {
      'POR': jugadores.filter(j => j.posicion === 'POR').length,
      'DEF': jugadores.filter(j => j.posicion === 'DEF').length,
      'DEL': jugadores.filter(j => j.posicion === 'DEL').length
    };

    if (jugador.posicion === 'POR' && contarPorPosicion.POR === 1) return false;
    if (jugador.posicion === 'DEF' && contarPorPosicion.DEF === 2) return false;
    if (jugador.posicion === 'DEL' && contarPorPosicion.DEL === 2) return false;

    return true;
  };

  // Función para manejar venta desde el botón del PlayerCard
  const handleVenderJugador = (jugador) => {
    if (!puedeVenderJugador(jugador)) {
      const mensajesError = {
        'POR': 'No puedes vender a tu único portero.',
        'DEF': 'No puedes vender este defensa (mínimo 2).',
        'DEL': 'No puedes vender este delantero (mínimo 2).'
      };
      alert(mensajesError[jugador.posicion]);
      return;
    }
    abrirModalVenta(jugador);
  };

  // PlayerCard modificado para soportar los diferentes estados
  const PlayerCard = ({ player, onRemove, onSelect, estado = 'normal' }) => {
    const getBadgeColor = (pts) => {
      if (pts > 0) return 'bg-green-500';
      if (pts < 0) return 'bg-red-500';
      return 'bg-gray-400';
    };

    const formatValue = (value) => {
      return `€${(value / 1000000).toFixed(1)}M`;
    };

    // Determinar estilos según el estado
    const getEstilosPorEstado = () => {
      switch(estado) {
        case 'origen-cambio':
          return {
            container: 'scale-110 transform ring-4 ring-yellow-500 bg-yellow-50',
            badge: 'bg-yellow-600',
            icon: 'text-yellow-600',
            card: 'bg-yellow-100 border-2 border-yellow-500'
          };
        case 'apto-cambio':
          return {
            container: 'scale-105 transform ring-2 ring-green-400 bg-green-50 cursor-pointer hover:scale-110',
            badge: 'bg-green-600',
            icon: 'text-green-600',
            card: 'bg-green-50 border-2 border-green-400'
          };
        case 'no-apto-cambio':
          return {
            container: 'opacity-50 cursor-not-allowed',
            badge: 'bg-gray-600',
            icon: 'text-gray-400',
            card: 'bg-gray-100 border-gray-300'
          };
        case 'seleccionado':
          return {
            container: 'scale-110 transform',
            badge: 'bg-green-600',
            icon: 'text-green-600',
            card: 'bg-green-100 border-2 border-green-500'
          };
        default:
          return {
            container: '',
            badge: 'bg-gray-900/80',
            icon: 'text-blue-600 group-hover:text-blue-800',
            card: 'bg-white/90'
          };
      }
    };

    const estilos = getEstilosPorEstado();

    return (
      <div 
        className={`flex flex-col items-center cursor-pointer group relative transition-all ${estilos.container}`}
        onClick={() => onSelect && onSelect(player)}
      >
        {/* 🎯 CORREGIDO: Usar etiqueta correcta */}
        <div className={`mb-1 text-white text-xs font-bold px-2 py-0.5 rounded ${estilos.badge}`}>
          {getEtiquetaPosicion(player.posicion)}
        </div>
        <div className="relative">
          <Users 
            size={48} 
            className={`transition-colors drop-shadow-lg ${estilos.icon}`} 
          />
          <div className={`absolute -top-1 -right-1 ${getBadgeColor(player.puntos_totales)} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white`}>
            {player.puntos_totales}
          </div>
        </div>
        <div className={`mt-2 backdrop-blur px-3 py-1 rounded-lg shadow-md text-center min-w-[120px] transition-all ${estilos.card}`}>
          <div className="font-bold text-sm">{player.nombre}</div>
          <div className="text-xs text-gray-600">
            {formatValue(player.valor)} • {player.equipo_real}
          </div>
        </div>
        
        {/* Botón de eliminar/vender (solo en estado normal) */}
        {onRemove && estado === 'normal' && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove(player);
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Minus size={16} />
          </button>
        )}

        {/* Indicadores de estado */}
        {estado === 'origen-cambio' && (
          <div className="absolute -top-1 -left-1 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
            <span className="text-[10px] font-bold">↔</span>
          </div>
        )}
        {estado === 'apto-cambio' && (
          <div className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
            <span className="text-[10px] font-bold">✓</span>
          </div>
        )}
      </div>
    );
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
            <div className="flex gap-2">
              {modoCambio ? (
                <button
                  onClick={cancelarModoCambio}
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                >
                  ✕ Cancelar Cambio
                </button>
              ) : (
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
              )}
            </div>
          </div>
          
          {/* Información del modo cambio */}
          {modoCambio && jugadorOrigenCambio && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                🔄 <strong>Modo cambio activado:</strong> Has seleccionado <strong>{jugadorOrigenCambio.nombre}</strong>. 
                Ahora selecciona un {jugadorOrigenCambio.posicion === 'POR' ? 'portero' : 
                jugadorOrigenCambio.posicion === 'DEF' ? 'defensa' : 'delantero'} para intercambiarlo.
              </p>
            </div>
          )}
          
          {jugadorSeleccionado && !modoCambio && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                💡 <strong>{jugadorSeleccionado.nombre}</strong> seleccionado. Elige una opción del menú.
              </p>
            </div>
          )}
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
              {/* Delanteros TITULARES */}
              <div className="flex justify-around px-24">
                {delanteros_titulares.map((del, idx) => (
                  <PlayerCard 
                    key={del.id} 
                    player={del}
                    onSelect={handleClicJugador}
                    estado={getEstadoJugador(del)}
                  />
                ))}
              </div>

              {/* Defensas TITULARES */}
              <div className="flex justify-around px-24">
                {defensas_titulares.map((def, idx) => (
                  <PlayerCard 
                    key={def.id} 
                    player={def}
                    onSelect={handleClicJugador}
                    estado={getEstadoJugador(def)}
                  />
                ))}
              </div>

              {/* Portero TITULAR */}
              <div className="flex justify-center">
                {portero_titular && (
                  <PlayerCard 
                    player={portero_titular}
                    onSelect={handleClicJugador}
                    estado={getEstadoJugador(portero_titular)}
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
                <PlayerCard 
                  key={jugador.id} 
                  player={jugador} 
                  onRemove={modoCambio ? null : handleVenderJugador}
                  onSelect={handleClicJugador}
                  estado={getEstadoJugador(jugador)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modal de opciones cuando un jugador está seleccionado */}
        {mostrarModalOpciones && jugadorSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 modal-content">
              <h3 className="text-xl font-bold mb-4">Opciones para {jugadorSeleccionado.nombre}</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold">{jugadorSeleccionado.nombre}</p>
                <p className="text-sm text-gray-600">
                  {jugadorSeleccionado.posicion === 'POR' ? 'Portero' : 
                   jugadorSeleccionado.posicion === 'DEF' ? 'Defensa' : 'Delantero'}
                </p>
                <p className="text-sm">Valor: {formatValue(jugadorSeleccionado.valor)}</p>
                <p className="text-sm">Puntos: {jugadorSeleccionado.puntos_totales}</p>
              </div>

              <div className="flex gap-2 flex-col">
                <button
                  onClick={() => iniciarModoCambio(jugadorSeleccionado)}
                  className="bg-blue-600 text-white py-3 px-4 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Cambiar
                </button>
                <button
                  onClick={() => {
                    if (!puedeVenderJugador(jugadorSeleccionado)) {
                      const mensajesError = {
                        'POR': 'No puedes vender a tu único portero.',
                        'DEF': 'No puedes vender este defensa (mínimo 2).',
                        'DEL': 'No puedes vender este delantero (mínimo 2).'
                      };
                      alert(mensajesError[jugadorSeleccionado.posicion]);
                      return;
                    }
                    abrirModalVenta(jugadorSeleccionado);
                  }}
                  className="bg-red-600 text-white py-3 px-4 rounded text-sm hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <span>💰</span>
                  Poner en el mercado
                </button>
                <button
                  onClick={() => {
                    setJugadorSeleccionado(null);
                    setMostrarModalOpciones(false);
                  }}
                  className="bg-gray-600 text-white py-3 px-4 rounded text-sm hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <span>✕</span>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de venta en mercado */}
        {mostrarModalVenta && jugadorAVender && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 modal-content">
              <h3 className="text-xl font-bold mb-4">Poner en el Mercado</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold">{jugadorAVender.nombre}</p>
                <p className="text-sm text-gray-600">
                  {jugadorAVender.posicion === 'POR' ? 'Portero' : 
                   jugadorAVender.posicion === 'DEF' ? 'Defensa' : 'Delantero'}
                </p>
                <p className="text-sm">Valor actual: {formatValue(jugadorAVender.valor)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio de venta:
                </label>
                <input
                  type="number"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Ej: 5000000"
                  min={0}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Precio sugerido: {formatValue(jugadorAVender.valor)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirmarVentaMercado}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                >
                  Confirmar Venta
                </button>
                <button
                  onClick={cerrarModalVenta}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const AdminScreen = ({ jugadores, ligaActual, setCurrentScreen, asignarPuntos, cargarDatosIniciales }) => {
      const [puntuaciones, setPuntuaciones] = useState({});
      const [nuevaJornadaNumero, setNuevaJornadaNumero] = useState('');
      const [vista, setVista] = useState('jornadas');
      const [busqueda, setBusqueda] = useState('');
      const [filtroEquipo, setFiltroEquipo] = useState('todos');
      const [jornadas, setJornadas] = useState([]);
      const [partidos, setPartidos] = useState({});
      const [equiposReales, setEquiposReales] = useState([]);
      const [nuevosPartidos, setNuevosPartidos] = useState({});
      const [resultadosEditando, setResultadosEditando] = useState({});
      const jugadoresList = jugadores || [];
      const liga = ligaActual || { jornada_actual: 1 };
      const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null);

      useEffect(() => {
          cargarJornadas();
          cargarEquiposReales();
      }, []);

      useEffect(() => {
          if (jornadaSeleccionada && vista === 'resultados') {
              cargarPartidosJornada(jornadaSeleccionada);
          }
      }, [jornadaSeleccionada, vista]);

      const cargarJornadas = async () => {
          try {
              const response = await fetch(`${API_URL}/jornadas/`);
              if (response.ok) {
                  const data = await response.json();
                  setJornadas(data);
                  
                  const inicialNuevosPartidos = {};
                  data.forEach(jornada => {
                      inicialNuevosPartidos[jornada.id] = { equipo_local: '', equipo_visitante: '' };
                      cargarPartidosJornada(jornada.id);
                  });
                  setNuevosPartidos(inicialNuevosPartidos);

                  if (data.length > 0) {
                      setJornadaSeleccionada(data[0].id);
                  }
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
                setPartidos(prev => ({
                    ...prev,
                    [jornadaId]: data
                }));
                
                // Inicializar resultados editando con valores por defecto
                const resultadosInicial = {};
                data.forEach(partido => {
                    resultadosInicial[partido.id] = {
                        goles_local: partido.goles_local ?? 0,
                        goles_visitante: partido.goles_visitante ?? 0
                    };
                });
                setResultadosEditando(prev => ({
                    ...prev,
                    [jornadaId]: resultadosInicial
                }));
            }
        } catch (error) {
            console.error('Error cargando partidos:', error);
            setPartidos(prev => ({
                ...prev,
                [jornadaId]: []
            }));
        }
      };

    // Función para verificar si un equipo ya está en un partido de la jornada
    const equipoYaEnJornada = (jornadaId, equipoId, tipoEquipo) => {
        const partidosJornada = partidos[jornadaId] || [];
        return partidosJornada.some(partido => 
            partido.equipo_local === equipoId || 
            partido.equipo_visitante === equipoId
        );
    };

    // Función para obtener equipos disponibles para una jornada
    const getEquiposDisponibles = (jornadaId, tipoEquipo) => {
        const partidosJornada = partidos[jornadaId] || [];
        const equiposEnJornada = new Set();
        
        partidosJornada.forEach(partido => {
            equiposEnJornada.add(partido.equipo_local);
            equiposEnJornada.add(partido.equipo_visitante);
        });

        return equiposReales.filter(equipo => !equiposEnJornada.has(equipo.id));
    };

      const crearPartido = async (jornadaId) => {
        const nuevoPartido = nuevosPartidos[jornadaId];
        if (!nuevoPartido.equipo_local || !nuevoPartido.equipo_visitante) {
            alert('Selecciona ambos equipos');
            return;
        }

        // Verificar si los equipos ya están en la jornada
        if (equipoYaEnJornada(jornadaId, parseInt(nuevoPartido.equipo_local), 'local')) {
            alert('El equipo local ya está participando en otro partido de esta jornada');
            return;
        }

        if (equipoYaEnJornada(jornadaId, parseInt(nuevoPartido.equipo_visitante), 'visitante')) {
            alert('El equipo visitante ya está participando en otro partido de esta jornada');
            return;
        }

        // Verificar que no sea el mismo equipo
        if (nuevoPartido.equipo_local === nuevoPartido.equipo_visitante) {
            alert('No puedes seleccionar el mismo equipo como local y visitante');
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_URL}/partidos/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    jornada: jornadaId,
                    equipo_local: parseInt(nuevoPartido.equipo_local),
                    equipo_visitante: parseInt(nuevoPartido.equipo_visitante),
                    fecha: new Date().toISOString(),
                    goles_local: 0,
                    goles_visitante: 0
                }),
            });
            
            if (response.ok) {
                alert('Partido creado exitosamente');
                // Limpiar solo los selectores de esta jornada
                setNuevosPartidos(prev => ({
                    ...prev,
                    [jornadaId]: { equipo_local: '', equipo_visitante: '' }
                }));
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
                    // Eliminar también del estado nuevosPartidos
                    setNuevosPartidos(prev => {
                        const updated = { ...prev };
                        delete updated[jornadaId];
                        return updated;
                    });
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

      const eliminarPartido = async (partidoId, jornadaId) => {
        if (window.confirm('¿Seguro que quieres eliminar este partido?')) {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`${API_URL}/partidos/${partidoId}/`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    alert('Partido eliminado exitosamente');
                    await cargarPartidosJornada(jornadaId);
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al eliminar partido');
                }
            } catch (err) {
                alert('Error al eliminar partido: ' + err.message);
            }
        }
    };

    // Función para actualizar nuevo partido de una jornada específica
    const actualizarNuevoPartido = (jornadaId, campo, valor) => {
        setNuevosPartidos(prev => ({
            ...prev,
            [jornadaId]: {
                ...prev[jornadaId],
                [campo]: valor
            }
        }));
    };

    // Función para actualizar resultado de un partido
    // Función para actualizar resultado de un partido
    const actualizarResultado = (jornadaId, partidoId, campo, valor) => {
        // Permitir valores vacíos temporalmente
        let valorFinal = valor;
        
        // Si el valor está vacío, guardar como string vacío (para permitir borrar)
        if (valor === '') {
            valorFinal = '';
        } else {
            // Convertir a número, si no es un número válido, usar 0
            valorFinal = parseInt(valor) || 0;
        }
        
        setResultadosEditando(prev => ({
            ...prev,
            [jornadaId]: {
                ...prev[jornadaId],
                [partidoId]: {
                    ...prev[jornadaId]?.[partidoId],
                    [campo]: valorFinal
                }
            }
        }));
      };

  const guardarTodosLosResultados = async (jornadaId) => {
    const partidosJornada = partidos[jornadaId] || [];
    const resultadosJornada = resultadosEditando[jornadaId] || {};
    
    if (partidosJornada.length === 0) {
        alert('No hay partidos en esta jornada');
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        let guardadosExitosos = 0;
        let errores = 0;

        // Guardar cada partido de la jornada
        for (const partido of partidosJornada) {
            const resultado = resultadosJornada[partido.id];
            
            // Si no hay cambios en este partido, usar los valores actuales
            const golesLocal = resultado?.goles_local !== undefined 
                ? (resultado.goles_local === '' ? 0 : (parseInt(resultado.goles_local) || 0))
                : (partido.goles_local || 0);
                
            const golesVisitante = resultado?.goles_visitante !== undefined 
                ? (resultado.goles_visitante === '' ? 0 : (parseInt(resultado.goles_visitante) || 0))
                : (partido.goles_visitante || 0);

            try {
                const response = await fetch(`${API_URL}/partidos/${partido.id}/`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        goles_local: golesLocal,
                        goles_visitante: golesVisitante
                    }),
                });
                
                if (response.ok) {
                    guardadosExitosos++;
                } else {
                    errores++;
                    console.error(`Error guardando partido ${partido.id}`);
                }
            } catch (error) {
                errores++;
                console.error(`Error guardando partido ${partido.id}:`, error);
            }
        }

        // Recargar los partidos para mostrar los cambios
        await cargarPartidosJornada(jornadaId);
        
        // Mostrar resumen
        if (errores === 0) {
            alert(`✅ Todos los resultados (${guardadosExitosos} partidos) guardados exitosamente`);
        } else {
            alert(`⚠ Resultados guardados: ${guardadosExitosos} exitosos, ${errores} con error`);
        }
        
    } catch (err) {
        alert('Error al guardar los resultados: ' + err.message);
    }
  };

      // 🆕 Filtrar jugadores según búsqueda y equipo REAL
      const jugadoresFiltrados = jugadoresList.filter(jugador => {
          const coincideBusqueda = jugador.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                                (jugador.equipo_real_nombre && jugador.equipo_real_nombre.toLowerCase().includes(busqueda.toLowerCase()));
          
          const coincideEquipo = filtroEquipo === 'todos' || 
                                (jugador.equipo_real_nombre && jugador.equipo_real_nombre === filtroEquipo);
          
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
              const numeroJornada = jornadas.find(j => j.id === jornadaSeleccionada)?.numero || 1;
              await asignarPuntos(numeroJornada, puntosArray);
              alert(`Puntos asignados exitosamente para la jornada ${numeroJornada}`);
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
                          onClick={() => setVista('resultados')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium border-b-4 transition-all ${
                              vista === 'resultados'
                                  ? 'bg-white border-yellow-500 text-yellow-700'
                                  : 'bg-gray-200 border-transparent text-gray-600 hover:bg-gray-300'
                          }`}
                      >
                          <Edit size={18} /> Resultados
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
                                                  <div className="flex-1">
                                                      <h4 className="font-bold text-lg">Jornada {jornada.numero}</h4>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                                                          {partidos[jornada.id]?.length || 0} partidos
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
                                              
                                              {/* Detalles de partidos - SIEMPRE VISIBLES */}
                                              <div className="mt-4 space-y-4">
                                                  {/* Lista de partidos */}
                                                  <div className="space-y-2">
                                                      <h5 className="font-semibold text-sm text-gray-700">Partidos:</h5>
                                                      {(!partidos[jornada.id] || partidos[jornada.id].length === 0) ? (
                                                          <p className="text-sm text-gray-500 text-center py-2">No hay partidos en esta jornada</p>
                                                      ) : (
                                                          partidos[jornada.id].map((partido) => (
                                                              <div key={partido.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                                  <div className="text-sm">
                                                                      <span className="font-medium">{partido.equipo_local_nombre}</span>
                                                                      <span className="mx-2">vs</span>
                                                                      <span className="font-medium">{partido.equipo_visitante_nombre}</span>
                                                                      {(partido.goles_local !== null && partido.goles_visitante !== null) && (
                                                                          <span className="ml-2 font-bold">
                                                                              ({partido.goles_local} - {partido.goles_visitante})
                                                                          </span>
                                                                      )}
                                                                  </div>
                                                                  <button
                                                                      onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          eliminarPartido(partido.id, jornada.id);
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
                                                              value={nuevosPartidos[jornada.id]?.equipo_local || ''}
                                                              onChange={(e) => actualizarNuevoPartido(jornada.id, 'equipo_local', e.target.value)}
                                                              className="flex-1 border border-gray-300 p-2 rounded text-sm"
                                                          >
                                                              <option value="">Equipo Local</option>
                                                              {getEquiposDisponibles(jornada.id, 'local').map(equipo => (
                                                                  <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
                                                              ))}
                                                          </select>
                                                          <select
                                                              value={nuevosPartidos[jornada.id]?.equipo_visitante || ''}
                                                              onChange={(e) => actualizarNuevoPartido(jornada.id, 'equipo_visitante', e.target.value)}
                                                              className="flex-1 border border-gray-300 p-2 rounded text-sm"
                                                          >
                                                              <option value="">Equipo Visitante</option>
                                                              {getEquiposDisponibles(jornada.id, 'visitante').map(equipo => (
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
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>
                  ) : vista === 'resultados' ? (
                      // VISTA DE RESULTADOS
                      <div className="space-y-4">
                          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                              <div className="flex-1">
                                  <h4 className="font-bold text-lg mb-2">Partidos de la Jornada {jornadas.find(j => j.id === jornadaSeleccionada)?.numero}</h4>
                                  
                                  {/* Selector de Jornada */}
                                  <div className="flex-1">
                                      <label className="block text-sm font-medium mb-2">Jornada</label>
                                      <select
                                          value={jornadaSeleccionada}
                                          onChange={(e) => setJornadaSeleccionada(parseInt(e.target.value))}
                                          className="w-full border-2 border-gray-300 p-3 rounded bg-white"
                                      >
                                          {jornadas.map(jornada => (
                                              <option key={jornada.id} value={jornada.id}>
                                                  Jornada {jornada.numero}
                                              </option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                              
                              {/* Botón para guardar todos los resultados */}
                              <button
                                  onClick={() => guardarTodosLosResultados(jornadaSeleccionada)}
                                  className="bg-green-600 text-white px-6 py-3 rounded font-medium hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                              >
                                  <Save size={18} /> Guardar Todos los Resultados
                              </button>
                          </div>
                          
                          {(!partidos[jornadaSeleccionada] || partidos[jornadaSeleccionada].length === 0) ? (
                              <p className="text-center text-gray-500 py-4">No hay partidos en esta jornada</p>
                          ) : (
                              partidos[jornadaSeleccionada].map((partido) => (
                                  <div key={partido.id} className="border-2 border-gray-300 rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-3">
                                          <div className="flex-1">
                                              <div className="font-semibold text-lg text-center">
                                                  {partido.equipo_local_nombre} vs {partido.equipo_visitante_nombre}
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center justify-center gap-4">
                                          <div className="text-center">
                                              <label className="block text-sm font-medium mb-1">Goles Local</label>
                                              <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  pattern="[0-9]*"
                                                  value={resultadosEditando[jornadaSeleccionada]?.[partido.id]?.goles_local ?? partido.goles_local ?? 0}
                                                  onChange={(e) => {
                                                      const value = e.target.value.replace(/[^0-9]/g, '');
                                                      actualizarResultado(jornadaSeleccionada, partido.id, 'goles_local', value);
                                                  }}
                                                  onBlur={(e) => {
                                                      if (e.target.value === '') {
                                                          actualizarResultado(jornadaSeleccionada, partido.id, 'goles_local', 0);
                                                      }
                                                  }}
                                                  className="w-20 border-2 border-gray-300 p-2 rounded text-center"
                                                  placeholder="0"
                                              />
                                          </div>
                                          
                                          <div className="text-2xl font-bold">-</div>
                                          
                                          <div className="text-center">
                                              <label className="block text-sm font-medium mb-1">Goles Visitante</label>
                                              <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  pattern="[0-9]*"
                                                  value={resultadosEditando[jornadaSeleccionada]?.[partido.id]?.goles_visitante ?? partido.goles_visitante ?? 0}
                                                  onChange={(e) => {
                                                      const value = e.target.value.replace(/[^0-9]/g, '');
                                                      actualizarResultado(jornadaSeleccionada, partido.id, 'goles_visitante', value);
                                                  }}
                                                  onBlur={(e) => {
                                                      if (e.target.value === '') {
                                                          actualizarResultado(jornadaSeleccionada, partido.id, 'goles_visitante', 0);
                                                      }
                                                  }}
                                                  className="w-20 border-2 border-gray-300 p-2 rounded text-center"
                                                  placeholder="0"
                                              />
                                          </div>
                                      </div>
                                    </div>
                                ))
                            )}
                      </div>
                  ) : (
                      // VISTA DE PUNTUACIONES (se mantiene igual)
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
                                          placeholder="Nombre o equipo real..."
                                      />
                                  </div>
                              </div>

                              {/* 🆕 Filtro por Equipo REAL */}
                              <div className="flex-1">
                                  <label className="block text-sm font-medium mb-2">Filtrar por Equipo Real</label>
                                  <select
                                      value={filtroEquipo}
                                      onChange={(e) => setFiltroEquipo(e.target.value)}
                                      className="w-full border-2 border-gray-300 p-3 rounded bg-white"
                                  >
                                      <option value="todos">Todos los equipos</option>
                                      {equiposReales.map(equipo => (
                                          <option key={equipo.id} value={equipo.nombre}>
                                              {equipo.nombre}
                                          </option>
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
                              {filtroEquipo !== 'todos' && ` • Filtrado por: ${filtroEquipo}`}
                          </div>
                          
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                              {jugadoresFiltrados.map((player) => (
                                  <div key={player.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded border-2 border-gray-300">
                                      <div className="flex-1">
                                          <div className="font-medium">{player.nombre}</div>
                                          <div className="text-sm text-gray-600">
                                              {player.posicion_display} • {player.equipo_real_nombre} • €{(player.valor / 1000000).toFixed(1)}M • {player.puntos_totales} pts totales
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
                                Los valores de los jugadores se recalcularán automáticamente según los puntos asignados
                            </p>
                        </div>
                      </div>
                  )}
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
      case 'market':
        return (
          <>
            <NavBar role={isAdmin ? 'admin' : 'user'} />
            <MarketScreen
              equipoActual={equipoActual}
              ligaActual={ligaActual}
              onUpdateEquipo={handleUpdateEquipo}
            />
          </>
        );
      case 'offersReceived':
        return (
          <>
            <NavBar role={isAdmin ? 'admin' : 'user'} />
            <OfertasScreen
              equipoId={equipoActual?.id}
              onUpdateEquipo={handleUpdateEquipo}
            />
          </>
        );
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
