// components/common/RealTeamsScreen.jsx
import React, { useState, useEffect } from 'react';
import { Trophy, Users, Shield, Search, Filter, X, Euro, Target, Star, Award, TrendingUp } from 'lucide-react';
import { getEquiposReales, getJugadoresPorEquipoReal, getJugadores, getJugadorDetalles } from '../../services/api';
import MiniGrafico from '../market/components/MiniGrafico';

const RealTeamsScreen = () => {
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' o 'players'
  const [equiposReales, setEquiposReales] = useState([]);
  const [allJugadores, setAllJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [jugadoresEquipo, setJugadoresEquipo] = useState([]);
  const [loadingJugadores, setLoadingJugadores] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [loadingPuntuaciones, setLoadingPuntuaciones] = useState(false);
  const [puntuacionesJugador, setPuntuacionesJugador] = useState([]);

  // Colores para las posiciones
  const coloresPosiciones = {
    POR: 'from-yellow-500 to-yellow-600',
    DEF: 'from-blue-500 to-blue-600', 
    DEL: 'from-red-500 to-red-600'
  };

  const nombresPosiciones = {
    POR: 'Portero',
    DEF: 'Defensa',
    DEL: 'Delantero'
  };

  // Colores para los equipos
  const coloresEquipos = [
    'from-red-500 to-red-600',
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-yellow-500 to-yellow-600',
    'from-indigo-500 to-indigo-600',
    'from-pink-500 to-pink-600',
    'from-teal-500 to-teal-600',
    'from-orange-500 to-orange-600',
    'from-cyan-500 to-cyan-600',
    'from-lime-500 to-lime-600',
    'from-amber-500 to-amber-600'
  ];

  const cargarEquiposReales = async () => {
    try {
      setLoading(true);
      setError(null);
      const equipos = await getEquiposReales();
      setEquiposReales(equipos);
    } catch (err) {
      setError('Error al cargar los equipos reales: ' + err.message);
      console.error('Error cargando equipos reales:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarTodosLosJugadores = async () => {
    try {
      setLoading(true);
      const jugadores = await getJugadores();
      // Ordenar por puntos totales (descendente)
      const jugadoresOrdenados = jugadores.sort((a, b) => (b.puntos_totales || 0) - (a.puntos_totales || 0));
      setAllJugadores(jugadoresOrdenados);
    } catch (err) {
      console.error('Error cargando jugadores:', err);
      setError('Error al cargar los jugadores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarJugadoresEquipo = async (equipoId) => {
    try {
      setLoadingJugadores(true);
      const data = await getJugadoresPorEquipoReal(equipoId);
      setJugadoresEquipo(data.jugadores || []);
    } catch (err) {
      console.error('Error cargando jugadores:', err);
    } finally {
      setLoadingJugadores(false);
    }
  };

  const cargarDetallesJugador = async (jugador) => {
    try {
      setLoadingPuntuaciones(true);
      setJugadorSeleccionado(jugador);
      
      // 🆕 CARGAR DETALLES COMPLETOS DEL JUGADOR CON PUNTUACIONES
      try {
        const detallesCompletos = await getJugadorDetalles(jugador.id);
        setPuntuacionesJugador(detallesCompletos.puntuaciones_jornadas || []);
      } catch (error) {
        console.warn('No se pudieron cargar las puntuaciones del jugador:', error);
        setPuntuacionesJugador([]);
      }
    } catch (err) {
      console.error('Error cargando detalles del jugador:', err);
    } finally {
      setLoadingPuntuaciones(false);
    }
  };

  const handleEquipoClick = (equipo) => {
    setEquipoSeleccionado(equipo);
    cargarJugadoresEquipo(equipo.id);
  };

  const handleJugadorClick = (jugador) => {
    cargarDetallesJugador(jugador);
  };

  const cerrarModalEquipo = () => {
    setEquipoSeleccionado(null);
    setJugadoresEquipo([]);
  };

  const cerrarModalJugador = () => {
    setJugadorSeleccionado(null);
    setPuntuacionesJugador([]);
  };

  // Filtrar equipos basado en la búsqueda
  const equiposFiltrados = equiposReales.filter(equipo =>
    equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar jugadores basado en la búsqueda
  const jugadoresFiltrados = allJugadores.filter(jugador =>
    jugador.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getColorEquipo = (index) => {
    return coloresEquipos[index % coloresEquipos.length];
  };

  // Calcular estadísticas del equipo
  const estadisticasEquipo = {
    totalJugadores: jugadoresEquipo.length,
    totalValor: jugadoresEquipo.reduce((sum, jugador) => sum + (jugador.valor || 0), 0),
    totalPuntos: jugadoresEquipo.reduce((sum, jugador) => sum + (jugador.puntos_totales || 0), 0),
    porPosicion: {
      POR: jugadoresEquipo.filter(j => j.posicion === 'POR').length,
      DEF: jugadoresEquipo.filter(j => j.posicion === 'DEF').length,
      DEL: jugadoresEquipo.filter(j => j.posicion === 'DEL').length,
    }
  };

  useEffect(() => {
    if (activeTab === 'teams') {
      cargarEquiposReales();
    } else {
      cargarTodosLosJugadores();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            {activeTab === 'teams' ? 'Cargando equipos...' : 'Cargando jugadores...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-4">
          <div className="text-red-500 text-center mb-4">
            <Trophy size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-center text-gray-800 mb-2">Error</h3>
          <p className="text-gray-600 text-center">{error}</p>
          <button 
            onClick={activeTab === 'teams' ? cargarEquiposReales : cargarTodosLosJugadores}
            className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-lg mb-4">
            <Trophy className="text-green-500" size={32} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {activeTab === 'teams' ? 'Equipos Reales' : 'Ranking de Jugadores'}
            </h1>
          </div>
          <p className="text-gray-600">
            {activeTab === 'teams' 
              ? 'Todos los equipos de la competición de fútbol sala' 
              : 'Jugadores ordenados por puntuación total'
            }
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-8 max-w-md mx-auto">
          <div className="flex">
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'teams'
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Shield size={20} />
                Equipos
              </div>
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'players'
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users size={20} />
                Jugadores
              </div>
            </button>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'teams' 
                      ? "Buscar equipo..." 
                      : "Buscar jugador..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter size={16} />
                <span>
                  {activeTab === 'teams' 
                    ? `${equiposFiltrados.length} de ${equiposReales.length} equipos`
                    : `${jugadoresFiltrados.length} de ${allJugadores.length} jugadores`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO DE EQUIPOS */}
        {activeTab === 'teams' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {equiposFiltrados.map((equipo, index) => (
                <div
                  key={equipo.id}
                  onClick={() => handleEquipoClick(equipo)}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border-2 border-transparent hover:border-green-300"
                >
                  {/* Header con gradiente */}
                  <div className={`bg-gradient-to-r ${getColorEquipo(index)} text-white p-6`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                          <Shield size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{equipo.nombre}</h3>
                          <p className="text-sm opacity-80 mt-1">Ver plantilla</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mensaje si no hay resultados en equipos */}
            {equiposFiltrados.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-yellow-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No se encontraron equipos</h3>
                <p className="text-gray-500">
                  {searchTerm ? `No hay resultados para "${searchTerm}"` : 'No hay equipos registrados'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-green-600 hover:text-green-700 font-medium"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* CONTENIDO DE JUGADORES */}
        {activeTab === 'players' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jugadoresFiltrados.map((jugador, index) => (
                <div
                  key={jugador.id}
                  onClick={() => handleJugadorClick(jugador)}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-green-300"
                >
                  {/* Header con gradiente según posición */}
                  <div className={`bg-gradient-to-r ${coloresPosiciones[jugador.posicion] || 'from-gray-500 to-gray-600'} text-white p-6`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {jugador.posicion?.charAt(0) || 'J'}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{jugador.nombre}</h3>
                          <p className="text-sm opacity-80">
                            {nombresPosiciones[jugador.posicion] || jugador.posicion}
                          </p>
                        </div>
                      </div>
                      {index < 3 && (
                        <div className={`${
                          index === 0 ? 'bg-yellow-500 text-yellow-900' :
                          index === 1 ? 'bg-gray-400 text-gray-900' :
                          'bg-orange-500 text-orange-900'
                        } rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm`}>
                          #{index + 1}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Información del jugador */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-500 flex items-center justify-center gap-1 mb-1">
                          <Target size={14} />
                          Puntos
                        </div>
                        <div className="text-2xl font-bold text-gray-800">
                          {jugador.puntos_totales || 0}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-500 flex items-center justify-center gap-1 mb-1">
                          <Euro size={14} />
                          Valor
                        </div>
                        <div className="text-xl font-bold text-gray-800">
                          €{(jugador.valor / 1000000).toFixed(1)}M
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center text-sm text-gray-600">
                      {jugador.equipo_real_nombre && (
                        <div className="flex items-center justify-center gap-2">
                          <Shield size={14} />
                          {jugador.equipo_real_nombre}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
                    <div className="text-center text-sm text-gray-600">
                      Haz clic para ver detalles y estadísticas
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mensaje si no hay resultados en jugadores */}
            {jugadoresFiltrados.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-yellow-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No se encontraron jugadores</h3>
                <p className="text-gray-500">
                  {searchTerm ? `No hay resultados para "${searchTerm}"` : 'No hay jugadores registrados'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-green-600 hover:text-green-700 font-medium"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            )}

            {/* Contador de jugadores */}
            {jugadoresFiltrados.length > 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow">
                  <Users size={16} className="text-blue-500" />
                  <span className="text-sm text-gray-600">
                    {jugadoresFiltrados.length} jugador{jugadoresFiltrados.length !== 1 ? 'es' : ''} encontrados
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Jugadores del Equipo */}
      {equipoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{equipoSeleccionado.nombre}</h2>
                    <p className="text-sm opacity-80">Plantilla de jugadores</p>
                  </div>
                </div>
                <button
                  onClick={cerrarModalEquipo}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Estadísticas rápidas */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-2">
                  <div className="text-lg font-bold">{estadisticasEquipo.totalJugadores}</div>
                  <div className="text-xs opacity-80">Jugadores</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-2">
                  <div className="text-lg font-bold">€{(estadisticasEquipo.totalValor / 1000000).toFixed(1)}M</div>
                  <div className="text-xs opacity-80">Valor Total</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-2">
                  <div className="text-lg font-bold">{estadisticasEquipo.totalPuntos}</div>
                  <div className="text-xs opacity-80">Puntos Totales</div>
                </div>
              </div>
            </div>

            {/* Lista de Jugadores */}
            <div className="p-6">
              {loadingJugadores ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando jugadores...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jugadoresEquipo.map((jugador) => (
                    <div 
                      key={jugador.id} 
                      onClick={() => handleJugadorClick(jugador)}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-green-500 cursor-pointer group"
                    >
                      {/* Icono de posición */}
                      <div className={`w-12 h-12 bg-gradient-to-br ${coloresPosiciones[jugador.posicion] || 'from-gray-500 to-gray-600'} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                        {jugador.posicion?.charAt(0) || 'J'}
                      </div>
                      
                      {/* Información del jugador */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-gray-800 text-lg group-hover:text-green-700 transition-colors">
                            {jugador.nombre}
                          </h4>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="bg-gray-200 px-2 py-1 rounded">{jugador.posicion_display}</span>
                          {jugador.equipo_fantasy_nombre && (
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {jugador.equipo_fantasy_nombre}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Estadísticas */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Euro size={14} />
                            Valor
                          </div>
                          <div className="font-bold text-gray-800">
                            €{(jugador.valor / 1000000).toFixed(1)}M
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Target size={14} />
                            Puntos
                          </div>
                          <div className="font-bold text-gray-800">
                            {jugador.puntos_totales || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {jugadoresEquipo.length === 0 && (
                    <div className="text-center py-8">
                      <Users size={48} className="text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay jugadores</h3>
                      <p className="text-gray-500">Este equipo no tiene jugadores registrados.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <span>{estadisticasEquipo.totalJugadores} jugadores</span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                    {estadisticasEquipo.porPosicion.POR} Porteros
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    {estadisticasEquipo.porPosicion.DEF} Defensas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    {estadisticasEquipo.porPosicion.DEL} Delanteros
                  </span>
                </div>
                <button
                  onClick={cerrarModalEquipo}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Jugador */}
      {jugadorSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className={`bg-gradient-to-r ${coloresPosiciones[jugadorSeleccionado.posicion] || 'from-gray-500 to-gray-600'} text-white p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {jugadorSeleccionado.posicion?.charAt(0) || 'J'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{jugadorSeleccionado.nombre}</h2>
                    <p className="text-sm opacity-80">
                      {nombresPosiciones[jugadorSeleccionado.posicion] || jugadorSeleccionado.posicion}
                      {jugadorSeleccionado.equipo_real_nombre && ` • ${jugadorSeleccionado.equipo_real_nombre}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={cerrarModalJugador}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Estadísticas del jugador */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Valor</div>
                  <div className="text-xl font-bold text-gray-800">
                    €{(jugadorSeleccionado.valor / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Puntos Totales</div>
                  <div className="text-xl font-bold text-gray-800">
                    {jugadorSeleccionado.puntos_totales || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección del Gráfico */}
            <div className="p-6 border-b border-gray-200">
              {loadingPuntuaciones ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Cargando estadísticas...</p>
                </div>
              ) : (
                <MiniGrafico 
                  puntuaciones={puntuacionesJugador}
                />
              )}
            </div>

            {/* Información adicional */}
            {jugadorSeleccionado.equipo_nombre && (
              <div className="p-6">
                <h4 className="text-lg font-semibold mb-4 text-gray-800">Información Adicional</h4>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Equipo Fantasy:</span>
                    <span className="font-medium text-gray-800">{jugadorSeleccionado.equipo_nombre}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer del Modal */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={cerrarModalJugador}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTeamsScreen;