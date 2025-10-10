import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, DollarSign, Users, Clock, Edit2 } from 'lucide-react';
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
  const nombreEquipoUsuario = datosUsuario?.equipo?.nombre;
  const { refreshKey, refresh } = useRefresh();
  
  const [pestañaActiva, setPestañaActiva] = useState('mercado');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [mostrarModalPuja, setMostrarModalPuja] = useState(false);
  const [montoPuja, setMontoPuja] = useState('');
  const [montoPujaFormateado, setMontoPujaFormateado] = useState('');
  const [loadingPuja, setLoadingPuja] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  
  const [modoEdicionPuja, setModoEdicionPuja] = useState(false);
  const [pujaEditando, setPujaEditando] = useState(null);

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

  // Debug inicial
  console.log('🔍 MarketScreen - Estado inicial:', {
    equipoId,
    tieneCargarOfertasRecibidas: typeof cargarOfertasRecibidas === 'function',
    pestañaActiva,
    ofertasRecibidasCount: ofertasRecibidas.length
  });

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
    } else {
      setMontoPujaFormateado('');
    }
  }, [montoPuja]);

  // Efecto principal para recargar datos cuando cambia refreshKey
  useEffect(() => {
    console.log('🔄 Refresh key cambiada, recargando datos...');
    
    if (pestañaActiva === 'mercado') {
      cargarMercado();
    } else if (pestañaActiva === 'ofertas-recibidas' && equipoId) {
      console.log('📥 Cargando ofertas recibidas...');
      cargarOfertasRecibidas(equipoId);
    } else if (pestañaActiva === 'ofertas-realizadas' && equipoId) {
      cargarOfertasRealizadas(equipoId);
      cargarPujasRealizadas(equipoId);
    }

    setUltimaActualizacion(new Date().toLocaleTimeString());
  }, [refreshKey, pestañaActiva, equipoId]);

  // Efecto específico para cargar ofertas recibidas cuando se monta el componente o cambia la pestaña
  useEffect(() => {
    if (pestañaActiva === 'ofertas-recibidas' && equipoId) {
      console.log('📥 Efecto específico: Cargando ofertas recibidas');
      cargarOfertasRecibidas(equipoId);
    }
  }, [pestañaActiva, equipoId, cargarOfertasRecibidas]);

  // Efecto para recargar cuando cambia la pestaña
  useEffect(() => {
    refresh();
  }, [pestañaActiva]);

  // ✅ AÑADIR: Efecto específico para recargar pujas después de una puja exitosa
  useEffect(() => {
    if (pestañaActiva === 'mercado' && equipoId) {
      // Recargar pujas realizadas cada vez que estemos en el mercado
      cargarPujasRealizadas(equipoId);
    }
  }, [pestañaActiva, equipoId, cargarPujasRealizadas]);

  // Escuchar eventos personalizados para refresh
  useEffect(() => {
    const handleMercadoUpdate = () => {
      console.log('📢 Evento de actualización recibido, refrescando mercado...');
      refresh();
    };

    window.addEventListener('mercadoShouldUpdate', handleMercadoUpdate);
    window.addEventListener('jugadorVendido', handleMercadoUpdate);
    window.addEventListener('fichajeExitoso', handleMercadoUpdate);

    return () => {
      window.removeEventListener('mercadoShouldUpdate', handleMercadoUpdate);
      window.removeEventListener('jugadorVendido', handleMercadoUpdate);
      window.removeEventListener('fichajeExitoso', handleMercadoUpdate);
    };
  }, []);

  // ✅ EFECTO CORREGIDO: Solo retirar pujas cuando el jugador ya no esté disponible
  useEffect(() => {
    const retirarPujasDeJugadoresInexistentes = async () => {
      if (pujasRealizadas.length === 0 || !equipoId) return;

      const pujasParaRetirar = pujasRealizadas.filter(puja => {
        // Usar la información del jugador que viene en la puja
        const jugadorNoDisponible = !puja.jugador_en_venta || puja.jugador_expirado;
        
        console.log(`🔍 Verificando puja ${puja.id} - ${puja.jugador_nombre}:`, {
          jugador_en_venta: puja.jugador_en_venta,
          jugador_expirado: puja.jugador_expirado,
          debeRetirar: jugadorNoDisponible && !puja.es_ganadora
        });
        
        return jugadorNoDisponible && !puja.es_ganadora;
      });

      if (pujasParaRetirar.length > 0) {
        console.log(`🔄 Retirando ${pujasParaRetirar.length} pujas automáticamente...`);
        
        for (const puja of pujasParaRetirar) {
          try {
            await retirarPuja(puja.id);
            console.log(`✅ Puja retirada: ${puja.jugador_nombre}`);
          } catch (err) {
            console.error(`❌ Error retirando puja ${puja.id}: ${err.message}`);
          }
        }

        // Recargar datos después de retirar pujas
        setTimeout(() => {
          cargarPujasRealizadas(equipoId);
          cargarMercado();
        }, 1000);
      }
    };

    retirarPujasDeJugadoresInexistentes();
  }, [pujasRealizadas, equipoId, retirarPuja, cargarPujasRealizadas, cargarMercado]);

  const handleRetirarPuja = async (pujaId) => {
    if (!window.confirm('¿Estás seguro de que quieres retirar esta puja? Se te devolverá el dinero.')) {
      return;
    }

    try {
      await retirarPuja(pujaId);
      alert('✅ Puja retirada correctamente. El dinero ha sido devuelto a tu presupuesto.');
      
      // ✅ SOLUCIÓN: Recargar solo las pujas realizadas sin cambiar de pestaña
      if (equipoId) {
        await cargarPujasRealizadas(equipoId);
      }
      
      if (onFichajeExitoso) {
        onFichajeExitoso();
      }
    } catch (err) {
      alert('❌ Error al retirar la puja: ' + err.message);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Verificar si ya se pujó por un jugador
  const yaPujadoPorJugador = (jugadorId) => {
    return pujasRealizadas.some(puja => 
      puja.jugador === jugadorId && // ✅ CORREGIDO: usar 'jugador' en lugar de 'jugador_id'
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    );
  };

  // ✅ FUNCIÓN CORREGIDA: Obtener puja existente por jugador
  const getPujaExistente = (jugadorId) => {
    return pujasRealizadas.find(puja => 
      puja.jugador === jugadorId && // ✅ CORREGIDO: usar 'jugador' en lugar de 'jugador_id'
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    );
  };

  const handleEditarPuja = (puja) => {
    // ✅ VERIFICAR SI EL JUGADOR SIGUE DISPONIBLE ANTES DE EDITAR
    if (!puja.jugador_en_venta || puja.jugador_expirado) {
      alert('❌ No puedes editar esta puja porque el jugador ya no está disponible');
      return;
    }

    setPujaEditando(puja);
    setModoEdicionPuja(true);
    setMontoPuja((puja.monto + 1).toString()); // Sugerir al menos 1 más
    setMostrarModalPuja(true);
  };

  const handlePujar = (jugador) => {
    // ✅ VERIFICAR SI YA SE PUJÓ POR ESTE JUGADOR - CORREGIDO
    if (yaPujadoPorJugador(jugador.id)) {
      const pujaExistente = getPujaExistente(jugador.id);
      if (pujaExistente) {
        handleEditarPuja(pujaExistente);
        return;
      }
    }

    setJugadorSeleccionado(jugador);
    setModoEdicionPuja(false);
    setPujaEditando(null);
    setMontoPuja('');
    setMostrarModalPuja(true);
  };

  const handleChangeMontoPuja = (e) => {
    const valor = e.target.value;
    if (valor === '') {
      setMontoPuja('');
      return;
    }
    const soloNumeros = valor.replace(/[^\d]/g, '');
    setMontoPuja(soloNumeros);
  };

  const confirmarPuja = async () => {
    if (!equipoId || !montoPuja) return;

    const monto = parseInt(montoPuja);
    
    if (monto > (datosUsuario?.equipo?.presupuesto || 0)) {
      alert('❌ No tienes suficiente presupuesto para esta puja');
      return;
    }

    let montoMinimo = 0;
    
    if (modoEdicionPuja && pujaEditando) {
      // ✅ SOLUCIÓN: Solo debe ser mayor que el valor del jugador
      montoMinimo = (pujaEditando.valor_jugador || pujaEditando.monto || 0) + 1;
      
      if (monto <= montoMinimo) {
        alert(`❌ La puja debe ser mayor que el valor del jugador (€${formatNumber(montoMinimo)})`);
        return;
      }

      // Verificar si el jugador sigue disponible
      if (!pujaEditando.jugador_en_venta || pujaEditando.jugador_expirado) {
        alert('❌ Este jugador ya no está disponible para pujar');
        cerrarModalPuja();
        return;
      }
    } else if (jugadorSeleccionado) {
      // Para nueva puja: debe ser mayor que el valor del jugador
      montoMinimo = (jugadorSeleccionado.valor || 0) + 1;
      if (monto <= montoMinimo) {
        alert(`❌ La puja debe ser mayor que el valor del jugador (€${formatNumber(montoMinimo)})`);
        return;
      }

      // Verificar si el jugador sigue disponible
      if (!jugadorSeleccionado.en_venta || jugadorSeleccionado.expirado) {
        alert('❌ Este jugador ya no está disponible para pujar');
        cerrarModalPuja();
        return;
      }
    }

    setLoadingPuja(true);
    try {
      if (modoEdicionPuja && pujaEditando) {
        console.log('🔄 Editando puja existente...', {
          pujaId: pujaEditando.id,
          jugadorId: pujaEditando.jugador,
          montoActual: pujaEditando.monto,
          nuevoMonto: monto
        });
        
        await retirarPuja(pujaEditando.id);
        await new Promise(resolve => setTimeout(resolve, 500));
        await realizarPuja(equipoId, pujaEditando.jugador, monto);
        
        alert(`✅ Puja actualizada a €${formatNumber(monto)} por ${pujaEditando.jugador_nombre}`);
      } else {
        // Nueva puja
        await realizarPuja(equipoId, jugadorSeleccionado.id, monto);
        alert(`✅ Puja de €${formatNumber(monto)} realizada por ${jugadorSeleccionado.nombre}`);
      }
      
      setMostrarModalPuja(false);
      setJugadorSeleccionado(null);
      setMontoPuja('');
      setMontoPujaFormateado('');
      setModoEdicionPuja(false);
      setPujaEditando(null);
      
      // ✅ Recargar datos para actualizar el estado inmediatamente
      refresh();
      if (onFichajeExitoso) {
        onFichajeExitoso();
      }
    } catch (err) {
      console.error('❌ Error en confirmarPuja:', err);
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
    setModoEdicionPuja(false);
    setPujaEditando(null);
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

  const esJugadorEnVentaPorMi = (jugador) => {
    const esMiJugador = jugador.tipo === 'venta_usuario' && jugador.vendedor === nombreEquipoUsuario;
    return esMiJugador;
  };

  // ✅ FUNCIÓN CORREGIDA: Verificar si se puede pujar por el jugador
  const puedePujarPorJugador = (jugador) => {
    const esMiJugador = esJugadorEnVentaPorMi(jugador);
    
    if (esMiJugador) return false;
    if (!jugador.en_venta || jugador.expirado) return false;
    
    // VERIFICAR SI YA SE PUJÓ POR ESTE JUGADOR
    if (yaPujadoPorJugador(jugador.id)) {
      return false;
    }
    
    const pujasActivas = pujasRealizadas.filter(puja => 
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    ).length;
    
    const capacidadDisponible = maxJugadores - totalJugadores;
    const pujasPermitidas = Math.max(0, capacidadDisponible);
    
    if (pujasActivas >= pujasPermitidas) return false;
    if (presupuesto <= (jugador.valor || 0)) return false;
    
    return true;
  };

  // ✅ FUNCIÓN CORREGIDA: Obtener texto del botón de puja
  const getTextoBotonPuja = (jugador) => {
    if (esJugadorEnVentaPorMi(jugador)) return 'Tu jugador';
    if (!jugador.en_venta || jugador.expirado) return 'Expirado';
    
    if (yaPujadoPorJugador(jugador.id)) return 'Ya pujado';
    
    const pujasActivas = pujasRealizadas.filter(puja => 
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    ).length;
    const capacidadDisponible = maxJugadores - totalJugadores;
    const pujasPermitidas = Math.max(0, capacidadDisponible);
    
    if (pujasActivas >= pujasPermitidas) return 'Límite pujas';
    if (presupuesto <= (jugador.valor || 0)) return 'Sin fondos';
    
    return 'Pujar';
  };

  // ✅ FUNCIÓN CORREGIDA: Obtener título del botón de puja
  const getTituloBotonPuja = (jugador) => {
    if (esJugadorEnVentaPorMi(jugador)) return 'No puedes pujar por tu propio jugador';
    if (!jugador.en_venta || jugador.expirado) return 'Subasta expirada o jugador no disponible';
    
    if (yaPujadoPorJugador(jugador.id)) {
      return 'Ya tienes una puja activa por este jugador. Puedes editarla en "Ofertas & Pujas"';
    }
    
    const pujasActivas = pujasRealizadas.filter(puja => 
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    ).length;
    const capacidadDisponible = maxJugadores - totalJugadores;
    const pujasPermitidas = Math.max(0, capacidadDisponible);
    
    if (pujasActivas >= pujasPermitidas) {
      return `Has alcanzado el límite de pujas activas (${pujasActivas}/${pujasPermitidas}). Gana o retira pujas para hacer nuevas ofertas.`;
    }
    
    if (presupuesto <= (jugador.valor || 0)) return 'Presupuesto insuficiente';
    
    return 'Pujar por jugador';
  };

  // Renderizar pestaña de Mercado
  const renderMercado = () => {
    console.log('🔍 Verificando pujas realizadas:', pujasRealizadas.map(p => ({
      id: p.id,
      jugador: p.jugador,
      nombre: p.jugador_nombre,
      en_venta: p.jugador_en_venta,
      expirado: p.jugador_expirado
    })));

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
          const puedePujar = puedePujarPorJugador(player);
          const esMiJugador = esJugadorEnVentaPorMi(player);
          const yaPujado = yaPujadoPorJugador(player.id);
          const horasEnMercado = player.horas_en_mercado || 0;
          const recibiraOfertaMercado = player.recibira_oferta_mercado;

          console.log(`🎯 Jugador ${player.nombre}:`, {
            horasEnMercado,
            recibiraOfertaMercado,
            pujaActual: player.puja_actual,
            pujadorActual: player.pujador_actual
          });

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
                    esMiJugador ? 'text-purple-600' : 'text-green-600'
                  }`}>
                    {esMiJugador ? (
                      <>🏷️ En venta por ti</>
                    ) : player.vendedor && player.tipo === 'venta_usuario' ? (
                      <>👤 Venta por: {player.vendedor}</>
                    ) : (
                      <>🏟️ Agente libre • Renueva en: {player.tiempo_restante || calcularExpiracion(player.fecha_mercado)}</>
                    )}
                  </div>

                  {/* ✅ INFORMACIÓN DE OFERTAS DEL MERCADO */}
                  {player.tipo === 'venta_usuario' && (
                    <div className="text-xs space-y-1">
                      {player.puja_actual && (
                        <div className="text-blue-600">
                          💰 Puja actual: {formatNormalValue(player.puja_actual)} por {player.pujador_actual}
                        </div>
                      )}
                      {horasEnMercado >= 24 && (
                        <div className="text-green-600 font-semibold">
                          ✅ Recibirá oferta del mercado
                        </div>
                      )}
                      {horasEnMercado < 24 && (
                        <div className="text-gray-500">
                          ⏳ En mercado: {horasEnMercado}h/24h
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => handlePujar(player)}
                disabled={!puedePujar}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-all ${
                  !puedePujar
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : yaPujado
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700 hover:scale-105'
                }`}
                title={getTituloBotonPuja(player)}
              >
                <DollarSign size={16} />
                {getTextoBotonPuja(player)}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOfertasRecibidas = () => {
    console.log('🔍 ===== OFERTAS RECIBIDAS - INICIO =====');
    console.log('📋 Datos del usuario:', {
      equipoId,
      nombreEquipo: datosUsuario?.equipo?.nombre,
      usuario: user?.username,
      userId: user?.id,
      ligaId: datosUsuario?.ligaActual?.id
    });
    
    console.log('📦 Estado de ofertasRecibidas:', {
      array: ofertasRecibidas,
      length: ofertasRecibidas.length,
      primerElemento: ofertasRecibidas[0]
    });

    // Verificar si el equipoId es válido
    if (!equipoId) {
      console.error('❌ ERROR: equipoId es null o undefined');
      return (
        <div className="text-center text-red-500 py-8">
          <p className="text-lg mb-2">❌ Error: No se pudo identificar tu equipo</p>
          <p className="text-sm">equipoId: {equipoId}</p>
          <p className="text-sm">Usuario: {user?.username}</p>
          <p className="text-sm">Nombre equipo: {datosUsuario?.equipo?.nombre}</p>
          <button 
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            🔄 Reintentar
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Panel de información y debug */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <h4 className="font-bold text-blue-800 mb-2">Información de Ofertas Recibidas</h4>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div><strong>Equipo ID:</strong> {equipoId}</div>
            <div><strong>Nombre:</strong> {datosUsuario?.equipo?.nombre}</div>
            <div><strong>Usuario:</strong> {user?.username}</div>
            <div><strong>Ofertas:</strong> {ofertasRecibidas.length}</div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                console.log('🔄 Ejecutando recarga manual de ofertas...');
                try {
                  // ✅ CORREGIDO: Usar la función del hook useMarket
                  await cargarOfertasRecibidas(equipoId);
                  console.log('✅ Recarga manual completada');
                } catch (error) {
                  console.error('❌ Error en recarga manual:', error);
                }
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              🔄 Recargar Ofertas
            </button>
            
            <button 
              onClick={() => {
                console.log('🐛 Debug completo del estado:', {
                  equipoId,
                  datosUsuario,
                  user,
                  ofertasRecibidas,
                  pestañaActiva,
                  refreshKey
                });
              }}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              📊 Debug Estado
            </button>
            
            <button 
              onClick={refresh}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
            >
              ♻️ Refresh General
            </button>
          </div>
        </div>

        {ofertasRecibidas.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Users className="mx-auto mb-4" size={48} />
            <p className="text-lg mb-2">No has recibido ofertas</p>
            <p className="text-sm mb-4">
              Equipo: <strong>{datosUsuario?.equipo?.nombre}</strong> (ID: {equipoId})
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded max-w-md mx-auto">
              <p className="text-sm text-yellow-800 mb-3">
                <strong>Posibles causas:</strong>
              </p>
              <ul className="text-sm text-yellow-700 text-left space-y-1">
                <li>• No tienes jugadores en venta</li>
                <li>• Nadie ha pujado por tus jugadores</li>
                <li>• Las ofertas pendientes ya fueron respondidas</li>
                <li>• Error de conexión con el servidor</li>
                <li>• El equipo ID no coincide</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-green-50 border border-green-200 p-3 rounded mb-4">
              <p className="text-green-700 font-semibold">
                ✅ Tienes {ofertasRecibidas.length} oferta(s) pendiente(s)
              </p>
            </div>
            
            {ofertasRecibidas.map((oferta) => (
              <div key={oferta.id} className="p-4 bg-white rounded border-2 border-blue-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-lg">{oferta.jugador_nombre}</div>
                    <div className="text-sm text-gray-600">
                      {oferta.jugador_posicion} • {oferta.jugador_equipo}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Ofertante: {oferta.equipo_ofertante_nombre}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-bold text-xl">{formatNormalValue(oferta.monto)}</div>
                    <div className="text-sm text-gray-500">
                      {oferta.equipo_ofertante_nombre === 'Mercado' ? '🤖 Oferta automática' : '👤 Oferta de usuario'}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <div className="text-gray-500">
                    <Clock size={14} className="inline mr-1" />
                    {new Date(oferta.fecha_oferta).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Aceptar
                    </button>
                    <button 
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Renderizar pestaña de Ofertas Realizadas
  const renderOfertasRealizadas = () => {
    console.log('🔍 Ofertas realizadas:', ofertasRealizadas);
    console.log('🔍 Pujas realizadas:', pujasRealizadas);

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
                        oferta.estado === 'pendiente' ? 'text-green-600' :
                        oferta.estado === 'aceptada' ? 'text-green-600' : 'text-red-600'
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
              {pujasRealizadas.map((puja) => {
                // ✅ CORREGIDO: Usar las propiedades del jugador que vienen en la puja
                const expirada = puja.jugador_expirado || !puja.jugador_en_venta;
                const jugadorEnMercado = mercado.some(j => j.id === puja.jugador);
                
                return (
                  <div key={`puja-${puja.id}`} className={`p-4 bg-white rounded border-2 ${
                    expirada ? 'border-gray-200' : 'border-yellow-200'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-lg">{puja.jugador_nombre}</div>
                        <div className="text-sm text-gray-600">
                          {puja.jugador_posicion} • {puja.jugador_equipo_real_nombre}
                        </div>
                        <div className={`text-xs mt-1 ${
                          puja.es_ganadora ? 'text-green-600' : 
                          expirada ? 'text-gray-500' : 'text-yellow-600'
                        }`}>
                          {puja.es_ganadora ? '🎉 Puja ganadora' : 
                           expirada ? '⏰ Subasta expirada' : '⏳ Subasta en curso'}
                        </div>
                        {!jugadorEnMercado && !puja.es_ganadora && !expirada && (
                          <div className="text-xs text-red-600 mt-1">
                            ⚠️ Este jugador ya no está en el mercado
                          </div>
                        )}
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
                      {!puja.es_ganadora && !expirada && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditarPuja(puja)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                          >
                            <Edit2 size={14} />
                            Editar
                          </button>
                          <button 
                            onClick={() => handleRetirarPuja(puja.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
                          >
                            <span>❌</span>
                            Retirar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <h5 className="font-semibold text-blue-800 mb-1">Información sobre pujas</h5>
              <p className="text-sm text-blue-700">
                <strong>Pujas activas:</strong> {pujasRealizadas.filter(p => !p.es_ganadora && p.jugador_en_venta && !p.jugador_expirado).length}<br/>
                <strong>Pujas permitidas:</strong> {Math.max(0, maxJugadores - totalJugadores)}<br/>
                <strong>Espacio en plantilla:</strong> {maxJugadores - totalJugadores} jugadores
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        {datosUsuario?.equipo && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-sm text-gray-600">Presupuesto disponible</div>
              <div className="text-2xl font-bold text-blue-600">{formatNormalValue(presupuesto)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-sm text-gray-600">Jugadores</div>
              <div className="text-2xl font-bold text-green-600">
                {totalJugadores}/{maxJugadores}
                {totalJugadores >= maxJugadores && (
                  <span className="text-sm text-red-600 ml-2">(Plantilla completa)</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
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
      </div>

      {mostrarModalPuja && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {modoEdicionPuja ? 'Editar Puja' : 'Realizar Puja'}
            </h3>
            
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-semibold">
                {modoEdicionPuja ? pujaEditando?.jugador_nombre : jugadorSeleccionado?.nombre}
              </p>
              <p className="text-sm text-gray-600">
                {modoEdicionPuja ? 
                  `${pujaEditando?.jugador_posicion} • ${pujaEditando?.jugador_equipo_real_nombre}` :
                  `${jugadorSeleccionado?.posicion === 'POR' ? 'Portero' : 
                    jugadorSeleccionado?.posicion === 'DEF' ? 'Defensa' : 'Delantero'} • 
                   ${jugadorSeleccionado?.equipo_real_nombre}`
                }
              </p>
              <p className="text-sm">
                Valor: {formatValue(modoEdicionPuja ? 
                  (pujaEditando?.valor_jugador || pujaEditando?.monto) : 
                  jugadorSeleccionado?.valor)}
              </p>
              <p className="text-sm">
                Puntos: {modoEdicionPuja ? 
                  pujaEditando?.puntos_jugador : 
                  jugadorSeleccionado?.puntos_totales}
              </p>
              
              {/* ✅ NUEVO: Mostrar estado del jugador */}
              {modoEdicionPuja && (
                <div className={`text-xs font-semibold mt-1 ${
                  pujaEditando?.jugador_en_venta && !pujaEditando?.jugador_expirado 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {pujaEditando?.jugador_en_venta && !pujaEditando?.jugador_expirado 
                    ? '✅ Jugador disponible' 
                    : '❌ Jugador no disponible'}
                </div>
              )}
              
              {modoEdicionPuja && (
                <p className="text-sm font-semibold text-blue-600">
                  Puja actual: {formatNormalValue(pujaEditando?.monto)}
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
                placeholder={`Mínimo: ${formatNumber(
                  modoEdicionPuja ? 
                  Math.max(
                    (pujaEditando?.valor_jugador || 0) + 1,
                    (pujaEditando?.monto || 0) + 1
                  ) : 
                  (jugadorSeleccionado?.valor || 0) + 1
                )}`}
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {modoEdicionPuja ? 
                  `Puja mínima: ${formatNumber(
                    Math.max(
                      (pujaEditando?.valor_jugador || 0) + 1,
                      (pujaEditando?.monto || 0) + 1
                    )
                  )} (más que el valor del jugador y tu puja actual)` :
                  `Puja mínima: ${formatNumber((jugadorSeleccionado?.valor || 0) + 1)} (más que el valor del jugador)`
                }
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmarPuja}
                disabled={loadingPuja || !montoPuja || (
                  modoEdicionPuja && 
                  pujaEditando && 
                  (!pujaEditando.jugador_en_venta || pujaEditando.jugador_expirado)
                )}
                className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 disabled:bg-yellow-400 flex items-center justify-center gap-2"
                title={
                  modoEdicionPuja && 
                  pujaEditando && 
                  (!pujaEditando.jugador_en_venta || pujaEditando.jugador_expirado)
                    ? 'Este jugador ya no está disponible'
                    : undefined
                }
              >
                <DollarSign size={16} />
                {loadingPuja ? 'Procesando...' : (modoEdicionPuja ? 'Confirmar Edición' : 'Confirmar Puja')}
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
  );
};

export default MarketScreen;