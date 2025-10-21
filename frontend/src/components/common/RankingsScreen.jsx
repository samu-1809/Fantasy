// components/screens/RankingsScreen.js
import React, { useState, useEffect } from 'react';
import { Trophy, Users, TrendingUp, Crown, Medal, Star, Target, Calendar, X } from 'lucide-react';
import { getClasificacion, getPlantillaEquipo, getPuntuacionesJugador, crearOfertaDirecta} from '../../services/api';
import FieldSection from '../dashboard/components/FieldSection';
import MiniGrafico from '../market/components/MiniGrafico';

const RankingsScreen = ({ datosUsuario }) => {
  const [clasificacion, setClasificacion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [mostrarAlineacion, setMostrarAlineacion] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [alineacion, setAlineacion] = useState(null);
  const [loadingAlineacion, setLoadingAlineacion] = useState(false);
  
  // Estados para el modal de jugador
  const [mostrarModalJugador, setMostrarModalJugador] = useState(false);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [puntuacionesJugador, setPuntuacionesJugador] = useState([]);
  const [loadingPuntuaciones, setLoadingPuntuaciones] = useState(false);
  
  const [mostrarOferta, setMostrarOferta] = useState(false);
  const [montoOferta, setMontoOferta] = useState('');
  const [enviandoOferta, setEnviandoOferta] = useState(false);

  // Obtener ID del equipo del usuario
  const miEquipoId = datosUsuario?.equipo?.id;

  useEffect(() => {
    cargarClasificacion();
  }, [datosUsuario]);

  const cargarClasificacion = async () => {
    if (!datosUsuario?.ligaActual?.id) {
      setError('No se pudo cargar la información de la liga');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getClasificacion(datosUsuario.ligaActual.id);
      setClasificacion(data);
    } catch (err) {
      console.error('❌ Error cargando clasificación:', err);
      setError('Error al cargar la clasificación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar si un equipo es el del usuario
  const esMiEquipo = (equipo) => {
    const equipoId = equipo.id || equipo.equipo_id;
    return miEquipoId && equipoId && miEquipoId === equipoId;
  };

  const handleTeamClick = async (equipo) => {
    // No permitir clic en el equipo propio
    if (esMiEquipo(equipo)) {
      return;
    }

    const equipoId = equipo.id || equipo.equipo_id;
    
    if (!equipoId) {
      console.error('❌ No se pudo determinar el ID del equipo:', equipo);
      alert('No se pudo cargar la información del equipo');
      return;
    }

    try {
      setLoadingAlineacion(true);
      setEquipoSeleccionado(equipo);
      
      console.log(`🔍 Cargando alineación del equipo ID: ${equipoId}`);
      const data = await getPlantillaEquipo(equipoId);
      console.log('✅ Alineación cargada:', data);
      
      if (!data || !data.alineacion) {
        throw new Error('No se pudo cargar la alineación del equipo');
      }
      
      setAlineacion(data.alineacion);
      setMostrarAlineacion(true);
      
    } catch (err) {
      console.error('❌ Error cargando alineación:', err);
      
      let mensajeError = 'Error al cargar la alineación del equipo';
      
      if (err.message.includes('404')) {
        mensajeError = 'No se encontró la alineación del equipo';
      } else if (err.message.includes('403')) {
        mensajeError = 'No tienes permisos para ver esta alineación';
      } else if (err.message.includes('Network Error')) {
        mensajeError = 'Error de conexión. Verifica tu internet';
      } else {
        mensajeError = err.message || mensajeError;
      }
      
      alert(mensajeError);
      setMostrarAlineacion(false);
      setEquipoSeleccionado(null);
    } finally {
      setLoadingAlineacion(false);
    }
  };

  // 🆕 Función para obtener jugadores del banquillo por posición (para FieldSection)
  const getJugadoresBanquilloPorPosicion = (posicion) => {
    if (!alineacion?.banquillo || !Array.isArray(alineacion.banquillo)) return [];
    
    return alineacion.banquillo.filter(jugador => 
      jugador && jugador.posicion === posicion && jugador.en_banquillo === true
    );
  };

  // 🆕 Función dummy para getPlayerState (solo lectura)
  const getPlayerState = () => 'normal';

  // Función mejorada para manejar clic en jugador
  const handlePlayerClick = async (jugador) => {
    if (!jugador) return;
    
    try {
      setJugadorSeleccionado(jugador);
      setLoadingPuntuaciones(true);
      
      console.log(`🔍 Cargando puntuaciones del jugador: ${jugador.id}`);
      const puntuaciones = await getPuntuacionesJugador(jugador.id);
      
      // Formatear puntuaciones para el MiniGrafico
      const puntuacionesFormateadas = puntuaciones.map((p, index) => ({
        jornada_numero: p.jornada || index + 1,
        puntos: p.puntos || 0
      }));
      
      setPuntuacionesJugador(puntuacionesFormateadas);
      setMostrarModalJugador(true);
      
    } catch (err) {
      console.error('❌ Error cargando puntuaciones:', err);
      // Mostrar modal con array vacío si hay error
      setPuntuacionesJugador([]);
      setMostrarModalJugador(true);
    } finally {
      setLoadingPuntuaciones(false);
    }
  };

  // 🆕 Funciones dummy para FieldSection (solo lectura)
  const handlePonerEnVenta = () => {
    // No hacer nada en modo solo lectura
    console.log('🛑 Modo solo lectura - venta deshabilitada');
  };

  const handleQuitarDelMercado = () => {
    // No hacer nada en modo solo lectura
    console.log('🛑 Modo solo lectura - quitar del mercado deshabilitado');
  };

  const handleMoverJugadorAlineacion = () => {
    // No hacer nada en modo solo lectura
    console.log('🛑 Modo solo lectura - mover jugador deshabilitado');
  };

  // Función para hacer oferta desde el modal
  const handleHacerOfertaDesdeModal = () => {
    setMostrarModalJugador(false);
    setMostrarOferta(true);
  };

  // Función para cerrar modal de jugador
  const cerrarModalJugador = () => {
    setMostrarModalJugador(false);
    setJugadorSeleccionado(null);
    setPuntuacionesJugador([]);
  };

  const handleHacerOferta = async () => {
    if (!jugadorSeleccionado || !montoOferta) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    const monto = parseInt(montoOferta);
    if (isNaN(monto) || monto <= 0) {
      alert('Por favor ingresa un precio válido');
      return;
    }

    if (monto > (datosUsuario?.equipo?.presupuesto || 0)) {
      alert('❌ No tienes suficiente presupuesto para esta oferta');
      return;
    }

    try {
      setEnviandoOferta(true);
      
      await crearOfertaDirecta(jugadorSeleccionado.id, monto);
      
      alert(`✅ Oferta de €${formatNumber(monto)} enviada por ${jugadorSeleccionado.nombre}`);
      setMostrarOferta(false);
      setMontoOferta('');
      setJugadorSeleccionado(null);
      
    } catch (err) {
      console.error('❌ Error enviando oferta:', err);
      alert('❌ Error al enviar la oferta: ' + err.message);
    } finally {
      setEnviandoOferta(false);
    }
  };

  const cerrarAlineacion = () => {
    setMostrarAlineacion(false);
    setEquipoSeleccionado(null);
    setAlineacion(null);
  };

  const cerrarOferta = () => {
    setMostrarOferta(false);
    setMontoOferta('');
  };

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;
  
  const formatNumber = (number) => {
    if (!number && number !== 0) return '0';
    const num = parseInt(number) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getPosicionIcono = (posicion) => {
    switch(posicion) {
      case 1: return <Crown className="text-yellow-500" size={20} />;
      case 2: return <Medal className="text-gray-400" size={20} />;
      case 3: return <Medal className="text-orange-600" size={20} />;
      case 4: case 5: case 6: return <Star className="text-blue-500" size={16} />;
      default: return <TrendingUp className="text-gray-400" size={16} />;
    }
  };

  const getPosicionColor = (posicion) => {
    switch(posicion) {
      case 1: return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-l-4 border-yellow-500';
      case 2: return 'bg-gradient-to-r from-gray-100 to-gray-50 border-l-4 border-gray-400';
      case 3: return 'bg-gradient-to-r from-orange-100 to-orange-50 border-l-4 border-orange-500';
      case 4: case 5: case 6: return 'bg-gradient-to-r from-blue-50 to-white border-l-4 border-blue-400';
      default: return 'bg-white border-l-4 border-gray-300';
    }
  };

  // Función para obtener clases CSS condicionales
  const getClasesFilaEquipo = (equipo) => {
    const baseClasses = `p-4 transition-all duration-200 ${getPosicionColor(equipo.posicion || index + 1)}`;
    
    if (esMiEquipo(equipo)) {
      return `${baseClasses} opacity-70 cursor-not-allowed`;
    }
    
    return `${baseClasses} hover:shadow-md hover:scale-[1.02] cursor-pointer`;
  };

  // 🆕 Calcular contadores para FieldSection
  const calcularTitularesCount = () => {
    if (!alineacion) return 0;
    return (
      (alineacion.portero_titular ? 1 : 0) +
      (alineacion.defensas_titulares?.length || 0) +
      (alineacion.delanteros_titulares?.length || 0)
    );
  };

  const calcularTotalCount = () => {
    if (!alineacion) return 0;
    return (
      (alineacion.portero_titular ? 1 : 0) +
      (alineacion.defensas_titulares?.length || 0) +
      (alineacion.delanteros_titulares?.length || 0) +
      (alineacion.banquillo?.length || 0)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Cargando clasificación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-4">
          <div className="text-red-500 text-center mb-4">
            <Trophy size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-bold text-center text-gray-800 mb-2">Error</h3>
          <p className="text-gray-600 text-center">{error}</p>
          <button 
            onClick={cargarClasificacion}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-lg">
            <Trophy className="text-yellow-500" size={32} />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Clasificación
            </h1>
          </div>
          <p className="text-gray-600 mt-2">Temporada 2024 - Liga {datosUsuario?.ligaActual?.nombre}</p>
        </div>

        {clasificacion.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Users className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay datos disponibles</h3>
            <p className="text-gray-500">La clasificación aparecerá cuando comience la temporada.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Tabla Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="grid grid-cols-12 gap-4 font-semibold text-sm uppercase tracking-wider">
                <div className="col-span-1 text-center">Pos</div>
                <div className="col-span-5">Equipo</div>
                <div className="col-span-3">Manager</div>
                <div className="col-span-2 text-center">Puntos</div>
              </div>
            </div>

            {/* Lista de Equipos */}
            <div className="divide-y divide-gray-100">
              {clasificacion.map((equipo, index) => (
                <div 
                  key={equipo.id || equipo.equipo_id || index}
                  className={getClasesFilaEquipo(equipo)}
                  onClick={() => handleTeamClick(equipo)}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Posición */}
                    <div className="col-span-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getPosicionIcono(equipo.posicion || index + 1)}
                        <span className="font-bold text-lg">
                          {equipo.posicion || index + 1}
                        </span>
                      </div>
                    </div>

                    {/* Equipo */}
                    <div className="col-span-5">
                      <div className="flex items-center gap-3 group">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          esMiEquipo(equipo) 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                            : 'bg-gradient-to-br from-blue-500 to-purple-600'
                        }`}>
                          {equipo.nombre?.charAt(0) || 'E'}
                        </div>
                        <div className="text-left">
                          <div className={`font-semibold ${
                            esMiEquipo(equipo) 
                              ? 'text-green-700' 
                              : 'text-gray-800 group-hover:text-blue-600 transition-colors'
                          }`}>
                            {equipo.nombre}
                            {esMiEquipo(equipo) && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Tu equipo
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {equipo.puntos_totales || 0} pts totales
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Manager */}
                    <div className="col-span-3">
                      <div className={`font-medium ${
                        esMiEquipo(equipo) ? 'text-green-600' : 'text-gray-700'
                      }`}>
                        {equipo.usuario || equipo.usuario_username}
                        {esMiEquipo(equipo) && ' (Tú)'}
                      </div>
                    </div>

                    {/* Puntos */}
                    <div className="col-span-2 text-center">
                      <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                        esMiEquipo(equipo) 
                          ? 'bg-green-100' 
                          : 'bg-gray-100'
                      }`}>
                        <TrendingUp size={14} className={
                          esMiEquipo(equipo) ? 'text-green-500' : 'text-green-500'
                        } />
                        <span className={`font-bold ${
                          esMiEquipo(equipo) ? 'text-green-800' : 'text-gray-800'
                        }`}>
                          {equipo.puntos_totales || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de Alineación */}
        {mostrarAlineacion && equipoSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden transform transition-all duration-300 scale-95 hover:scale-100">
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                      {equipoSeleccionado.nombre?.charAt(0) || 'E'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{equipoSeleccionado.nombre}</h2>
                      <p className="text-blue-100">
                        Manager: {equipoSeleccionado.usuario || equipoSeleccionado.usuario_username}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={cerrarAlineacion}
                    className="text-white hover:text-blue-200 text-2xl transition-colors bg-white/20 rounded-full p-2"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Contenido del Modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
                {loadingAlineacion ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando alineación de {equipoSeleccionado.nombre}...</p>
                  </div>
                ) : alineacion ? (
                  <div className="space-y-6">
                    {/* Campo de Fútbol */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                        Alineación del Equipo
                      </h3>
                      
                      {/* 🆕 CAMBIO PRINCIPAL: FieldSection unificado reemplaza FieldView */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200">
                        <FieldSection
                          titularesCount={calcularTitularesCount()}
                          totalCount={calcularTotalCount()}
                          onRefresh={() => {}} // No hay refresco en modo lectura
                          // Props específicas del campo
                          portero_titular={alineacion.portero_titular}
                          defensas_titulares={alineacion.defensas_titulares || []}
                          delanteros_titulares={alineacion.delanteros_titulares || []}
                          banquillo={alineacion.banquillo || []}
                          onPlayerClick={handlePlayerClick}
                          onSellPlayer={handlePonerEnVenta} // Dummy function
                          onRemoveFromMarket={handleQuitarDelMercado} // Dummy function
                          getPlayerState={getPlayerState}
                          modoCambio={false} // Siempre false en modo lectura
                          onMoverJugadorAlineacion={handleMoverJugadorAlineacion} // Dummy function
                          getJugadoresBanquilloPorPosicion={getJugadoresBanquilloPorPosicion}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="mx-auto text-gray-400 mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No se pudo cargar la alineación</h3>
                    <p className="text-gray-500">Inténtalo de nuevo más tarde.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE JUGADOR CON GRÁFICO */}
        {mostrarModalJugador && jugadorSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"> {/* 🆕 Modal más ancho */}
              {/* Header del Modal */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">{jugadorSeleccionado.nombre}</h3>
                    <p className="text-blue-100 mt-2 text-lg">
                      {jugadorSeleccionado.posicion_display || jugadorSeleccionado.posicion} • 
                      {jugadorSeleccionado.equipo_real_nombre ? ` ${jugadorSeleccionado.equipo_real_nombre}` : ' Libre'}
                    </p>
                  </div>
                  <button
                    onClick={cerrarModalJugador}
                    className="text-white hover:text-blue-200 text-2xl transition-colors bg-white/20 rounded-full p-2"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-3 text-base">
                  <span className="bg-white/20 px-3 py-1 rounded">
                    Valor: <strong>€{formatNumber(jugadorSeleccionado.valor || 0)}</strong>
                  </span>
                  <span className="bg-white/20 px-3 py-1 rounded">
                    Puntos: <strong>{jugadorSeleccionado.puntos_totales || 0}</strong>
                  </span>
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

              {/* Botones de Acción */}
              <div className="p-6 space-y-3">
                <button
                  onClick={handleHacerOfertaDesdeModal}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Target size={20} />
                  Hacer Oferta por este Jugador
                </button>
                <button
                  onClick={cerrarModalJugador}
                  className="w-full bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Oferta */}
        {mostrarOferta && jugadorSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
                <h2 className="text-2xl font-bold">Hacer Oferta</h2>
                <p className="text-green-100">
                  Por {jugadorSeleccionado.nombre}
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {/* Información del jugador */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="font-semibold text-gray-800">{jugadorSeleccionado.nombre}</p>
                    <p className="text-sm text-gray-600">
                      {jugadorSeleccionado.posicion_display || jugadorSeleccionado.posicion} • 
                      {jugadorSeleccionado.equipo_real_nombre ? ` ${jugadorSeleccionado.equipo_real_nombre}` : ' Libre'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <div className="text-xs text-gray-500">Valor</div>
                        <div className="font-bold text-green-600 text-lg">
                          {formatValue(jugadorSeleccionado.valor || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Puntos</div>
                        <div className="font-bold text-purple-600 text-lg">
                          {jugadorSeleccionado.puntos_totales || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input de monto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto de la oferta (€)
                    </label>
                    <input
                      type="text"
                      value={montoOferta ? formatNumber(montoOferta) : ''}
                      onChange={(e) => {
                        // Permitir solo números y eliminar puntos para el cálculo
                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                        setMontoOferta(numericValue);
                      }}
                      className="w-full border border-gray-300 rounded-lg p-3 text-lg font-semibold text-right"
                      placeholder="0"
                    />
                    <p className="text-sm text-gray-500 mt-1 text-right">
                      Valor actual: €{formatNumber(jugadorSeleccionado.valor || 0)}
                    </p>
                  </div>

                  {/* Información de presupuesto */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">Tu presupuesto:</span>
                      <span className="font-semibold text-blue-800">
                        €{formatNumber(datosUsuario?.equipo?.presupuesto || 0)}
                      </span>
                    </div>
                    {montoOferta && !isNaN(montoOferta) && montoOferta > 0 && (
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-blue-700">Presupuesto restante:</span>
                        <span className={`font-semibold ${
                          (datosUsuario?.equipo?.presupuesto || 0) - parseInt(montoOferta) < 0 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          €{formatNumber((datosUsuario?.equipo?.presupuesto || 0) - parseInt(montoOferta))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3">
                    <button
                      onClick={cerrarOferta}
                      className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleHacerOferta}
                      disabled={enviandoOferta || !montoOferta || montoOferta === '0'}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {enviandoOferta ? 'Enviando...' : 'Enviar Oferta'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingsScreen;