// components/screens/CalendarScreen.js
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { getJornadas, getPartidosJornada } from '../../services/api';

const CalendarScreen = () => {
  const [jornadas, setJornadas] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarJornadas = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getJornadas();
        setJornadas(data);
        
        if (data.length > 0) {
          setJornadaSeleccionada(data[0].id);
        }
      } catch (err) {
        console.error('❌ Error cargando jornadas:', err);
        setError('Error al cargar las jornadas: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarJornadas();
  }, []);

  useEffect(() => {
    const cargarPartidos = async () => {
      if (!jornadaSeleccionada) return;

      try {
        setLoading(true);
        const data = await getPartidosJornada(jornadaSeleccionada);
        setPartidos(data);
      } catch (err) {
        console.error('❌ Error cargando partidos:', err);
        setError('Error al cargar los partidos: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    cargarPartidos();
  }, [jornadaSeleccionada]);

  const cambiarJornada = (direccion) => {
    const currentIndex = jornadas.findIndex(j => j.id === jornadaSeleccionada);
    if (direccion === 'next' && currentIndex < jornadas.length - 1) {
      setJornadaSeleccionada(jornadas[currentIndex + 1].id);
    } else if (direccion === 'prev' && currentIndex > 0) {
      setJornadaSeleccionada(jornadas[currentIndex - 1].id);
    }
  };

  const jornadaActual = jornadas.find(j => j.id === jornadaSeleccionada);

  if (loading && jornadas.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-4">
          <div className="text-red-500 text-center mb-4">
            <Calendar size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-center text-gray-800 mb-2">Error</h3>
          <p className="text-gray-600 text-center">{error}</p>
          <button 
            onClick={() => window.location.reload()}
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
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-lg mb-4">
            <Calendar className="text-green-500" size={32} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Calendario de Partidos
            </h1>
          </div>
          <p className="text-gray-600">Sigue todos los partidos de la temporada</p>
        </div>

        {/* Selector de Jornadas */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => cambiarJornada('prev')}
              disabled={jornadas.findIndex(j => j.id === jornadaSeleccionada) === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
              Anterior
            </button>

            <div className="text-center flex-1 mx-4">
              <div className="flex items-center justify-center gap-3">
                <Trophy className="text-yellow-500" size={24} />
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Jornada {jornadaActual?.numero}
                  </h2>
                  {jornadaActual?.fecha_inicio && (
                    <p className="text-sm text-gray-500">
                      {new Date(jornadaActual.fecha_inicio).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => cambiarJornada('next')}
              disabled={jornadas.findIndex(j => j.id === jornadaSeleccionada) === jornadas.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Selector rápido */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Jornada Rápida:
            </label>
            <select
              value={jornadaSeleccionada || ''}
              onChange={(e) => setJornadaSeleccionada(Number(e.target.value))}
              className="block w-full max-w-xs mx-auto px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              {jornadas.map((jornada) => (
                <option key={jornada.id} value={jornada.id}>
                  Jornada {jornada.numero} - {jornada.fecha_inicio ? new Date(jornada.fecha_inicio).toLocaleDateString() : 'Por definir'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Partidos */}
        {partidos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-yellow-600" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay partidos programados</h3>
            <p className="text-gray-500">Esta jornada aún no tiene partidos programados.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {partidos.map((partido) => (
              <div key={partido.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Header de la tarjeta */}
                <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      <span className="text-sm font-medium">Estadio {partido.estadio || 'Principal'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span className="text-sm">
                        {partido.fecha ? new Date(partido.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cuerpo del partido */}
                <div className="p-6">
                  <div className="text-center text-xs text-gray-500 mb-4 uppercase tracking-wider">
                    {partido.fecha ? new Date(partido.fecha).toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Fecha por definir'}
                  </div>

                  <div className="flex justify-between items-center">
                    {/* Equipo Local */}
                    <div className="text-center flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                        {partido.equipo_local_nombre?.charAt(0) || 'L'}
                      </div>
                      <div className="font-bold text-gray-800 text-sm mb-1">
                        {partido.equipo_local_nombre}
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {partido.goles_local !== null ? partido.goles_local : '-'}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="mx-4">
                      <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center">
                        <span className="text-gray-600 font-bold text-sm">VS</span>
                      </div>
                    </div>

                    {/* Equipo Visitante */}
                    <div className="text-center flex-1">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                        {partido.equipo_visitante_nombre?.charAt(0) || 'V'}
                      </div>
                      <div className="font-bold text-gray-800 text-sm mb-1">
                        {partido.equipo_visitante_nombre}
                      </div>
                      <div className="text-3xl font-bold text-gray-900">
                        {partido.goles_visitante !== null ? partido.goles_visitante : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Estado del partido */}
                  <div className="mt-4 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      partido.goles_local !== null && partido.goles_visitante !== null 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {partido.goles_local !== null && partido.goles_visitante !== null 
                        ? '✅ Partido Finalizado'
                        : '⏰ Por Jugar'
                      }
                    </span>
                  </div>
                </div>

                {/* Footer con detalles */}
                {(partido.goles_local !== null && partido.goles_visitante !== null) && (
                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                    <div className="text-center text-sm text-gray-600">
                      {partido.goles_local > partido.goles_visitante 
                        ? `Victoria del ${partido.equipo_local_nombre}`
                        : partido.goles_local < partido.goles_visitante
                        ? `Victoria del ${partido.equipo_visitante_nombre}`
                        : 'Empate'
                      }
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contador de partidos */}
        {partidos.length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow">
              <Trophy size={16} className="text-yellow-500" />
              <span className="text-sm text-gray-600">
                {partidos.length} partido{partidos.length !== 1 ? 's' : ''} en esta jornada
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarScreen;