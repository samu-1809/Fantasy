import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, RefreshCw, Clock, Award } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';

const CalendarScreen = () => {
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const {
    jornadas,
    partidos,
    cargarJornadas,
    cargarPartidosJornada,
    loading: adminLoading,
    error
  } = useAdmin();

  useEffect(() => {
    const inicializarCalendario = async () => {
      setLoading(true);
      await cargarJornadas();
      setLoading(false);
    };

    inicializarCalendario();
  }, [cargarJornadas]);

  // Seleccionar primera jornada al cargar
  useEffect(() => {
    if (jornadas.length > 0 && !jornadaSeleccionada) {
      setJornadaSeleccionada(jornadas[0].id);
    }
  }, [jornadas, jornadaSeleccionada]);

  // Cargar partidos cuando se selecciona una jornada
  useEffect(() => {
    if (jornadaSeleccionada) {
      cargarPartidosJornada(jornadaSeleccionada);
    }
  }, [jornadaSeleccionada, cargarPartidosJornada]);

  const handleJornadaChange = async (jornadaId) => {
    setJornadaSeleccionada(jornadaId);
  };

  const getEstadoPartido = (partido) => {
    if (partido.jugado) {
      return { 
        texto: 'Jugado', 
        clase: 'bg-green-100 text-green-800 border-green-200',
        icon: <Award size={14} />
      };
    }
    
    const fechaPartido = new Date(partido.fecha);
    const ahora = new Date();
    
    if (fechaPartido < ahora) {
      return { 
        texto: 'En juego', 
        clase: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <Clock size={14} />
      };
    }
    
    return { 
      texto: 'Pendiente', 
      clase: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <CalendarIcon size={14} />
    };
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg text-center max-w-md">
          <p className="text-red-600 font-bold mb-4">{error}</p>
          <button 
            onClick={cargarJornadas}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const jornadaActual = jornadas.find(j => j.id === jornadaSeleccionada);
  const partidosJornada = partidos[jornadaSeleccionada] || [];

  // Estadísticas de la jornada
  const estadisticasJornada = {
    totalPartidos: partidosJornada.length,
    partidosJugados: partidosJornada.filter(p => p.jugado).length,
    partidosPendientes: partidosJornada.filter(p => !p.jugado).length,
    golesTotales: partidosJornada.reduce((sum, p) => sum + (p.goles_local || 0) + (p.goles_visitante || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow">
          <h1 className="text-3xl font-bold text-center mb-2 flex items-center justify-center gap-3">
            <CalendarIcon size={32} className="text-white" />
            Calendario de Partidos
          </h1>
          <p className="text-center text-blue-100">
            Consulta los partidos y resultados de cada jornada
          </p>
        </div>

        {/* Selector de Jornada y Estadísticas */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Seleccionar Jornada:
              </label>
              <select
                value={jornadaSeleccionada || ''}
                onChange={(e) => handleJornadaChange(parseInt(e.target.value))}
                className="w-full border-2 border-gray-300 p-3 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecciona una jornada</option>
                {jornadas.map(jornada => (
                  <option key={jornada.id} value={jornada.id}>
                    Jornada {jornada.numero}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Estadísticas de la jornada */}
            {jornadaActual && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-2 bg-blue-50 rounded border">
                  <div className="font-bold text-blue-600">{estadisticasJornada.totalPartidos}</div>
                  <div className="text-blue-800">Partidos</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded border">
                  <div className="font-bold text-green-600">{estadisticasJornada.partidosJugados}</div>
                  <div className="text-green-800">Jugados</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded border">
                  <div className="font-bold text-yellow-600">{estadisticasJornada.partidosPendientes}</div>
                  <div className="text-yellow-800">Pendientes</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded border">
                  <div className="font-bold text-purple-600">{estadisticasJornada.golesTotales}</div>
                  <div className="text-purple-800">Goles</div>
                </div>
              </div>
            )}

            <button
              onClick={cargarJornadas}
              className="bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Lista de Partidos */}
        <div className="bg-white rounded-lg shadow border-2 border-gray-300">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">
              {jornadaSeleccionada ? `Partidos - Jornada ${jornadaActual?.numero}` : 'Selecciona una jornada'}
            </h2>
            
            {partidosJornada.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon size={64} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">No hay partidos en esta jornada</p>
                <p className="text-gray-400 text-sm mt-2">
                  Los partidos se programan desde el panel de administración
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partidosJornada.map(partido => {
                  const estado = getEstadoPartido(partido);
                  
                  return (
                    <div key={partido.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white">
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-sm text-gray-500">
                          {formatFecha(partido.fecha)}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium border ${estado.clase} flex items-center gap-1`}>
                          {estado.icon}
                          {estado.texto}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-center flex-1">
                          <div className="font-bold text-lg">{partido.equipo_local_nombre}</div>
                          {partido.jugado && (
                            <div className="text-2xl font-bold text-blue-600">{partido.goles_local}</div>
                          )}
                        </div>
                        
                        <div className="mx-4 text-gray-400 font-bold text-xl">VS</div>
                        
                        <div className="text-center flex-1">
                          <div className="font-bold text-lg">{partido.equipo_visitante_nombre}</div>
                          {partido.jugado && (
                            <div className="text-2xl font-bold text-blue-600">{partido.goles_visitante}</div>
                          )}
                        </div>
                      </div>
                      
                      {!partido.jugado && (
                        <div className="text-center mt-3">
                          <div className="text-sm text-gray-500">
                            {new Date(partido.fecha) > new Date() 
                              ? `Programado para ${new Date(partido.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                              : 'Partido en desarrollo'
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarScreen;