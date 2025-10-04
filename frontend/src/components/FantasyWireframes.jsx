import React, { useState, useEffect } from 'react';
import { Menu, Users, TrendingUp, Trophy, Settings, LogOut, Plus, Minus, Search, RefreshCw } from 'lucide-react';

const FantasyFutsalWireframes = () => {
  const API_URL = 'http://127.0.0.1:8000/api';
  
  const [currentScreen, setCurrentScreen] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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

  const ficharJugador = async (equipoId, jugadorId) => {
    const response = await fetch(`${API_URL}/equipos/${equipoId}/fichar_jugador/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jugador_id: jugadorId }),
    });
    return handleResponse(response);
  };

  const venderJugador = async (equipoId, jugadorId) => {
    const response = await fetch(`${API_URL}/equipos/${equipoId}/vender_jugador/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jugador_id: jugadorId }),
    });
    return handleResponse(response);
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

  const NavBar = ({ role }) => (
    <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">⚽ Fantasy Fútbol Sala</h1>
      </div>
      <div className="flex gap-4 items-center">
        <button onClick={() => setCurrentScreen('dashboard')} className="hover:text-gray-300">Dashboard</button>
        <button onClick={() => setCurrentScreen('market')} className="hover:text-gray-300">Mercado</button>
        <button onClick={() => setCurrentScreen('rankings')} className="hover:text-gray-300">Clasificación</button>
        {role === 'admin' && (
          <button onClick={() => setCurrentScreen('admin')} className="hover:text-gray-300 text-yellow-400">Admin</button>
        )}
        <button 
          onClick={cargarDatosIniciales}
          className="hover:text-gray-300 flex items-center gap-1"
          title="Recargar datos"
        >
          <RefreshCw size={18} />
        </button>
        <LogOut className="cursor-pointer hover:text-gray-300" size={20} />
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

  const LoginScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 border-2 border-gray-300">
        <h2 className="text-2xl font-bold mb-6 text-center">⚽ Fantasy Fútbol Sala</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="border-2 border-gray-300 p-3 rounded bg-gray-50"></div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <div className="border-2 border-gray-300 p-3 rounded bg-gray-50"></div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                setIsAdmin(false);
                setCurrentScreen('dashboard');
                await cargarDatosIniciales();
              }}
              className="flex-1 bg-blue-600 text-white p-3 rounded font-medium hover:bg-blue-700"
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={async () => {
                setIsAdmin(true);
                setCurrentScreen('dashboard');
                await cargarDatosIniciales();
              }}
              className="flex-1 bg-yellow-500 text-white p-3 rounded font-medium hover:bg-yellow-600"
            >
              Login Admin
            </button>
          </div>
          <div className="text-center text-sm text-gray-600">
            ¿No tienes cuenta? <span className="text-blue-600 cursor-pointer">Regístrate</span>
          </div>
        </div>
      </div>
    </div>
  );

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

    const portero = equipoActual.jugadores.find(j => j.posicion === 'POR');
    const defensas = equipoActual.jugadores.filter(j => j.posicion === 'DEF');
    const delanteros = equipoActual.jugadores.filter(j => j.posicion === 'DEL');

    const handleVenderJugador = async (jugadorId) => {
      if (window.confirm('¿Seguro que quieres vender este jugador?')) {
        try {
          await venderJugador(equipoActual.id, jugadorId);
          await cargarDatosIniciales();
          alert('Jugador vendido exitosamente');
        } catch (err) {
          alert('Error al vender jugador: ' + err.message);
        }
      }
    };

    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar role={isAdmin ? 'admin' : 'user'} />
        <div className="p-6">
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
              <div className="text-2xl font-bold text-purple-600">{miPosicion}º / {clasificacion.length}</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
            <Users size={28} />
            {equipoActual.nombre}
          </h2>

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
                  {delanteros.map((del, idx) => (
                    <PlayerCard 
                      key={idx} 
                      player={del} 
                      positionLabel="ATA" 
                      onRemove={handleVenderJugador}
                    />
                  ))}
                </div>

                <div className="flex justify-around px-24">
                  {defensas.map((def, idx) => (
                    <PlayerCard 
                      key={idx} 
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

            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-xs">
              <div className="font-medium mb-1">Hover sobre jugador:</div>
              <div className="text-gray-600">• Click X para vender</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button 
              onClick={() => setCurrentScreen('market')}
              className="bg-white hover:bg-gray-50 p-4 rounded-lg shadow border-2 border-gray-300 font-medium flex items-center justify-center gap-2"
            >
              <Plus size={20} className="text-green-600" />
              Ir al Mercado
            </button>
            <button 
              onClick={() => setCurrentScreen('rankings')}
              className="bg-white hover:bg-gray-50 p-4 rounded-lg shadow border-2 border-gray-300 font-medium flex items-center justify-center gap-2"
            >
              <Trophy size={20} className="text-yellow-600" />
              Ver Clasificación
            </button>
          </div>
        </div>
      </div>
    );
  };

  const MarketScreen = () => {
    const [filtro, setFiltro] = useState('');
    const [posicionFiltro, setPosicionFiltro] = useState('');

    const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

    const handleFichar = async (jugadorId) => {
      try {
        await ficharJugador(equipoActual.id, jugadorId);
        await cargarDatosIniciales();
        alert('Jugador fichado exitosamente');
      } catch (err) {
        alert('Error al fichar: ' + err.message);
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

  const AdminScreen = () => {
    const [puntuaciones, setPuntuaciones] = useState({});

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
        await asignarPuntos(1, puntosArray);
        alert('Puntos asignados exitosamente');
        setPuntuaciones({});
        await cargarDatosIniciales();
      } catch (err) {
        alert('Error al asignar puntos: ' + err.message);
      }
    };

    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar role="admin" />
        <div className="p-6">
          <div className="mb-6 bg-yellow-50 p-6 rounded-lg shadow border-2 border-yellow-400">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Settings size={28} />
              Panel de Administración
            </h2>
            <p className="text-sm text-gray-600">Gestiona puntuaciones y valores de jugadores</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border-2 border-gray-300">
              <h3 className="font-bold mb-2">Jornada Actual</h3>
              <div className="text-3xl font-bold text-blue-600">{ligaActual?.jornada_actual || 1}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-2 border-gray-300">
              <button className="w-full bg-green-600 text-white p-3 rounded font-medium hover:bg-green-700">
                + Nueva Jornada
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
            <h3 className="text-xl font-bold mb-4">Asignar Puntos - Jornada {ligaActual?.jornada_actual}</h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {jugadores.map((player) => (
                <div key={player.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded border-2 border-gray-300">
                  <div className="flex-1">
                    <div className="font-medium">{player.nombre}</div>
                    <div className="text-sm text-gray-600">
                      {player.posicion_display} • €{(player.valor / 1000000).toFixed(1)}M • {player.puntos_totales} pts totales
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
                Aplicar Puntos y Actualizar Valores
              </button>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Los valores se recalcularán automáticamente (€0.1M por punto)
              </p>
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
      case 'market': return <MarketScreen />;
      case 'rankings': return <RankingsScreen />;
      case 'admin': return <AdminScreen />;
      default: return <LoginScreen />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderScreen()}
      
      {currentScreen !== 'login' && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border-2 border-gray-300">
          <div className="text-xs font-medium text-gray-600 mb-2">Navegación:</div>
          <div className="flex gap-2">
            {Object.entries(screens).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCurrentScreen(key)}
                className={`px-3 py-1 text-xs rounded ${
                  currentScreen === key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FantasyFutsalWireframes;
