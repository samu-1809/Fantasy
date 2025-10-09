import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, DollarSign, Users, Clock } from 'lucide-react';
import { useMarket } from '../../hooks/useMarket';
import { useAuth } from '../../context/AuthContext';

// Hook personalizado para manejar refresh
const useRefresh = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return {
    refreshKey,
    refresh
  };
};

const MarketScreen = ({ datosUsuario, onFichajeExitoso }) => {
  const { user } = useAuth();
  const equipoId = datosUsuario?.equipo?.id;
  const { refreshKey, refresh } = useRefresh();
  
  const [pestañaActiva, setPestañaActiva] = useState('mercado');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [mostrarModalPuja, setMostrarModalPuja] = useState(false);
  const [montoPuja, setMontoPuja] = useState('');
  const [montoPujaFormateado, setMontoPujaFormateado] = useState('');
  const [loadingPuja, setLoadingPuja] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const { 
    mercado, 
    ofertasRecibidas,
    ofertasRealizadas,
    pujasRealizadas,
    loading, 
    error, 
    filtros, 
    cargarMercado,
    cargarOfertasRecibidas,
    cargarOfertasRealizadas,
    cargarPujasRealizadas,
    realizarPuja,
    retirarPuja,
    actualizarFiltro, 
    limpiarFiltros,
    estaExpirado,
    calcularExpiracion
  } = useMarket(datosUsuario?.ligaActual?.id);

  // Función para formatear números con separadores de miles
  const formatNumber = (number) => {
    if (!number && number !== 0) return '';
    const num = parseInt(number) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Efecto para sincronizar montoPuja y montoPujaFormateado
  useEffect(() => {
    if (montoPuja && !isNaN(montoPuja)) {
      setMontoPujaFormateado(formatNumber(montoPuja));
    }
  }, [montoPuja]);

  // Efecto principal para recargar datos cuando cambia refreshKey
  useEffect(() => {
    console.log('🔄 Refresh key cambiada, recargando datos...');
    
    if (pestañaActiva === 'mercado') {
      cargarMercado();
    } else if (pestañaActiva === 'ofertas-recibidas' && equipoId) {
      cargarOfertasRecibidas(equipoId);
    } else if (pestañaActiva === 'ofertas-realizadas' && equipoId) {
      cargarOfertasRealizadas(equipoId);
      cargarPujasRealizadas(equipoId);
    }

    // Actualizar timestamp de última actualización
    setUltimaActualizacion(new Date().toLocaleTimeString());
  }, [refreshKey, pestañaActiva, equipoId, cargarMercado, cargarOfertasRecibidas, cargarOfertasRealizadas, cargarPujasRealizadas]);

  // Efecto para recargar cuando cambia la pestaña
  useEffect(() => {
    refresh();
  }, [pestañaActiva]);

  // Escuchar eventos personalizados para refresh
  useEffect(() => {
    const handleMercadoUpdate = () => {
      console.log('📢 Evento de actualización recibido, refrescando mercado...');
      refresh();
    };

    // Escuchar eventos personalizados
    window.addEventListener('mercadoShouldUpdate', handleMercadoUpdate);
    window.addEventListener('jugadorVendido', handleMercadoUpdate);
    window.addEventListener('fichajeExitoso', handleMercadoUpdate);

    return () => {
      window.removeEventListener('mercadoShouldUpdate', handleMercadoUpdate);
      window.removeEventListener('jugadorVendido', handleMercadoUpdate);
      window.removeEventListener('fichajeExitoso', handleMercadoUpdate);
    };
  }, []);

  const handleRetirarPuja = async (pujaId) => {
    if (!window.confirm('¿Estás seguro de que quieres retirar esta puja? Se te devolverá el dinero.')) {
      return;
    }

    try {
      await retirarPuja(pujaId);
      alert('✅ Puja retirada correctamente. El dinero ha sido devuelto a tu presupuesto.');
      
      // Recargar los datos
      refresh();
      if (equipoId) {
        cargarPujasRealizadas(equipoId);
      }
      if (onFichajeExitoso) {
        onFichajeExitoso();
      }
    } catch (err) {
      alert('❌ Error al retirar la puja: ' + err.message);
    }
  };

  const handlePujar = (jugador) => {
    setJugadorSeleccionado(jugador);
    const pujaMinima = Math.floor((jugador.puja_actual || jugador.valor) * 1.1);
    setMontoPuja(pujaMinima.toString());
    setMostrarModalPuja(true);
  };

  const handleChangeMontoPuja = (e) => {
    const valor = e.target.value;
    const soloNumeros = valor.replace(/[^\d]/g, '');
    setMontoPuja(soloNumeros);
  };

  const confirmarPuja = async () => {
    if (!equipoId || !jugadorSeleccionado || !montoPuja) return;

    const monto = parseInt(montoPuja);
    const pujaMinima = Math.floor((jugadorSeleccionado.puja_actual || jugadorSeleccionado.valor) * 1.1);

    if (monto < pujaMinima) {
      alert(`❌ La puja debe ser al menos €${formatNumber(pujaMinima)} (10% más que la puja actual)`);
      return;
    }

    if (monto > (datosUsuario?.equipo?.presupuesto || 0)) {
      alert('❌ No tienes suficiente presupuesto para esta puja');
      return;
    }

    setLoadingPuja(true);
    try {
      await realizarPuja(equipoId, jugadorSeleccionado.id, monto);
      alert(`✅ Puja de €${formatNumber(monto)} realizada por ${jugadorSeleccionado.nombre}`);
      setMostrarModalPuja(false);
      setJugadorSeleccionado(null);
      setMontoPuja('');
      setMontoPujaFormateado('');
      
      // Recarga después de puja exitosa
      refresh();
      if (onFichajeExitoso) {
        onFichajeExitoso();
      }
    } catch (err) {
      alert('❌ Error al realizar la puja: ' + err.message);
    } finally {
      setLoadingPuja(false);
    }
  };

  const cerrarModalPuja = () => {
    setMostrarModalPuja(false);
    setJugadorSeleccionado(null);
    setMontoPuja('');
    setMontoPujaFormateado('');
  };

  const handleActualizar = () => {
    console.log('🔄 Actualizando mercado...');
    refresh();
  };

  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;
  const formatNormalValue = (value) => `€${formatNumber(value)}`;

  const totalJugadores = datosUsuario?.equipo?.jugadores?.length || 0;
  const maxJugadores = 13;
  const presupuesto = datosUsuario?.equipo?.presupuesto || 0;

  // Renderizar pestaña de Mercado
  const renderMercado = () => {
    if (mercado.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          <p className="text-lg mb-2">No hay jugadores disponibles en el mercado</p>
          <p className="text-sm mb-4">
            {filtros.nombre || filtros.posicion
              ? 'Prueba a limpiar los filtros para ver más jugadores'
              : 'Vuelve más tarde para ver nuevas subastas'
            }
          </p>
          <button 
            onClick={handleActualizar}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {mercado.map((player) => {
          const expirado = estaExpirado(player.fecha_mercado);
          const esVentaUsuario = player.tipo === 'venta_usuario';
          const pujaMinima = Math.floor((player.puja_actual || player.valor) * 1.1);
          const puedePujar = !expirado && totalJugadores < maxJugadores && presupuesto >= pujaMinima;

          return (
            <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded border-2 border-gray-300 hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <div className="font-medium">{player.nombre}</div>
                <div className="text-sm text-gray-600">
                  {player.posicion === 'POR' ? 'Portero' : 
                   player.posicion === 'DEF' ? 'Defensa' : 'Delantero'} • 
                  {player.equipo_real_nombre} • Valor: {formatValue(player.valor)} • {player.puntos_totales} pts
                </div>
                
                <div className="text-xs mt-1 space-y-1">
                  <div className={`font-medium ${
                    esVentaUsuario ? 'text-purple-600' : 'text-green-600'
                  }`}>
                    {esVentaUsuario ? (
                      <>🏷️ En venta por ti</>
                    ) : player.usuario_vendedor ? (
                      <>👤 Venta por: {player.usuario_vendedor}</>
                    ) : (
                      <>🏟️ Agente libre • Renueva en: {player.tiempo_restante_minutos || calcularExpiracion(player.fecha_mercado)}</>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => handlePujar(player)}
                disabled={!puedePujar}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${
                  !puedePujar
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700 hover:scale-105'
                }`}
                title={
                  expirado ? 'Subasta expirada' :
                  totalJugadores >= maxJugadores ? 'Plantilla completa' :
                  presupuesto < pujaMinima ? 'Presupuesto insuficiente' :
                  'Pujar por jugador'
                }
              >
                <DollarSign size={16} />
                {expirado ? 'Expirado' : 
                 totalJugadores >= maxJugadores ? 'Plantilla llena' :
                 presupuesto < pujaMinima ? 'Sin fondos' :
                 'Pujar'}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar pestaña de Ofertas Recibidas
  const renderOfertasRecibidas = () => (
    <div className="space-y-3">
      {ofertasRecibidas.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Users className="mx-auto mb-4" size={48} />
          <p className="text-lg mb-2">No has recibido ofertas</p>
          <p className="text-sm">Otros equipos pueden hacer ofertas por tus jugadores en cualquier momento</p>
        </div>
      ) : (
        ofertasRecibidas.map((oferta) => (
          <div key={oferta.id} className="p-4 bg-white rounded border-2 border-blue-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-lg">{oferta.jugador_nombre}</div>
                <div className="text-sm text-gray-600">
                  {oferta.jugador_posicion} • {oferta.jugador_equipo}
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-600 font-bold text-xl">{formatNormalValue(oferta.monto)}</div>
                <div className="text-sm text-gray-500">de {oferta.equipo_ofertante}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-500">
                <Clock size={14} className="inline mr-1" />
                {new Date(oferta.fecha_oferta).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                  Aceptar
                </button>
                <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Renderizar pestaña de Ofertas Realizadas
  const renderOfertasRealizadas = () => {
    const tieneOfertas = ofertasRealizadas.length > 0;
    const tienePujas = pujasRealizadas.length > 0;

    if (!tieneOfertas && !tienePujas) {
      return (
        <div className="text-center text-gray-500 py-8">
          <DollarSign className="mx-auto mb-4" size={48} />
          <p className="text-lg mb-2">No has realizado ofertas ni pujas</p>
          <p className="text-sm">Realiza ofertas o pujas por jugadores en el mercado</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* SECCIÓN DE OFERTAS */}
        {tieneOfertas && (
          <div>
            <h4 className="font-semibold text-lg mb-3 text-blue-600">📨 Ofertas Enviadas</h4>
            <div className="space-y-3">
              {ofertasRealizadas.map((oferta) => (
                <div key={`oferta-${oferta.id}`} className={`p-4 bg-white rounded border-2 ${
                  oferta.estado === 'aceptada' ? 'border-green-200' :
                  oferta.estado === 'rechazada' ? 'border-red-200' : 'border-yellow-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-lg">{oferta.jugador_nombre}</div>
                      <div className="text-sm text-gray-600">
                        {oferta.jugador_posicion} • {oferta.jugador_equipo}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-xl ${
                        oferta.estado === 'aceptada' ? 'text-green-600' :
                        oferta.estado === 'rechazada' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {formatNormalValue(oferta.monto)}
                      </div>
                      <div className={`text-sm font-medium ${
                        oferta.estado === 'aceptada' ? 'text-green-600' :
                        oferta.estado === 'rechazada' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {oferta.estado === 'pendiente' ? '🟡 Pendiente' :
                         oferta.estado === 'aceptada' ? '✅ Aceptada' : '❌ Rechazada'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <Clock size={14} className="inline mr-1" />
                    {new Date(oferta.fecha_oferta).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN DE PUJAS */}
        {tienePujas && (
          <div>
            <h4 className="font-semibold text-lg mb-3 text-yellow-600">💰 Pujas Activas</h4>
            <div className="space-y-3">
              {pujasRealizadas.map((puja) => (
                <div key={`puja-${puja.id}`} className="p-4 bg-white rounded border-2 border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-lg">{puja.jugador_nombre}</div>
                      <div className="text-sm text-gray-600">
                        {puja.jugador_posicion} • {puja.jugador_equipo_real_nombre}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {puja.es_ganadora ? '🎉 Puja ganadora' : '⏳ Subasta en curso'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-600 font-bold text-xl">
                        {formatNormalValue(puja.monto)}
                      </div>
                      <div className="text-sm text-gray-500">Tu puja actual</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-500">
                      <Clock size={14} className="inline mr-1" />
                      {new Date(puja.fecha_puja).toLocaleDateString()}
                    </div>
                    {!puja.es_ganadora && (
                      <button 
                        onClick={() => handleRetirarPuja(puja.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
                      >
                        <span>❌</span>
                        Retirar Puja
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
          {/* Header y Pestañas */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-xl font-bold">Sistema de Subastas</h3>
              <p className="text-sm text-gray-600 mt-1">
                {pestañaActiva === 'mercado' && `Jugadores disponibles para pujar (${mercado.length})`}
                {pestañaActiva === 'ofertas-recibidas' && `Ofertas recibidas por tus jugadores (${ofertasRecibidas.length})`}
                {pestañaActiva === 'ofertas-realizadas' && `Tus ofertas y pujas realizadas (${ofertasRealizadas.length + pujasRealizadas.length})`}
              </p>
              {ultimaActualizacion && (
                <p className="text-xs text-gray-400 mt-1">
                  Última actualización: {ultimaActualizacion}
                </p>
              )}
            </div>
            
            {/* Pestañas */}
            <div className="flex space-x-1 bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setPestañaActiva('mercado')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  pestañaActiva === 'mercado'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🏪 Mercado
              </button>
              <button
                onClick={() => setPestañaActiva('ofertas-recibidas')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  pestañaActiva === 'ofertas-recibidas'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📥 Ofertas Recibidas
              </button>
              <button
                onClick={() => setPestañaActiva('ofertas-realizadas')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  pestañaActiva === 'ofertas-realizadas'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📤 Ofertas & Pujas
              </button>
            </div>
          </div>

          {/* Filtros (solo en mercado) */}
          {pestañaActiva === 'mercado' && (
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={filtros.nombre}
                  onChange={(e) => actualizarFiltro('nombre', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  placeholder="Buscar jugador..."
                />
              </div>
              
              <select
                value={filtros.posicion}
                onChange={(e) => actualizarFiltro('posicion', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Todas las posiciones</option>
                <option value="POR">Portero</option>
                <option value="DEF">Defensa</option>
                <option value="DEL">Delantero</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={limpiarFiltros}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                >
                  <span>🗑️</span>
                  Limpiar
                </button>
                <button
                  onClick={handleActualizar}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
              <button 
                onClick={handleActualizar}
                className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Cargando...</p>
            </div>
          ) : (
            <>
              {pestañaActiva === 'mercado' && renderMercado()}
              {pestañaActiva === 'ofertas-recibidas' && renderOfertasRecibidas()}
              {pestañaActiva === 'ofertas-realizadas' && renderOfertasRealizadas()}
            </>
          )}
        </div>

        {/* Información del equipo */}
        {datosUsuario?.equipo && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-blue-800">Presupuesto disponible</h4>
                  <p className="text-blue-600 text-xl font-bold">{formatNormalValue(presupuesto)}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-600">Jugadores</div>
                  <div className={`text-lg font-bold ${
                    totalJugadores >= maxJugadores ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {totalJugadores}/{maxJugadores}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-green-800">Tu equipo</h4>
                  <p className="text-green-600 font-medium">{datosUsuario.equipo.nombre}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-600">Manager</div>
                  <div className="text-lg font-bold text-green-600">{user?.username}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Puja (se mantiene igual) */}
        {mostrarModalPuja && jugadorSeleccionado && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Realizar Puja</h3>
              
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-semibold">{jugadorSeleccionado.nombre}</p>
                <p className="text-sm text-gray-600">
                  {jugadorSeleccionado.posicion === 'POR' ? 'Portero' : 
                   jugadorSeleccionado.posicion === 'DEF' ? 'Defensa' : 'Delantero'} • 
                  {jugadorSeleccionado.equipo_real_nombre}
                </p>
                <p className="text-sm">Valor: {formatValue(jugadorSeleccionado.valor)}</p>
                <p className="text-sm">Puntos: {jugadorSeleccionado.puntos_totales}</p>
                {jugadorSeleccionado.puja_actual && (
                  <p className="text-sm font-semibold text-blue-600">
                    Puja actual: {formatNormalValue(jugadorSeleccionado.puja_actual)} por {jugadorSeleccionado.pujador_actual}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tu oferta (€):
                </label>
                <input
                  type="text"
                  value={montoPujaFormateado}
                  onChange={handleChangeMontoPuja}
                  className="w-full p-2 border border-gray-300 rounded text-right font-mono"
                  placeholder={formatNumber(Math.floor((jugadorSeleccionado.puja_actual || jugadorSeleccionado.valor) * 1.1))}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  Puja mínima: {formatNumber(Math.floor((jugadorSeleccionado.puja_actual || jugadorSeleccionado.valor) * 1.1))} (10% más que la puja actual)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirmarPuja}
                  disabled={loadingPuja}
                  className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 flex items-center justify-center gap-2"
                >
                  <DollarSign size={16} />
                  {loadingPuja ? 'Realizando puja...' : 'Confirmar Puja'}
                </button>
                <button
                  onClick={cerrarModalPuja}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
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

export default MarketScreen;