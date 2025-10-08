import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';

const ResultadosPanel = () => {
  const [resultadosEditando, setResultadosEditando] = useState({});
  const [guardando, setGuardando] = useState(false);
  
  const {
    jornadas,
    partidos,
    jornadaSeleccionada,
    setJornadaSeleccionada,
    actualizarResultadoPartido,
    cargarPartidosJornada
  } = useAdmin();

  // Inicializar resultados editando cuando se cargan los partidos
  useEffect(() => {
    if (jornadaSeleccionada && partidos[jornadaSeleccionada]) {
      const resultadosInicial = {};
      partidos[jornadaSeleccionada].forEach(partido => {
        resultadosInicial[partido.id] = {
          goles_local: partido.goles_local ?? 0,
          goles_visitante: partido.goles_visitante ?? 0
        };
      });
      setResultadosEditando(prev => ({
        ...prev,
        [jornadaSeleccionada]: resultadosInicial
      }));
    }
  }, [jornadaSeleccionada, partidos]);

  // Función para actualizar resultado de un partido
  const actualizarResultado = (partidoId, campo, valor) => {
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
      [jornadaSeleccionada]: {
        ...prev[jornadaSeleccionada],
        [partidoId]: {
          ...prev[jornadaSeleccionada]?.[partidoId],
          [campo]: valorFinal
        }
      }
    }));
  };

  const guardarTodosLosResultados = async () => {
    const partidosJornada = partidos[jornadaSeleccionada] || [];
    const resultadosJornada = resultadosEditando[jornadaSeleccionada] || {};
    
    if (partidosJornada.length === 0) {
      alert('No hay partidos en esta jornada');
      return;
    }

    setGuardando(true);
    try {
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
          const success = await actualizarResultadoPartido(partido.id, golesLocal, golesVisitante);
          if (success) {
            guardadosExitosos++;
          } else {
            errores++;
          }
        } catch (error) {
          errores++;
          console.error(`Error guardando partido ${partido.id}:`, error);
        }
      }

      // Recargar los partidos para mostrar los cambios
      await cargarPartidosJornada(jornadaSeleccionada);
      
      // Mostrar resumen
      if (errores === 0) {
        alert(`✅ Todos los resultados (${guardadosExitosos} partidos) guardados exitosamente`);
      } else {
        alert(`⚠ Resultados guardados: ${guardadosExitosos} exitosos, ${errores} con error`);
      }
      
    } catch (err) {
      alert('Error al guardar los resultados: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const partidosJornada = partidos[jornadaSeleccionada] || [];
  const jornadaActual = jornadas.find(j => j.id === jornadaSeleccionada);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-2">
            Partidos de la Jornada {jornadaActual?.numero}
          </h4>
          
          {/* Selector de Jornada */}
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Jornada</label>
            <select
              value={jornadaSeleccionada || ''}
              onChange={(e) => setJornadaSeleccionada(parseInt(e.target.value))}
              className="w-full border-2 border-gray-300 p-3 rounded bg-white focus:outline-none focus:border-blue-500"
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
          onClick={guardarTodosLosResultados}
          disabled={guardando || partidosJornada.length === 0}
          className="bg-green-600 text-white px-6 py-3 rounded font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap transition-colors"
        >
          <Save size={18} /> 
          {guardando ? 'Guardando...' : 'Guardar Todos los Resultados'}
        </button>
      </div>
      
      {partidosJornada.length === 0 ? (
        <div className="text-center text-gray-500 py-8 bg-white rounded-lg border-2 border-gray-300">
          <p>No hay partidos en esta jornada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partidosJornada.map((partido) => (
            <div key={partido.id} className="border-2 border-gray-300 rounded-lg p-4 bg-white hover:border-blue-300 transition-colors">
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
                      actualizarResultado(partido.id, 'goles_local', value);
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        actualizarResultado(partido.id, 'goles_local', 0);
                      }
                    }}
                    className="w-20 border-2 border-gray-300 p-2 rounded text-center focus:outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                
                <div className="text-2xl font-bold text-gray-500">-</div>
                
                <div className="text-center">
                  <label className="block text-sm font-medium mb-1">Goles Visitante</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={resultadosEditando[jornadaSeleccionada]?.[partido.id]?.goles_visitante ?? partido.goles_visitante ?? 0}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      actualizarResultado(partido.id, 'goles_visitante', value);
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        actualizarResultado(partido.id, 'goles_visitante', 0);
                      }
                    }}
                    className="w-20 border-2 border-gray-300 p-2 rounded text-center focus:outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Estado del partido */}
              <div className="mt-3 text-center">
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  partido.jugado 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {partido.jugado ? 'Partido jugado' : 'Partido pendiente'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResultadosPanel;