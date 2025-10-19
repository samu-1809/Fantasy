// components/common/real-teams/RealTeamsScreen.jsx
import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { 
  getEquiposReales, 
  getJugadores, 
  getClasificacionEquiposReales,
  getGoleadores,
  getJugadorDetalles 
} from '../../services/api';
import TabsNavigation from './TabsNavigation';
import TeamsTab from './TeamsTab';
import PlayersTab from './PlayersTab';
import StandingsTab from './StandingsTab';
import ScorersTab from './ScorersTab';
import TeamModal from './TeamModal';
import PlayerModal from './PlayerModal';

const RealTeamsScreen = () => {
  const [activeTab, setActiveTab] = useState('teams');
  const [equiposReales, setEquiposReales] = useState([]);
  const [allJugadores, setAllJugadores] = useState([]);
  const [clasificacion, setClasificacion] = useState([]);
  const [goleadores, setGoleadores] = useState([]);
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
  const cargarDetallesJugador = async (jugador) => {
      try {
        setLoadingPuntuaciones(true);
        setJugadorSeleccionado(jugador);
        
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
      const jugadoresOrdenados = jugadores.sort((a, b) => (b.puntos_totales || 0) - (a.puntos_totales || 0));
      setAllJugadores(jugadoresOrdenados);
    } catch (err) {
      console.error('Error cargando jugadores:', err);
      setError('Error al cargar los jugadores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarClasificacion = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClasificacionEquiposReales();
      setClasificacion(data);
    } catch (err) {
      console.error('Error cargando clasificación:', err);
      setError('Error al cargar la clasificación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarGoleadores = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGoleadores();
      setGoleadores(data);
    } catch (err) {
      console.error('Error cargando goleadores:', err);
      setError('Error al cargar los goleadores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEquipoClick = (equipo) => {
    setEquipoSeleccionado(equipo);
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

  const getColorEquipo = (index) => {
    return coloresEquipos[index % coloresEquipos.length];
  };

  const handleRetry = () => {
    if (activeTab === 'teams') {
      cargarEquiposReales();
    } else if (activeTab === 'players') {
      cargarTodosLosJugadores();
    } else if (activeTab === 'standings') {
      cargarClasificacion();
    } else if (activeTab === 'scorers') {
      cargarGoleadores();
    }
  };

  useEffect(() => {
    if (activeTab === 'teams') {
      cargarEquiposReales();
    } else if (activeTab === 'players') {
      cargarTodosLosJugadores();
    } else if (activeTab === 'standings') {
      cargarClasificacion();
    } else if (activeTab === 'scorers') {
      cargarGoleadores();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            {activeTab === 'teams' ? 'Cargando equipos...' : 
             activeTab === 'players' ? 'Cargando jugadores...' : 
             activeTab === 'standings' ? 'Cargando clasificación...' :
             'Cargando goleadores...'}
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
            onClick={handleRetry}
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
              {activeTab === 'teams' ? 'Equipos Reales' : 
               activeTab === 'players' ? 'Ranking de Jugadores' : 
               activeTab === 'standings' ? 'Clasificación Liga' :
               'Tabla de Goleadores'}
            </h1>
          </div>
          <p className="text-gray-600">
            {activeTab === 'teams' 
              ? 'Todos los equipos de la competición de fútbol sala' 
              : activeTab === 'players'
              ? 'Jugadores ordenados por puntuación total'
              : activeTab === 'standings'
              ? 'Clasificación oficial de la liga basada en partidos disputados'
              : 'Jugadores ordenados por número de goles marcados'
            }
          </p>
        </div>

        {/* Tabs Navigation */}
        <TabsNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Search Bar */}
        {(activeTab === 'players' || activeTab === 'scorers') && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full md:max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'players' 
                        ? "Buscar jugador..." 
                        : "Buscar goleador..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                  <span>
                    {activeTab === 'players' 
                      ? allJugadores.filter(jugador =>
                          jugador.nombre.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length + ' de ' + allJugadores.length + ' jugadores'
                      : goleadores.filter(jugador =>
                          jugador.nombre.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length + ' de ' + goleadores.length + ' goleadores'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'teams' && (
          <TeamsTab 
            equiposReales={equiposReales}
            onEquipoClick={handleEquipoClick}
            getColorEquipo={getColorEquipo}
          />
        )}

        {activeTab === 'players' && (
          <PlayersTab 
            jugadores={allJugadores}
            searchTerm={searchTerm}
            onJugadorClick={handleJugadorClick}
            coloresPosiciones={coloresPosiciones}
            nombresPosiciones={nombresPosiciones}
          />
        )}

        {activeTab === 'standings' && (
          <StandingsTab 
            clasificacion={clasificacion}
            getColorEquipo={getColorEquipo}
          />
        )}

        {activeTab === 'scorers' && (
          <ScorersTab 
            goleadores={goleadores}
            searchTerm={searchTerm}
            onJugadorClick={handleJugadorClick}
            coloresPosiciones={coloresPosiciones}
            nombresPosiciones={nombresPosiciones}
          />
        )}
      </div>

      {/* Modals */}
      {equipoSeleccionado && (
        <TeamModal
          equipo={equipoSeleccionado}
          onClose={cerrarModalEquipo}
          coloresPosiciones={coloresPosiciones}
          nombresPosiciones={nombresPosiciones}
        />
      )}

      {jugadorSeleccionado && (
        <PlayerModal
          jugador={jugadorSeleccionado}
          onClose={cerrarModalJugador}
          coloresPosiciones={coloresPosiciones}
          nombresPosiciones={nombresPosiciones}
          loadingPuntuaciones={loadingPuntuaciones}
          puntuacionesJugador={puntuacionesJugador}
        />
      )}
    </div>
  );
};

export default RealTeamsScreen;