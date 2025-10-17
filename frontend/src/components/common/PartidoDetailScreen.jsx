// components/screens/PartidoDetailScreen.js
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Star, Target, Calendar, MapPin, Clock, Trophy 
} from 'lucide-react';
import { getPuntuacionesPartido } from '../../services/api';

const PartidoDetailScreen = ({ partido, onVolver }) => {
  const [puntuacionesPartido, setPuntuacionesPartido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarPuntuaciones = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPuntuacionesPartido(partido.id);
        setPuntuacionesPartido(data);
      } catch (err) {
        console.error('Error al cargar puntuaciones del partido:', err);
        setError('Error al cargar las puntuaciones del partido: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarPuntuaciones();
  }, [partido.id]);

  // Componente para mostrar jugadores
  const ListaJugadores = ({ jugadores, equipoNombre, esLocal }) => (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
            esLocal 
              ? 'bg-gradient-to-br from-red-500 to-red-600' 
              : 'bg-gradient-to-br from-blue-500 to-blue-600'
          }`}>
            {equipoNombre?.charAt(0) || 'E'}
          </div>
          {equipoNombre}
        </h2>
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
          <Users size={16} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {jugadores.length} jugadores
          </span>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {jugadores.map((jugador, index) => (
          <div key={jugador.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-lg text-gray-800">{jugador.nombre}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Equipo Fantasy:</span>
                    <div className="text-gray-800 mt-1">
                      {jugador.equipo_fantasy_nombre || 'Jugador libre'}
                      {jugador.en_venta && (
                        <span className="ml-2 text-orange-600 text-xs font-medium bg-orange-100 px-2 py-1 rounded-full">
                          💰 En venta
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium">Valor:</span>
                    <div className="text-gray-800 mt-1">
                      €{(jugador.valor / 1000000).toFixed(1)}M
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right ml-4">
                <div className="flex items-center gap-2 justify-end mb-2">
                  <Star className="text-yellow-500" size={20} />
                  <span className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                    {jugador.puntos_jornada}
                  </span>
                </div>
                <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Total: <span className="font-semibold">{jugador.puntos_totales}</span>
                </div>
              </div>
            </div>
            
            {/* Sección corregida - siempre se muestra pero con colores diferentes */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className={`flex items-center gap-2 text-sm font-medium ${
                jugador.puntos_jornada > 0 
                  ? 'text-green-600' 
                  : jugador.puntos_jornada === 0 
                    ? 'text-yellow-600' 
                    : 'text-red-600'
              }`}>
                <Target size={14} />
                <span>
                  {jugador.puntos_jornada > 0 
                    ? `+${jugador.puntos_jornada} puntos en esta jornada`
                    : `${jugador.puntos_jornada} puntos en esta jornada`
                  }
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {jugadores.length === 0 && (
          <div className="text-center py-8">
            <Users className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-500 text-lg">No hay jugadores registrados</p>
            <p className="text-gray-400 text-sm">Este equipo no tiene jugadores en el sistema</p>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Cargando detalles del partido...</p>
          <p className="text-gray-500 mt-2">Obteniendo puntuaciones de los jugadores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={onVolver}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Volver al calendario</span>
            </button>
          </div>

          {/* Información del partido */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-white">
                    {partido.equipo_local_nombre?.charAt(0) || 'L'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{partido.equipo_local_nombre}</h3>
                <div className="text-4xl font-bold text-white mt-2">
                  {partido.goles_local !== null ? partido.goles_local : '-'}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-lg">VS</span>
                </div>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-white">
                    {partido.equipo_visitante_nombre?.charAt(0) || 'V'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{partido.equipo_visitante_nombre}</h3>
                <div className="text-4xl font-bold text-white mt-2">
                  {partido.goles_visitante !== null ? partido.goles_visitante : '-'}
                </div>
              </div>
            </div>

            {/* Detalles del partido */}
            <div className="flex flex-wrap justify-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <span>
                  {partido.fecha ? new Date(partido.fecha).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'Fecha por definir'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>
                  {partido.fecha ? new Date(partido.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Trophy size={18} />
                <span>Jornada {partido.jornada_numero}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cuerpo - Jugadores */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="text-red-600" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Error al cargar las puntuaciones</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <button 
              onClick={onVolver}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Volver al calendario
            </button>
          </div>
        ) : puntuacionesPartido ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <ListaJugadores 
              jugadores={puntuacionesPartido.jugadores_local}
              equipoNombre={puntuacionesPartido.partido.equipo_local}
              esLocal={true}
            />
            
            <ListaJugadores 
              jugadores={puntuacionesPartido.jugadores_visitante}
              equipoNombre={puntuacionesPartido.partido.equipo_visitante}
              esLocal={false}
            />
          </div>
        ) : null}
      </div>

      {/* Resumen */}
      {puntuacionesPartido && (
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Resumen del Partido</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {puntuacionesPartido.jugadores_local.length + puntuacionesPartido.jugadores_visitante.length}
                </div>
                <div className="text-blue-800 font-medium">Total Jugadores</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">
                  {puntuacionesPartido.jugadores_local.reduce((sum, j) => sum + j.puntos_jornada, 0) +
                   puntuacionesPartido.jugadores_visitante.reduce((sum, j) => sum + j.puntos_jornada, 0)}
                </div>
                <div className="text-green-800 font-medium">Puntos Totales Jornada</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                {(() => {
                    // Combinar todos los jugadores
                    const todosJugadores = [
                    ...puntuacionesPartido.jugadores_local,
                    ...puntuacionesPartido.jugadores_visitante
                    ];
                    
                    // Encontrar la máxima puntuación
                    const maxPuntos = Math.max(...todosJugadores.map(j => j.puntos_jornada));
                    
                    // Filtrar jugadores con la máxima puntuación
                    const mvpCandidatos = todosJugadores.filter(j => j.puntos_jornada === maxPuntos);
                    
                    // Determinar equipo ganador (si el partido ya se jugó)
                    const partido = puntuacionesPartido.partido;
                    let equipoGanador = null;
                    
                    if (partido.goles_local !== null && partido.goles_visitante !== null) {
                    if (partido.goles_local > partido.goles_visitante) {
                        equipoGanador = partido.equipo_local;
                    } else if (partido.goles_visitante > partido.goles_local) {
                        equipoGanador = partido.equipo_visitante;
                    }
                    }
                    
                    let mvp = null;
                    
                    // Si hay equipo ganador, buscar MVP entre sus jugadores primero
                    if (equipoGanador && mvpCandidatos.length > 0) {
                    const mvpDelGanador = mvpCandidatos.filter(j => 
                        j.equipo_real_nombre === equipoGanador
                    );
                    
                    if (mvpDelGanador.length > 0) {
                        // Ordenar por ID (o cualquier campo único) para selección determinista
                        mvpDelGanador.sort((a, b) => a.id - b.id);
                        mvp = mvpDelGanador[0]; // Siempre el mismo
                    }
                    }
                    
                    // Si no hay equipo ganador o no hay MVP del equipo ganador, elegir de manera determinista
                    if (!mvp && mvpCandidatos.length > 0) {
                    mvpCandidatos.sort((a, b) => a.id - b.id);
                    mvp = mvpCandidatos[0]; // Siempre el mismo
                    }
                    
                    return mvp && maxPuntos > 0 ? (
                    <div>
                        <div className="text-lg font-bold text-purple-600 mb-1 truncate" title={mvp.nombre}>
                        {mvp.nombre}{equipoGanador && mvp.equipo_real_nombre === equipoGanador ? '🏆' : '⭐'}
                        </div>
                        <div className="text-xl font-bold text-purple-700 mb-1">
                        {mvp.puntos_jornada} pts
                        </div>
                    </div>
                    ) : (
                    <div>
                        <div className="text-2xl font-bold text-purple-300">-</div>
                        <div className="text-purple-400 font-medium">Sin MVP</div>
                    </div>
                    );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartidoDetailScreen;