import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../hooks/useAdmin';

const JornadasPanel = () => {
  const [nuevaJornadaNumero, setNuevaJornadaNumero] = useState('');
  const [nuevosPartidos, setNuevosPartidos] = useState({});
  
  const {
    jornadas,
    equiposReales,
    partidos,
    loading,
    error,
    crearJornada,
    eliminarJornada,
    crearPartido,
    eliminarPartido,
    cargarJornadas,
    cargarPartidosJornada
  } = useAdmin();

  // Función para verificar si un equipo ya está en un partido de la jornada
  const equipoYaEnJornada = (jornadaId, equipoId) => {
    const partidosJornada = partidos[jornadaId] || [];
    return partidosJornada.some(partido => 
      partido.equipo_local === equipoId || 
      partido.equipo_visitante === equipoId
    );
  };

  // Función para obtener equipos disponibles para una jornada
  const getEquiposDisponibles = (jornadaId) => {
    const partidosJornada = partidos[jornadaId] || [];
    const equiposEnJornada = new Set();
    
    partidosJornada.forEach(partido => {
      equiposEnJornada.add(partido.equipo_local);
      equiposEnJornada.add(partido.equipo_visitante);
    });

    return equiposReales.filter(equipo => !equiposEnJornada.has(equipo.id));
  };

  const handleCrearJornada = async () => {
    if (!nuevaJornadaNumero) {
      alert('Ingresa un número de jornada');
      return;
    }

    try {
      await crearJornada(nuevaJornadaNumero);
      alert('Jornada creada exitosamente');
      setNuevaJornadaNumero('');
    } catch (err) {
      alert('Error al crear jornada: ' + err.message);
    }
  };

  const handleEliminarJornada = async (jornadaId) => {
    if (window.confirm('¿Seguro que quieres eliminar esta jornada? Se eliminarán todos sus partidos.')) {
      try {
        await eliminarJornada(jornadaId);
        alert('Jornada eliminada exitosamente');
        // Eliminar también del estado nuevosPartidos
        setNuevosPartidos(prev => {
          const updated = { ...prev };
          delete updated[jornadaId];
          return updated;
        });
      } catch (err) {
        alert('Error al eliminar jornada: ' + err.message);
      }
    }
  };

  const handleCrearPartido = async (jornadaId) => {
    const nuevoPartido = nuevosPartidos[jornadaId];
    if (!nuevoPartido?.equipo_local || !nuevoPartido?.equipo_visitante) {
      alert('Selecciona ambos equipos');
      return;
    }

    // Verificar si los equipos ya están en la jornada
    if (equipoYaEnJornada(jornadaId, parseInt(nuevoPartido.equipo_local))) {
      alert('El equipo local ya está participando en otro partido de esta jornada');
      return;
    }

    if (equipoYaEnJornada(jornadaId, parseInt(nuevoPartido.equipo_visitante))) {
      alert('El equipo visitante ya está participando en otro partido de esta jornada');
      return;
    }

    // Verificar que no sea el mismo equipo
    if (nuevoPartido.equipo_local === nuevoPartido.equipo_visitante) {
      alert('No puedes seleccionar el mismo equipo como local y visitante');
      return;
    }

    try {
      await crearPartido(jornadaId, nuevoPartido.equipo_local, nuevoPartido.equipo_visitante);
      alert('Partido creado exitosamente');
      // Limpiar solo los selectores de esta jornada
      setNuevosPartidos(prev => ({
        ...prev,
        [jornadaId]: { equipo_local: '', equipo_visitante: '' }
      }));
    } catch (err) {
      alert('Error al crear partido: ' + err.message);
    }
  };

  const handleEliminarPartido = async (partidoId, jornadaId) => {
    if (window.confirm('¿Seguro que quieres eliminar este partido?')) {
      try {
        await eliminarPartido(partidoId, jornadaId);
        alert('Partido eliminado exitosamente');
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

  // Inicializar nuevosPartidos cuando se cargan las jornadas
  useEffect(() => {
    const inicialNuevosPartidos = {};
    jornadas.forEach(jornada => {
      inicialNuevosPartidos[jornada.id] = { equipo_local: '', equipo_visitante: '' };
    });
    setNuevosPartidos(inicialNuevosPartidos);
  }, [jornadas]);

  if (loading && jornadas.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && jornadas.length === 0) {
    return (
      <div className="bg-red-50 border border-red-300 p-4 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button 
          onClick={cargarJornadas}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
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
              min="1"
            />
          </div>
          <button
            onClick={handleCrearJornada}
            disabled={loading}
            className="bg-green-600 text-white p-3 rounded font-medium hover:bg-green-700 disabled:bg-gray-400 whitespace-nowrap"
          >
            {loading ? 'Creando...' : '+ Crear Jornada'}
          </button>
        </div>
      </div>

      {/* Panel de jornadas existentes */}
      <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
        <h3 className="text-xl font-bold mb-4">Jornadas Existentes ({jornadas.length})</h3>
        
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
                        handleEliminarJornada(jornada.id);
                      }}
                      className="text-red-600 hover:text-red-800 p-1 transition-colors"
                      title="Eliminar jornada"
                      disabled={loading}
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
                              handleEliminarPartido(partido.id, jornada.id);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm transition-colors"
                            disabled={loading}
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
                        disabled={loading}
                      >
                        <option value="">Equipo Local</option>
                        {getEquiposDisponibles(jornada.id).map(equipo => (
                          <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
                        ))}
                      </select>
                      <select
                        value={nuevosPartidos[jornada.id]?.equipo_visitante || ''}
                        onChange={(e) => actualizarNuevoPartido(jornada.id, 'equipo_visitante', e.target.value)}
                        className="flex-1 border border-gray-300 p-2 rounded text-sm"
                        disabled={loading}
                      >
                        <option value="">Equipo Visitante</option>
                        {getEquiposDisponibles(jornada.id).map(equipo => (
                          <option key={equipo.id} value={equipo.id}>{equipo.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCrearPartido(jornada.id);
                      }}
                      className="w-full bg-blue-600 text-white p-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      disabled={loading}
                    >
                      {loading ? 'Creando...' : '+ Añadir Partido'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JornadasPanel;