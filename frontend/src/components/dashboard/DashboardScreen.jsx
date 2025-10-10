import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Trophy } from 'lucide-react';
import { 
  getClasificacion
} from '../../services/api';
import { useTeam } from '../../hooks/useTeam';
import FieldView from './FieldView';

const DashboardScreen = ({ datosUsuario, onRefresh }) => {
  
  // Usar el hook useTeam para gestionar el estado del equipo
  const { 
    equipo, 
    jugadores, 
    loading, 
    error, 
    cargarEquipo,
    determinarAlineacion,
    realizarCambio,
    venderJugador,
    puedeVenderJugador,
    retirarJugadorDelMercado,
  } = useTeam(datosUsuario?.equipo?.id);

  // Estados para la UI
  const [loadingAlineacion, setLoadingAlineacion] = useState(false);
  const [loadingPosicion, setLoadingPosicion] = useState(false);
  const [posicionLiga, setPosicionLiga] = useState(null);
  
  // Estados para gestión de cambios
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [modoCambio, setModoCambio] = useState(false);
  const [jugadorOrigenCambio, setJugadorOrigenCambio] = useState(null);
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [jugadorAVender, setJugadorAVender] = useState(null);
  const [mostrarModalOpciones, setMostrarModalOpciones] = useState(false);
  const [loadingVenta, setLoadingVenta] = useState(false);
  
  // Estados para retirar del mercado
  const [mostrarModalRetirar, setMostrarModalRetirar] = useState(false);
  const [jugadorARetirar, setJugadorARetirar] = useState(null);
  const [loadingRetirar, setLoadingRetirar] = useState(false);
  
  // Estados para la alineación
  const [alineacion, setAlineacion] = useState({
    portero_titular: null,
    defensas_titulares: [],
    delanteros_titulares: [],
    banquillo: []
  });
  const [alineacionCargada, setAlineacionCargada] = useState(false);

  // Effect para cargar la posición en la liga
  useEffect(() => {
    const cargarPosicionLiga = async () => {
      console.log('🏆 Intentando cargar posición en liga...');
      
      const ligaId = equipo?.liga_id || datosUsuario?.ligaActual?.id;
      
      console.log('   Liga ID final:', ligaId);
      console.log('   Equipo actual:', equipo?.nombre, 'ID:', equipo?.id);
      
      if (!ligaId) {
        console.log('❌ No hay liga_id disponible');
        setPosicionLiga(null);
        return;
      }
      
      // Si no hay equipo, no podemos buscar posición
      if (!equipo || !equipo.id) {
        console.log('⏸️  No hay equipo cargado, esperando...');
        setPosicionLiga(null);
        return;
      }
      
      setLoadingPosicion(true);
      try {
        console.log(`📡 Obteniendo clasificación para liga_id: ${ligaId}`);
        const clasificacion = await getClasificacion(ligaId);
        console.log('📊 Clasificación obtenida:', clasificacion);
        
        if (!clasificacion || !Array.isArray(clasificacion)) {
          console.log('❌ Clasificación no es un array válido');
          setPosicionLiga(null);
          return;
        }
        
        // Buscar la posición del equipo actual en la clasificación
        const equipoEnClasificacion = clasificacion.find(
          equipoClasif => equipoClasif.equipo_id === equipo.id
        );
        
        if (equipoEnClasificacion) {
          console.log(`✅ Equipo encontrado en posición: ${equipoEnClasificacion.posicion}`);
          setPosicionLiga(equipoEnClasificacion.posicion);
        } else {
          console.log('⚠️ Equipo no encontrado en la clasificación por ID. Buscando por nombre...');
          const equipoPorNombre = clasificacion.find(
            equipoClasif => equipoClasif.nombre_equipo === equipo.nombre
          );
          if (equipoPorNombre) {
            console.log(`✅ Equipo encontrado por nombre en posición: ${equipoPorNombre.posicion}`);
            setPosicionLiga(equipoPorNombre.posicion);
          } else {
            console.log('❌ Equipo no encontrado en clasificación (ni por ID ni por nombre)');
            console.log('   Equipos en clasificación:', clasificacion.map(e => ({ id: e.equipo_id, nombre: e.nombre_equipo })));
            setPosicionLiga(null);
          }
        }
      } catch (error) {
        console.error('❌ Error cargando posición en liga:', error);
        setPosicionLiga(null);
      } finally {
        setLoadingPosicion(false);
      }
    };

    // Recargar posición cuando cambie el equipo o los datos del usuario
    const ligaId = equipo?.liga_id || datosUsuario?.ligaActual?.id;
    if (equipo && equipo.id && ligaId) {
      console.log('🚀 Iniciando carga de posición en liga...');
      cargarPosicionLiga();
    } else {
      console.log('⏸️  No se puede cargar posición: falta equipo o liga_id');
      console.log('   Equipo:', equipo);
      console.log('   Liga ID disponible:', ligaId);
      setPosicionLiga(null);
    }
  }, [equipo, datosUsuario]);

  // Effect para recargar datos cuando el componente se hace visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Dashboard visible - verificando si necesito recargar...');
        // Podemos considerar recargar datos si es necesario
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Effect para escuchar eventos de actualización
  useEffect(() => {
    const handleMercadoUpdate = () => {
      console.log('📢 Evento mercadoShouldUpdate recibido - recargando datos...');
      cargarEquipo();
    };

    window.addEventListener('mercadoShouldUpdate', handleMercadoUpdate);
    
    return () => {
      window.removeEventListener('mercadoShouldUpdate', handleMercadoUpdate);
    };
  }, [cargarEquipo]);

  // Effect para calcular la alineación cuando cambian los jugadores
  useEffect(() => {
    const calcularAlineacion = () => {
      if (!jugadores || jugadores.length === 0) {
        console.log('❌ No hay jugadores para calcular alineación');
        return;
      }

      console.log('🔄 Calculando alineación con useTeam...');
      setLoadingAlineacion(true);
      
      try {
        const nuevaAlineacion = determinarAlineacion(jugadores);
        console.log('✅ Alineación calculada:', nuevaAlineacion);
        
        setAlineacion(nuevaAlineacion);
        setAlineacionCargada(true);
      } catch (err) {
        console.error('❌ Error calculando alineación:', err);
      } finally {
        setLoadingAlineacion(false);
      }
    };

    // Solo calcular si tenemos jugadores y no estamos ya cargando
    if (jugadores && jugadores.length > 0 && !loadingAlineacion) {
      calcularAlineacion();
    }
  }, [jugadores, determinarAlineacion, loadingAlineacion]);

  // Funciones de gestión de jugadores
  const handleClicJugador = (jugador) => {
    if (modoCambio && jugadorOrigenCambio) {
      realizarCambioJugadores(jugadorOrigenCambio, jugador);
    } else {
      setJugadorSeleccionado(jugador);
      setMostrarModalOpciones(true);
    }
  };

  const iniciarModoCambio = (jugador) => {
    setJugadorOrigenCambio(jugador);
    setModoCambio(true);
    setMostrarModalOpciones(false);
    setJugadorSeleccionado(null);
  };

  const cancelarModoCambio = () => {
    setModoCambio(false);
    setJugadorOrigenCambio(null);
  };

  const realizarCambioJugadores = async (origen, destino) => {
    console.log('🔄 REALIZAR CAMBIO - Datos completos:');
    console.log('   Origen:', origen);
    console.log('   Destino:', destino);
    
    if (!equipo?.id) {
      alert('❌ Error: No se pudo identificar el equipo');
      cancelarModoCambio();
      return;
    }
    
    // ✅ Validar que el jugador destino no esté en venta
    if (destino.en_venta) {
      alert('❌ No puedes cambiar con un jugador que está en venta. Primero retíralo del mercado.');
      cancelarModoCambio();
      return;
    }
    
    if (origen.posicion !== destino.posicion) {
      alert(`❌ No puedes cambiar un ${origen.posicion} por un ${destino.posicion}. Deben ser de la misma posición.`);
      cancelarModoCambio();
      return;
    }

    try {
      console.log('📡 Llamando a realizarCambio...');
      await realizarCambio(origen.id, destino.id);
      
      console.log('✅ Cambio completado');
      alert(`✅ Cambio realizado: ${origen.nombre} ↔ ${destino.nombre}`);
      
    } catch (err) {
      console.error('❌ Error en realizarCambio:', err);
      alert('❌ Error al realizar el cambio: ' + err.message);
    } finally {
      cancelarModoCambio();
    }
  };

  const getEstadoJugador = (jugador) => {
    if (modoCambio && jugadorOrigenCambio) {
      if (jugador.id === jugadorOrigenCambio?.id) {
        return 'origen-cambio';
      } else if (jugador.posicion === jugadorOrigenCambio?.posicion) {
        // ✅ NO permitir cambio con jugadores en venta
        if (jugador.en_venta) {
          return 'no-apto-cambio';
        }
        return 'apto-cambio';
      } else {
        return 'no-apto-cambio';
      }
    } else if (jugador.id === jugadorSeleccionado?.id) {
      return 'seleccionado';
    }
    return 'normal';
  };

  // Función para abrir modal de venta
  const abrirModalVenta = (jugador) => {
    setJugadorAVender(jugador);
    setMostrarModalVenta(true);
    setJugadorSeleccionado(null);
    setMostrarModalOpciones(false);
  };

  const cerrarModalVenta = () => {
    setMostrarModalVenta(false);
    setJugadorAVender(null);
    setLoadingVenta(false);
  };

  // Funciones para retirar del mercado
  const abrirModalRetirar = (jugador) => {
    setJugadorARetirar(jugador);
    setMostrarModalRetirar(true);
    setJugadorSeleccionado(null);
    setMostrarModalOpciones(false);
  };

  const cerrarModalRetirar = () => {
    setMostrarModalRetirar(false);
    setJugadorARetirar(null);
    setLoadingRetirar(false);
  };

  const confirmarPonerEnVenta = async () => {
    if (!jugadorAVender || !equipo?.id) {
      alert('❌ Error: Datos incompletos');
      return;
    }

    setLoadingVenta(true);
    try {
      console.log(`🔄 Poniendo en venta jugador: ${jugadorAVender.nombre}`);
      
      await venderJugador(jugadorAVender.id, jugadorAVender.valor);
      
      console.log('✅ Jugador puesto en venta correctamente');
      
      window.dispatchEvent(new CustomEvent('mercadoShouldUpdate'));
      
      alert(`✅ ${jugadorAVender.nombre} ha sido puesto en venta en el mercado`);
      cerrarModalVenta();
      
    } catch (err) {
      console.error('❌ Error al poner en venta:', err);
      alert('❌ Error al poner en venta: ' + err.message);
    } finally {
      setLoadingVenta(false);
    }
  };

  const confirmarRetirarDelMercado = async () => {
    if (!jugadorARetirar || !equipo?.id) {
      alert('❌ Error: Datos incompletos');
      return;
    }

    setLoadingRetirar(true);
    try {
      console.log(`🔄 Retirando del mercado: ${jugadorARetirar.nombre}`);
      
      await retirarJugadorDelMercado(jugadorARetirar.id); 

      console.log('✅ Jugador retirado del mercado correctamente');
      
      window.dispatchEvent(new CustomEvent('mercadoShouldUpdate'));
      
      alert(`✅ ${jugadorARetirar.nombre} ha sido retirado del mercado`);
      cerrarModalRetirar();
      
    } catch (err) {
      console.error('❌ Error al retirar del mercado:', err);
      alert('❌ Error al retirar del mercado: ' + err.message);
    } finally {
      setLoadingRetirar(false);
    }
  };

  const handleVenderJugador = (jugador) => {
    // Verificar si el jugador está en el campo (no en el banquillo)
    if (!jugador.en_banquillo) {
      alert('❌ Para vender un jugador, debe estar en el banquillo. Por favor, colócalo en el banquillo primero.');
      return;
    }

    if (!puedeVenderJugador(jugador)) {
      const mensajesError = {
        'POR': 'No puedes vender a tu único portero. Necesitas al menos 1 portero en el equipo.',
        'DEF': 'No puedes vender este defensa. Necesitas al menos 2 defensas en el equipo.',
        'DEL': 'No puedes vender este delantero. Necesitas al menos 2 delanteros en el equipo.'
      };
      alert(mensajesError[jugador.posicion]);
      return;
    }
    abrirModalVenta(jugador);
  };

  // Helpers
  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;
  const calcularPuntosTotales = () => jugadores?.reduce((sum, j) => sum + j.puntos_totales, 0) || 0;
  const totalJugadores = jugadores?.length || 0;
  const maxJugadores = 13;

  // Función para formatear la posición de manera elegante
  const formatearPosicion = (posicion) => {
    if (posicion === null || posicion === undefined) {
      return 'Sin datos';
    }
    
    if (posicion === 1) return '1º 🥇';
    if (posicion === 2) return '2º 🥈'; 
    if (posicion === 3) return '3º 🥉';
    
    return `${posicion}º`;
  };

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
            onClick={cargarEquipo}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!equipo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>No hay equipo disponible</p>
      </div>
    );
  }

  if (!alineacionCargada || loadingAlineacion) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl">Cargando alineación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        {/* Contador de jugadores */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow border-2 border-gray-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Plantilla del Equipo</h3>
              <p className="text-sm text-gray-600">
                {totalJugadores}/{maxJugadores} jugadores
              </p>
            </div>
            <div className="flex gap-2">
              {modoCambio ? (
                <button
                  onClick={cancelarModoCambio}
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                >
                  ✕ Cancelar Cambio
                </button>
              ) : (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  totalJugadores >= maxJugadores 
                    ? 'bg-red-100 text-red-800' 
                    : totalJugadores >= 10 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {totalJugadores >= maxJugadores ? 'Plantilla completa' : 
                   totalJugadores >= 10 ? 'Casi completa' : 'Disponible para fichajes'}
                </div>
              )}
            </div>
          </div>
          
          {/* Información del modo cambio */}
          {modoCambio && jugadorOrigenCambio && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                🔄 <strong>Modo cambio activado:</strong> Has seleccionado <strong>{jugadorOrigenCambio.nombre}</strong>. 
                Ahora selecciona un {jugadorOrigenCambio.posicion === 'POR' ? 'portero' : 
                jugadorOrigenCambio.posicion === 'DEF' ? 'defensa' : 'delantero'} para intercambiarlo.
              </p>
            </div>
          )}
          
          {jugadorSeleccionado && !modoCambio && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                💡 <strong>{jugadorSeleccionado.nombre}</strong> seleccionado. Elige una opción del menú.
              </p>
            </div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Presupuesto</div>
            <div className="text-2xl font-bold text-blue-600">{formatValue(equipo.presupuesto)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Puntos Totales</div>
            <div className="text-2xl font-bold text-green-600">{calcularPuntosTotales()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Trophy size={16} />
              Posición Liga
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {loadingPosicion ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : (
                formatearPosicion(posicionLiga)
              )}
            </div>
            {!loadingPosicion && (!equipo.liga_id || !posicionLiga) && (
              <div className="text-xs text-gray-500 mt-1">
                {!equipo.liga_id ? 'Sin liga asignada' : 'Posición no disponible'}
              </div>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
          <Users size={28} />
          {equipo.nombre}
        </h2>

        {/* Campo de fútbol */}
        <FieldView
          portero_titular={alineacion.portero_titular}
          defensas_titulares={alineacion.defensas_titulares}
          delanteros_titulares={alineacion.delanteros_titulares}
          banquillo={alineacion.banquillo}
          onPlayerClick={handleClicJugador}
          onSellPlayer={handleVenderJugador}
          getPlayerState={getEstadoJugador}
          modoCambio={modoCambio}
        />

        {/* Modal de opciones cuando un jugador está seleccionado */}
        {mostrarModalOpciones && jugadorSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 modal-content">
              <h3 className="text-xl font-bold mb-4">Opciones para {jugadorSeleccionado.nombre}</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold">{jugadorSeleccionado.nombre}</p>
                <p className="text-sm text-gray-600">
                  {jugadorSeleccionado.posicion === 'POR' ? 'Portero' : 
                   jugadorSeleccionado.posicion === 'DEF' ? 'Defensa' : 'Delantero'}
                </p>
                <p className="text-sm">Valor: {formatValue(jugadorSeleccionado.valor)}</p>
                <p className="text-sm">Puntos: {jugadorSeleccionado.puntos_totales}</p>
                <p className={`text-sm ${jugadorSeleccionado.en_banquillo ? 'text-blue-600' : 'text-green-600'}`}>
                  {jugadorSeleccionado.en_banquillo ? '🪑 En banquillo' : '⚽ Titular'}
                </p>
                {jugadorSeleccionado.en_venta && (
                  <p className="text-sm text-orange-600 font-semibold">
                    💰 Actualmente en venta
                  </p>
                )}
              </div>

              <div className="flex gap-2 flex-col">
                {/* JUGADOR EN VENTA - Solo mostrar opción de retirar */}
                {jugadorSeleccionado.en_venta ? (
                  <button
                    onClick={() => abrirModalRetirar(jugadorSeleccionado)}
                    className="bg-yellow-600 text-white py-3 px-4 rounded text-sm hover:bg-yellow-700 flex items-center justify-center gap-2"
                  >
                    <span>↩️</span>
                    Retirar del mercado
                  </button>
                ) : (
                  /* JUGADOR NO EN VENTA - Mostrar opciones normales */
                  <>
                    <button
                      onClick={() => iniciarModoCambio(jugadorSeleccionado)}
                      className="bg-blue-600 text-white py-3 px-4 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Cambiar
                    </button>
                    <button
                      onClick={() => handleVenderJugador(jugadorSeleccionado)}
                      className="bg-red-600 text-white py-3 px-4 rounded text-sm hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                      <span>💰</span>
                      Poner en el mercado
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => {
                    setJugadorSeleccionado(null);
                    setMostrarModalOpciones(false);
                  }}
                  className="bg-gray-600 text-white py-3 px-4 rounded text-sm hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <span>✕</span>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de venta en mercado */}
        {mostrarModalVenta && jugadorAVender && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 modal-content">
              <h3 className="text-xl font-bold mb-4">Poner en el Mercado</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold">{jugadorAVender.nombre}</p>
                <p className="text-sm text-gray-600">
                  {jugadorAVender.posicion === 'POR' ? 'Portero' : 
                   jugadorAVender.posicion === 'DEF' ? 'Defensa' : 'Delantero'}
                </p>
                <p className="text-sm">Valor: {formatValue(jugadorAVender.valor)}</p>
                <p className="text-sm">Puntos: {jugadorAVender.puntos_totales}</p>
                <p className="text-sm text-blue-600">
                  {jugadorAVender.en_banquillo ? '🪑 En banquillo' : '⚽ Titular'}
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  ¿Estás seguro de que quieres poner a <strong>{jugadorAVender.nombre}</strong> en el mercado?
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  📢 El jugador aparecerá en el mercado para que otros equipos puedan pujar por él.
                  Podrás retirarlo del mercado en cualquier momento.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirmarPonerEnVenta}
                  disabled={loadingVenta}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center gap-2"
                >
                  {loadingVenta ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <span>✅</span>
                      Confirmar
                    </>
                  )}
                </button>
                <button
                  onClick={cerrarModalVenta}
                  disabled={loadingVenta}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de retirar del mercado */}
        {mostrarModalRetirar && jugadorARetirar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4 modal-content">
              <h3 className="text-xl font-bold mb-4">Retirar del Mercado</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold">{jugadorARetirar.nombre}</p>
                <p className="text-sm text-gray-600">
                  {jugadorARetirar.posicion === 'POR' ? 'Portero' : 
                   jugadorARetirar.posicion === 'DEF' ? 'Defensa' : 'Delantero'}
                </p>
                <p className="text-sm">Precio actual: {formatValue(jugadorARetirar.precio_venta)}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700">
                  ¿Estás seguro de que quieres retirar a <strong>{jugadorARetirar.nombre}</strong> del mercado?
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  📢 El jugador dejará de estar disponible para otros equipos y volverá a tu plantilla.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirmarRetirarDelMercado}
                  disabled={loadingRetirar}
                  className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 disabled:bg-yellow-400 flex items-center justify-center gap-2"
                >
                  {loadingRetirar ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <span>↩️</span>
                      Retirar del mercado
                    </>
                  )}
                </button>
                <button
                  onClick={cerrarModalRetirar}
                  disabled={loadingRetirar}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardScreen;