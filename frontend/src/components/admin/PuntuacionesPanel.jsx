import React, { useState, useEffect, useCallback } from 'react';
import { Search, Save, Calendar, TrendingUp, Goal, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import MiniGrafico from '../market/components/MiniGrafico'; 

const PuntuacionesPanel = ({ jugadores, equiposReales, onAsignarPuntosSuccess }) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('todos');
  const [asignandoPuntos, setAsignandoPuntos] = useState(false);
  const [puntosTemporales, setPuntosTemporales] = useState({});
  const [golesTemporales, setGolesTemporales] = useState({});
  const [historialJugadores, setHistorialJugadores] = useState({});
  const [historialCargado, setHistorialCargado] = useState(false);
  const [jugadorModal, setJugadorModal] = useState(null); // 🆕 Estado para el modal

  const {
    jornadas,
    jornadaSeleccionada,
    setJornadaSeleccionada,
    cargarPuntuacionesJugador,
    actualizarPuntuacionJugador,
  } = useAdmin();

  // 🆕 Función para abrir el modal con el jugador seleccionado
  const abrirModalJugador = (jugador) => {
    setJugadorModal(jugador);
  };

  // 🆕 Función para cerrar el modal
  const cerrarModal = () => {
    setJugadorModal(null);
  };

  // 🆕 Cargar historial completo para el modal
  const [historialCompleto, setHistorialCompleto] = useState({});
  
  const cargarHistorialCompleto = async (jugadorId) => {
    try {
      const puntuaciones = await cargarPuntuacionesJugador(jugadorId);
      setHistorialCompleto(prev => ({
        ...prev,
        [jugadorId]: puntuaciones
      }));
    } catch (err) {
      console.error(`Error cargando historial completo para jugador ${jugadorId}:`, err);
    }
  };

  // 🆕 Cargar historial completo cuando se abre el modal
  useEffect(() => {
    if (jugadorModal) {
      cargarHistorialCompleto(jugadorModal.id);
    }
  }, [jugadorModal]);

  // Inicializar puntos y goles temporales cuando cambia la jornada
  useEffect(() => {
    if (jornadaSeleccionada && jugadores) {
      const nuevosPuntos = {};
      const nuevosGoles = {};
      jugadores.forEach(jugador => {
        nuevosPuntos[jugador.id] = '';
        nuevosGoles[jugador.id] = '';
      });
      setPuntosTemporales(nuevosPuntos);
      setGolesTemporales(nuevosGoles);
    }
  }, [jornadaSeleccionada, jugadores]);

  // Cargar historial de puntuaciones
  useEffect(() => {
    const cargarHistorial = async () => {
      if (historialCargado || !jugadores || jugadores.length === 0) return;
      
      console.log('🔄 Cargando historial de puntuaciones...');
      setHistorialCargado(true);
      
      const nuevoHistorial = {};
      const jugadoresUnicos = jugadores.filter((jugador, index, self) => 
        index === self.findIndex(j => j.id === jugador.id)
      );
      
      const lotes = [];
      for (let i = 0; i < jugadoresUnicos.length; i += 10) {
        lotes.push(jugadoresUnicos.slice(i, i + 10));
      }
      
      for (const lote of lotes) {
        const promesas = lote.map(async (jugador) => {
          try {
            const puntuaciones = await cargarPuntuacionesJugador(jugador.id);
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
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setHistorialJugadores(nuevoHistorial);
      console.log('✅ Historial de puntuaciones cargado');
    };

    cargarHistorial();
  }, [jugadores, cargarPuntuacionesJugador, historialCargado]);

  // Manejar cambio de puntos
  const handlePuntosChange = (jugadorId, valor) => {
    if (valor === '' || valor === null || valor === undefined) {
      setPuntosTemporales(prev => ({
        ...prev,
        [jugadorId]: ''
      }));
      return;
    }

    const puntosNum = parseInt(valor);
    setPuntosTemporales(prev => ({
      ...prev,
      [jugadorId]: isNaN(puntosNum) ? '' : puntosNum
    }));
  };

  // Manejar cambio de goles
  const handleGolesChange = (jugadorId, valor) => {
    if (valor === '' || valor === null || valor === undefined) {
      setGolesTemporales(prev => ({
        ...prev,
        [jugadorId]: ''
      }));
      return;
    }

    const golesNum = parseInt(valor);
    setGolesTemporales(prev => ({
      ...prev,
      [jugadorId]: isNaN(golesNum) ? '' : golesNum
    }));
  };

  // Función para asignar puntos y goles
  const asignarPuntosJornada = async () => {
    if (!jornadaSeleccionada) {
      alert('Por favor selecciona una jornada');
      return;
    }

    setAsignandoPuntos(true);
    try {
      const resultados = [];
      const errores = [];

      for (const [jugadorId, puntos] of Object.entries(puntosTemporales)) {
        const goles = golesTemporales[jugadorId] || 0;
        
        if ((puntos === '' || puntos === null || puntos === undefined) && 
            (goles === '' || goles === null || goles === undefined || goles === 0)) {
          continue;
        }

        const puntosNum = puntos === '' ? 0 : parseInt(puntos);
        const golesNum = goles === '' ? 0 : parseInt(goles);

        if (isNaN(puntosNum)) continue;
        if (isNaN(golesNum)) continue;

        try {
          const resultado = await actualizarPuntuacionJugador(
            parseInt(jugadorId),
            jornadaSeleccionada,
            puntosNum,
            golesNum
          );
          resultados.push({ 
            jugadorId, 
            success: true, 
            data: resultado,
            jugadorNombre: jugadores.find(j => j.id === parseInt(jugadorId))?.nombre || 'Desconocido',
            puntos: puntosNum,
            goles: golesNum
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
        alert('No hay puntos ni goles para asignar');
        return;
      }

      if (errores.length > 0) {
        const erroresTexto = errores.map(e => `${e.jugadorNombre}: ${e.error}`).join('\n');
        alert(`Se asignaron puntos/goles a ${resultados.length} jugadores, pero hubo ${errores.length} errores:\n\n${erroresTexto}`);
      } else {
        const totalGoles = resultados.reduce((sum, r) => sum + (r.goles || 0), 0);
        alert(`✅ Puntos y goles asignados exitosamente para la jornada ${jornadaActual?.numero}\n\n${resultados.length} jugadores actualizados\n${totalGoles} goles totales`);
      }
      
      onAsignarPuntosSuccess?.();
      setHistorialCargado(false);
      
    } catch (err) {
      console.error('Error general asignando puntos:', err);
      alert('Error al asignar puntos: ' + err.message);
    } finally {
      setAsignandoPuntos(false);
    }
  };

  // Asignar puntos masivamente por equipo real
  const asignarPuntosMasivos = (puntos, goles = 0) => {
    const jugadoresFiltradosActuales = jugadoresFiltrados;
    const nuevosPuntos = { ...puntosTemporales };
    const nuevosGoles = { ...golesTemporales };
    
    jugadoresFiltradosActuales.forEach(jugador => {
      nuevosPuntos[jugador.id] = puntos;
      if (goles > 0) {
        nuevosGoles[jugador.id] = goles;
      }
    });
    
    setPuntosTemporales(nuevosPuntos);
    if (goles > 0) {
      setGolesTemporales(nuevosGoles);
    }
  };

  // Limpiar todos los puntos y goles temporales
  const limpiarPuntos = () => {
    const nuevosPuntos = {};
    const nuevosGoles = {};
    jugadores.forEach(jugador => {
      nuevosPuntos[jugador.id] = '';
      nuevosGoles[jugador.id] = '';
    });
    setPuntosTemporales(nuevosPuntos);
    setGolesTemporales(nuevosGoles);
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

  // Función para renderizar el mini gráfico de barras
  const renderMiniGrafico = (jugadorId) => {
    const historial = historialJugadores[jugadorId] || [];
    
    if (historial.length === 0) {
      return (
        <div className="flex items-center justify-center h-8 text-xs text-gray-400">
          Sin datos
        </div>
      );
    }

    const maxPuntos = Math.max(...historial.map(p => p.puntos), 1);
    
    return (
      <div className="flex items-end gap-1 h-8">
        {historial.map((puntuacion, index) => {
          const altura = (puntuacion.puntos / maxPuntos) * 24;
          const color = puntuacion.puntos >= 8 ? 'bg-green-500' : 
                       puntuacion.puntos >= 5 ? 'bg-blue-500' : 
                       puntuacion.puntos >= 0 ? 'bg-gray-400' : 'bg-red-500';
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div className="flex flex-col items-center">
                {puntuacion.goles > 0 && (
                  <div className="mb-0.5 flex items-center justify-center">
                    <div className="flex items-center gap-0.5 bg-orange-100 px-1 py-0.5 rounded text-xs">
                      <span className="text-xs font-bold text-orange-700">{puntuacion.goles}</span>
                      <span className="text-[10px]">⚽</span>
                    </div>
                  </div>
                )}
                
                <div
                  className={`w-3 ${color} rounded-t transition-all duration-300 relative group`}
                  style={{ height: `${Math.max(altura, 4)}px` }}
                  title={`J${puntuacion.jornada_numero}: ${puntuacion.puntos} pts${puntuacion.goles > 0 ? `, ${puntuacion.goles} goles` : ''}`}
                />
              </div>
              
              <span className="text-[10px] text-gray-500 mt-1">
                J{puntuacion.jornada_numero}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Calcular estadísticas de la jornada actual
  const estadisticas = {
    totalJugadores: jugadoresFiltrados.length,
    jugadoresConPuntos: jugadoresFiltrados.filter(j => {
      const puntos = puntosTemporales[j.id];
      return puntos !== '' && puntos !== null && puntos !== undefined && puntos !== 0;
    }).length,
    jugadoresConGoles: jugadoresFiltrados.filter(j => {
      const goles = golesTemporales[j.id];
      return goles !== '' && goles !== null && goles !== undefined && goles !== 0;
    }).length,
    puntosTotalesJornada: jugadoresFiltrados.reduce((sum, j) => {
      const puntos = puntosTemporales[j.id];
      return sum + (puntos === '' ? 0 : (puntos || 0));
    }, 0),
    golesTotalesJornada: jugadoresFiltrados.reduce((sum, j) => {
      const goles = golesTemporales[j.id];
      return sum + (goles === '' ? 0 : (goles || 0));
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
            <h2 className="text-2xl font-bold text-gray-800">Asignación de Puntos y Goles</h2>
            <p className="text-gray-600">Selecciona una jornada y asigna puntos y goles a los jugadores</p>
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

      {/* Controles rápidos de puntos y goles */}
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
              onClick={() => asignarPuntosMasivos(0, 1)}
              className="px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 flex items-center gap-1"
            >
              <Goal size={14} />
              +1 Gol a Todos
            </button>
            <button
              onClick={() => asignarPuntosMasivos(0, 2)}
              className="px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center gap-1"
            >
              <Goal size={14} />
              +2 Goles a Todos
            </button>
            <button
              onClick={limpiarPuntos}
              className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
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
            <div 
              key={jugador.id} 
              className="flex items-center gap-6 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer"
              onClick={() => abrirModalJugador(jugador)} // 🆕 Hacer click en toda la fila
            >
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
              
              {/* Mini gráfico de últimas jornadas */}
              <div className="flex-1 max-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">Últimas jornadas</span>
                </div>
                {renderMiniGrafico(jugador.id)}
              </div>
              
              {/* Inputs de puntos y goles */}
              <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}> {/* 🆕 Evitar que el click en inputs abra el modal */}
                <div className="text-right">
                  <div className="text-sm text-gray-600 font-medium">Puntos</div>
                  <div className="text-sm text-gray-600 font-medium">Goles</div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-2">
                    <input
                      type="number"
                      value={puntosTemporales[jugador.id] === '' ? '' : (puntosTemporales[jugador.id] || 0)}
                      onChange={(e) => {
                        const valor = e.target.value;
                        if (valor === '' || /^\d*$/.test(valor)) {
                          handlePuntosChange(jugador.id, valor);
                        }
                      }}
                      onBlur={(e) => {
                        const valor = e.target.value;
                        if (valor === '') {
                          handlePuntosChange(jugador.id, '');
                        } else {
                          const num = parseInt(valor);
                          handlePuntosChange(jugador.id, isNaN(num) ? '' : num);
                        }
                      }}
                      className="w-16 border-2 border-gray-300 p-2 rounded text-center focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                      min="0"
                      max="20"
                    />
                    
                    <input
                      type="number"
                      value={golesTemporales[jugador.id] === '' ? '' : (golesTemporales[jugador.id] || 0)}
                      onChange={(e) => {
                        const valor = e.target.value;
                        if (valor === '' || /^\d*$/.test(valor)) {
                          handleGolesChange(jugador.id, valor);
                        }
                      }}
                      onBlur={(e) => {
                        const valor = e.target.value;
                        if (valor === '') {
                          handleGolesChange(jugador.id, '');
                        } else {
                          const num = parseInt(valor);
                          handleGolesChange(jugador.id, isNaN(num) ? '' : num);
                        }
                      }}
                      className="w-16 border-2 border-gray-300 p-2 rounded text-center focus:border-orange-500 focus:outline-none"
                      placeholder="0"
                      min="0"
                      max="10"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <span className={`px-3 py-2 rounded text-sm font-bold border ${getColorPuntos(puntosTemporales[jugador.id] || '')}`}>
                      {puntosTemporales[jugador.id] === '' ? '-' : (puntosTemporales[jugador.id] || 0)}
                    </span>
                    
                    <span className={`px-3 py-2 rounded text-sm font-bold border ${
                      golesTemporales[jugador.id] === '' || golesTemporales[jugador.id] === 0 
                        ? 'text-gray-400 bg-gray-100 border-gray-200' 
                        : 'text-orange-600 bg-orange-100 border-orange-200'
                    }`}>
                      {golesTemporales[jugador.id] === '' ? '-' : (golesTemporales[jugador.id] || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🆕 Modal para ver el gráfico completo del jugador */}
      {jugadorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del modal */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{jugadorModal.nombre}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {jugadorModal.equipo_real_nombre || 'Sin equipo'}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {formatValue(jugadorModal.valor)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {jugadorModal.posicion}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    {jugadorModal.puntos_totales || 0} pts totales
                  </span>
                </div>
              </div>
              <button 
                onClick={cerrarModal}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <MiniGrafico 
                puntuaciones={historialCompleto[jugadorModal.id] || []} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Botón de guardar */}
      {jornadaSeleccionada && jugadoresFiltrados.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="text-sm text-gray-600">
              <strong>{estadisticas.jugadoresConPuntos}</strong> jugadores con puntos • 
              <strong>{estadisticas.jugadoresConGoles}</strong> jugadores con goles • 
              Total: <strong>{estadisticas.puntosTotalesJornada}</strong> pts, 
              <strong>{estadisticas.golesTotalesJornada}</strong> goles • 
              Promedio: <strong>{estadisticas.promedioPuntosJornada.toFixed(1)}</strong> pts
            </div>
            
            <button
              onClick={asignarPuntosJornada}
              disabled={asignandoPuntos || !jornadaSeleccionada}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={20} />
              {asignandoPuntos ? 'Asignando...' : `Guardar Puntos y Goles - Jornada ${jornadaActual?.numero}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuntuacionesPanel;