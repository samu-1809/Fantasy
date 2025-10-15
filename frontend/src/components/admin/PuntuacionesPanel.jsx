import React, { useState, useEffect, useCallback } from 'react';
import { Search, Save, Calendar, TrendingUp } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';

const PuntuacionesPanel = ({ jugadores, equiposReales, onAsignarPuntosSuccess }) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('todos');
  const [asignandoPuntos, setAsignandoPuntos] = useState(false);
  const [puntosTemporales, setPuntosTemporales] = useState({});
  const [historialJugadores, setHistorialJugadores] = useState({});
  const [historialCargado, setHistorialCargado] = useState(false);
  
  // 🆕 Usar todas las funciones y estados del hook useAdmin
  const {
    jornadas,
    jornadaSeleccionada,
    setJornadaSeleccionada,
    cargarPuntuacionesJugador,
    actualizarPuntuacionJugador,
  } = useAdmin();

  // 🆕 Inicializar puntos temporales cuando cambia la jornada o los jugadores
  useEffect(() => {
    if (jornadaSeleccionada && jugadores) {
      const nuevosPuntos = {};
      jugadores.forEach(jugador => {
        // Inicializar con campo vacío para cada jugador en esta jornada
        nuevosPuntos[jugador.id] = '';
      });
      setPuntosTemporales(nuevosPuntos);
    }
  }, [jornadaSeleccionada, jugadores]);

  // 🆕 Cargar historial de puntuaciones SOLO UNA VEZ
  useEffect(() => {
    const cargarHistorial = async () => {
      // Evitar cargar múltiples veces
      if (historialCargado || !jugadores || jugadores.length === 0) return;
      
      console.log('🔄 Cargando historial de puntuaciones...');
      setHistorialCargado(true);
      
      const nuevoHistorial = {};
      const jugadoresUnicos = jugadores.filter((jugador, index, self) => 
        index === self.findIndex(j => j.id === jugador.id)
      );
      
      // Limitar a 10 jugadores por lote para no saturar
      const lotes = [];
      for (let i = 0; i < jugadoresUnicos.length; i += 10) {
        lotes.push(jugadoresUnicos.slice(i, i + 10));
      }
      
      for (const lote of lotes) {
        const promesas = lote.map(async (jugador) => {
          try {
            const puntuaciones = await cargarPuntuacionesJugador(jugador.id);
            // Ordenar por jornada_numero descendente y tomar las últimas 5
            const ultimasPuntuaciones = puntuaciones
              .sort((a, b) => b.jornada_numero - a.jornada_numero)
              .slice(0, 5);
            return { jugadorId: jugador.id, puntuaciones: ultimasPuntuaciones };
          } catch (err) {
            console.error(`Error cargando historial para ${jugador.nombre}:`, err);
            return { jugadorId: jugador.id, puntuaciones: [] };
          }
        });
        
        const resultados = await Promise.all(promesas);
        resultados.forEach(({ jugadorId, puntuaciones }) => {
          nuevoHistorial[jugadorId] = puntuaciones;
        });
        
        // Pequeña pausa entre lotes
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setHistorialJugadores(nuevoHistorial);
      console.log('✅ Historial de puntuaciones cargado');
    };

    cargarHistorial();
  }, [jugadores, cargarPuntuacionesJugador, historialCargado]);

  // 🆕 Manejar cambio de puntos para un jugador (MEJORADA)
  const handlePuntosChange = (jugadorId, valor) => {
    // Si el valor está vacío, guardar como cadena vacía
    if (valor === '' || valor === null || valor === undefined) {
      setPuntosTemporales(prev => ({
        ...prev,
        [jugadorId]: ''
      }));
      return;
    }

    // Convertir a número y asegurar que no sea NaN
    const puntosNum = parseInt(valor);
    setPuntosTemporales(prev => ({
      ...prev,
      [jugadorId]: isNaN(puntosNum) ? '' : puntosNum
    }));
  };

 const asignarPuntosJornada = async () => {
    if (!jornadaSeleccionada) {
      alert('Por favor selecciona una jornada');
      return;
    }

    setAsignandoPuntos(true);
    try {
      const resultados = [];
      const errores = [];

      // Procesar cada jugador con puntos asignados
      for (const [jugadorId, puntos] of Object.entries(puntosTemporales)) {
        // Saltar jugadores sin puntos
        if (puntos === '' || puntos === null || puntos === undefined) {
          continue;
        }

        const puntosNum = parseInt(puntos);
        if (isNaN(puntosNum)) {
          continue;
        }

        try {
          const resultado = await actualizarPuntuacionJugador(
            parseInt(jugadorId),
            jornadaSeleccionada,
            puntosNum
          );
          resultados.push({ 
            jugadorId, 
            success: true, 
            data: resultado,
            jugadorNombre: jugadores.find(j => j.id === parseInt(jugadorId))?.nombre || 'Desconocido'
          });
        } catch (error) {
          errores.push({ 
            jugadorId, 
            error: error.message,
            jugadorNombre: jugadores.find(j => j.id === parseInt(jugadorId))?.nombre || 'Desconocido'
          });
        }
      }

      if (resultados.length === 0 && errores.length === 0) {
        alert('No hay puntos para asignar');
        return;
      }

      if (errores.length > 0) {
        const erroresTexto = errores.map(e => `${e.jugadorNombre}: ${e.error}`).join('\n');
        alert(`Se asignaron puntos a ${resultados.length} jugadores, pero hubo ${errores.length} errores:\n\n${erroresTexto}`);
      } else {
        alert(`✅ Puntos asignados exitosamente para la jornada ${jornadaActual?.numero} a ${resultados.length} jugadores`);
      }
      
      onAsignarPuntosSuccess?.();
      
      // Recargar historial después de asignar puntos
      setHistorialCargado(false);
      
    } catch (err) {
      console.error('Error general asignando puntos:', err);
      alert('Error al asignar puntos: ' + err.message);
    } finally {
      setAsignandoPuntos(false);
    }
  };

  // 🆕 Asignar puntos masivamente por equipo real
  const asignarPuntosMasivos = (puntos) => {
    const jugadoresFiltradosActuales = jugadoresFiltrados;
    const nuevosPuntos = { ...puntosTemporales };
    
    jugadoresFiltradosActuales.forEach(jugador => {
      nuevosPuntos[jugador.id] = puntos;
    });
    
    setPuntosTemporales(nuevosPuntos);
  };

  // 🆕 Limpiar todos los puntos temporales (poner en blanco)
  const limpiarPuntos = () => {
    const nuevosPuntos = {};
    jugadores.forEach(jugador => {
      nuevosPuntos[jugador.id] = '';
    });
    setPuntosTemporales(nuevosPuntos);
  };

  // Filtrar jugadores
  const jugadoresFiltrados = (jugadores || []).filter(jugador => {
    if (!jugador) return false;
    
    const nombreJugador = (jugador.nombre || '').toLowerCase();
    const equipoReal = (jugador.equipo_real_nombre || '').toLowerCase();
    const busquedaLower = busqueda.toLowerCase();
    
    const coincideBusqueda = busqueda === '' || 
                            nombreJugador.includes(busquedaLower) || 
                            equipoReal.includes(busquedaLower);
    
    const coincideEquipo = filtroEquipo === 'todos' || 
                          (jugador.equipo_real_nombre && 
                           jugador.equipo_real_nombre === filtroEquipo);
    
    return coincideBusqueda && coincideEquipo;
  });

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;

  const getColorPuntos = (puntos) => {
    if (puntos === '' || puntos === 0) return 'text-gray-400 bg-gray-100 border-gray-200';
    if (puntos >= 8) return 'text-green-600 bg-green-100 border-green-200';
    if (puntos >= 5) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (puntos >= 0) return 'text-gray-600 bg-gray-100 border-gray-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  // 🆕 Función para renderizar el mini gráfico de barras
  const renderMiniGrafico = (jugadorId) => {
    const historial = historialJugadores[jugadorId] || [];
    
    if (historial.length === 0) {
      return (
        <div className="flex items-center justify-center h-8 text-xs text-gray-400">
          Sin datos
        </div>
      );
    }

    // Encontrar el valor máximo para escalar las barras
    const maxPuntos = Math.max(...historial.map(p => p.puntos), 1);
    
    return (
      <div className="flex items-end gap-1 h-8">
        {historial.map((puntuacion, index) => {
          const altura = (puntuacion.puntos / maxPuntos) * 24; // 24px de altura máxima
          const color = puntuacion.puntos >= 8 ? 'bg-green-500' : 
                       puntuacion.puntos >= 5 ? 'bg-blue-500' : 
                       puntuacion.puntos >= 0 ? 'bg-gray-400' : 'bg-red-500';
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-3 ${color} rounded-t transition-all duration-300`}
                style={{ height: `${Math.max(altura, 4)}px` }} // Mínimo 4px de altura
                title={`J${puntuacion.jornada_numero}: ${puntuacion.puntos} pts`}
              />
              <span className="text-[10px] text-gray-500 mt-1">
                J{puntuacion.jornada_numero}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // 🆕 Calcular estadísticas de la jornada actual
  const estadisticas = {
    totalJugadores: jugadoresFiltrados.length,
    jugadoresConPuntos: jugadoresFiltrados.filter(j => {
      const puntos = puntosTemporales[j.id];
      return puntos !== '' && puntos !== null && puntos !== undefined && puntos !== 0;
    }).length,
    puntosTotalesJornada: jugadoresFiltrados.reduce((sum, j) => {
      const puntos = puntosTemporales[j.id];
      return sum + (puntos === '' ? 0 : (puntos || 0));
    }, 0),
    get promedioPuntosJornada() {
      return this.jugadoresConPuntos > 0 ? (this.puntosTotalesJornada / this.jugadoresConPuntos) : 0;
    }
  };

  const jornadaActual = jornadas.find(j => j.id === jornadaSeleccionada);

  return (
    <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
      {/* Header con selección de jornada */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Asignación de Puntos</h2>
            <p className="text-gray-600">Selecciona una jornada y asigna puntos a los jugadores</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <Calendar className="text-blue-600" size={20} />
              <select
                value={jornadaSeleccionada || ''}
                onChange={(e) => setJornadaSeleccionada(parseInt(e.target.value))}
                className="bg-transparent border-none text-blue-700 font-medium focus:outline-none focus:ring-0"
              >
                <option value="">Seleccionar jornada</option>
                {jornadas.map(jornada => (
                  <option key={jornada.id} value={jornada.id}>
                    Jornada {jornada.numero}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y controles rápidos */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
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

        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Filtrar por Equipo Real</label>
          <select
            value={filtroEquipo}
            onChange={(e) => setFiltroEquipo(e.target.value)}
            className="w-full border-2 border-gray-300 p-3 rounded bg-white"
          >
            <option value="todos">Todos los equipos</option>
            {(equiposReales || []).map(equipo => (
              <option key={equipo.id} value={equipo.nombre}>
                {equipo.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={() => { setBusqueda(''); setFiltroEquipo('todos'); }}
            className="bg-gray-500 text-white p-3 rounded font-medium hover:bg-gray-600 whitespace-nowrap"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Controles rápidos de puntos */}
      {jornadaSeleccionada && (
        <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-3">Asignación Rápida</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => asignarPuntosMasivos(2)}
              className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              +2 Puntos a Todos
            </button>
            <button
              onClick={() => asignarPuntosMasivos(5)}
              className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              +5 Puntos a Todos
            </button>
            <button
              onClick={() => asignarPuntosMasivos(8)}
              className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              +8 Puntos a Todos
            </button>
            <button
              onClick={limpiarPuntos}
              className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Limpiar Campos
            </button>
          </div>
        </div>
      )}

      {/* Lista de Jugadores */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {!jornadaSeleccionada ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Selecciona una jornada para comenzar</p>
            <p className="text-sm">Elige una jornada del selector superior</p>
          </div>
        ) : jugadoresFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No se encontraron jugadores</p>
            <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          jugadoresFiltrados.map((jugador) => (
            <div key={jugador.id} className="flex items-center gap-6 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all duration-200">
              {/* Información del jugador */}
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {jugador.posicion}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">{jugador.nombre}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {jugador.equipo_real_nombre || 'Sin equipo'}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {formatValue(jugador.valor)}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {jugador.puntos_totales || 0} pts totales
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 🆕 Mini gráfico de últimas jornadas */}
              <div className="flex-1 max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">Últimas jornadas</span>
                </div>
                {renderMiniGrafico(jugador.id)}
              </div>
              
              {/* Input de puntos */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm text-gray-600 font-medium">Puntos Jornada {jornadaActual?.numero}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={puntosTemporales[jugador.id] === '' ? '' : (puntosTemporales[jugador.id] || 0)}
                    onChange={(e) => {
                      const valor = e.target.value;
                      // Permitir campo vacío o números
                      if (valor === '' || /^\d*$/.test(valor)) {
                        handlePuntosChange(jugador.id, valor);
                      }
                    }}
                    onBlur={(e) => {
                      // Cuando pierde el foco, convertir a número o dejar vacío
                      const valor = e.target.value;
                      if (valor === '') {
                        handlePuntosChange(jugador.id, '');
                      } else {
                        const num = parseInt(valor);
                        handlePuntosChange(jugador.id, isNaN(num) ? '' : num);
                      }
                    }}
                    className="w-20 border-2 border-gray-300 p-2 rounded text-center focus:border-blue-500 focus:outline-none"
                    placeholder="0"
                    min="0"
                    max="20"
                  />
                  <span className={`px-3 py-2 rounded text-sm font-bold border ${getColorPuntos(puntosTemporales[jugador.id] || '')}`}>
                    {puntosTemporales[jugador.id] === '' ? '-' : (puntosTemporales[jugador.id] || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Botón de guardar */}
      {jornadaSeleccionada && jugadoresFiltrados.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="text-sm text-gray-600">
              <strong>{estadisticas.jugadoresConPuntos}</strong> jugadores con puntos asignados • 
              Total: <strong>{estadisticas.puntosTotalesJornada}</strong> puntos • 
              Promedio: <strong>{estadisticas.promedioPuntosJornada.toFixed(1)}</strong>
            </div>
            
            <button
              onClick={asignarPuntosJornada}
              disabled={asignandoPuntos || !jornadaSeleccionada}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={20} />
              {asignandoPuntos ? 'Asignando...' : `Guardar Puntos - Jornada ${jornadaActual?.numero}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuntuacionesPanel;