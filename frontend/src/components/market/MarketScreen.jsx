// MarketScreen.jsx
import React, { useState, useEffect } from 'react';
import { useMarket } from '../../hooks/useMarket';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from './hooks/useRefresh';
import MarketHeader from './components/MarketHeader';
import MarketStats from './components/MarketStats';
import MercadoTab from './components/MercadoTab';
import OfertasRecibidasTab from './components/OfertasRecibidasTab';
import OfertasRealizadasTab from './components/OfertasRealizadasTab';
import PujaModal from './components/PujaModal';

const MarketScreen = ({ datosUsuario, onFichajeExitoso }) => {
  const { user } = useAuth();
  const equipoId = React.useMemo(() => {
    if (!datosUsuario) return null;
    
    // Intentar obtener de diferentes formas
    return datosUsuario.equipo?.id || 
           datosUsuario.equipo_id || 
           (datosUsuario.equipo && typeof datosUsuario.equipo === 'object' ? datosUsuario.equipo.id : null);
  }, [datosUsuario]);

  const nombreEquipoUsuario = datosUsuario?.equipo?.nombre || datosUsuario?.equipo?.nombre_equipo;
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
    if (pestañaActiva === 'mercado') {
      cargarMercado();
    } else if (pestañaActiva === 'ofertas-recibidas' && equipoId) {
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
      cargarOfertasRecibidas(equipoId);
    }
  }, [pestañaActiva, equipoId, cargarOfertasRecibidas]);

  // Efecto para recargar cuando cambia la pestaña
  useEffect(() => {
    refresh();
  }, [pestañaActiva]);

  // Efecto específico para recargar pujas después de una puja exitosa
  useEffect(() => {
    if (pestañaActiva === 'mercado' && equipoId) {
      cargarPujasRealizadas(equipoId);
    }
  }, [pestañaActiva, equipoId, cargarPujasRealizadas]);

  // Escuchar eventos personalizados para refresh
  useEffect(() => {
    const handleMercadoUpdate = () => {
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

  // Efecto para retirar pujas de jugadores inexistentes
  useEffect(() => {
    const retirarPujasDeJugadoresInexistentes = async () => {
      if (pujasRealizadas.length === 0 || !equipoId) return;

      const pujasParaRetirar = pujasRealizadas.filter(puja => {
        const jugadorNoDisponible = !puja.jugador_en_venta || puja.jugador_expirado;
        return jugadorNoDisponible && !puja.es_ganadora;
      });

      if (pujasParaRetirar.length > 0) {
        for (const puja of pujasParaRetirar) {
          try {
            await retirarPuja(puja.id);
          } catch (err) {
            console.error(`❌ Error retirando puja ${puja.id}: ${err.message}`);
          }
        }

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

  const yaPujadoPorJugador = (jugadorId) => {
    return pujasRealizadas.some(puja => 
      puja.jugador === jugadorId &&
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    );
  };

  const getPujaExistente = (jugadorId) => {
    return pujasRealizadas.find(puja => 
      puja.jugador === jugadorId &&
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    );
  };

  const handleEditarPuja = (puja) => {
    if (!puja.jugador_en_venta || puja.jugador_expirado) {
      alert('❌ No puedes editar esta puja porque el jugador ya no está disponible');
      return;
    }

    setPujaEditando(puja);
    setModoEdicionPuja(true);
    setMontoPuja((puja.monto + 1).toString());
    setMostrarModalPuja(true);
  };

  const handlePujar = (jugador) => {
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
      montoMinimo = (pujaEditando.valor_jugador || pujaEditando.monto || 0) + 1;
      
      if (monto <= montoMinimo) {
        alert(`❌ La puja debe ser mayor que el valor del jugador (€${formatNumber(montoMinimo)})`);
        return;
      }

      if (!pujaEditando.jugador_en_venta || pujaEditando.jugador_expirado) {
        alert('❌ Este jugador ya no está disponible para pujar');
        cerrarModalPuja();
        return;
      }
    } else if (jugadorSeleccionado) {
      montoMinimo = (jugadorSeleccionado.valor || 0) + 1;
      if (monto <= montoMinimo) {
        alert(`❌ La puja debe ser mayor que el valor del jugador (€${formatNumber(montoMinimo)})`);
        return;
      }

      if (!jugadorSeleccionado.en_venta || jugadorSeleccionado.expirado) {
        alert('❌ Este jugador ya no está disponible para pujar');
        cerrarModalPuja();
        return;
      }
    }

    setLoadingPuja(true);
    try {
      if (modoEdicionPuja && pujaEditando) {
        await retirarPuja(pujaEditando.id);
        await new Promise(resolve => setTimeout(resolve, 500));
        await realizarPuja(equipoId, pujaEditando.jugador, monto);
        
        alert(`✅ Puja actualizada a €${formatNumber(monto)} por ${pujaEditando.jugador_nombre}`);
      } else {
        await realizarPuja(equipoId, jugadorSeleccionado.id, monto);
        alert(`✅ Puja de €${formatNumber(monto)} realizada por ${jugadorSeleccionado.nombre}`);
      }
      
      setMostrarModalPuja(false);
      setJugadorSeleccionado(null);
      setMontoPuja('');
      setMontoPujaFormateado('');
      setModoEdicionPuja(false);
      setPujaEditando(null);
      
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

  const puedePujarPorJugador = (jugador) => {
    const esMiJugador = esJugadorEnVentaPorMi(jugador);
    
    if (esMiJugador) return false;
    if (!jugador.en_venta || jugador.expirado) return false;
    
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        <MarketStats 
          datosUsuario={datosUsuario} 
          formatNormalValue={formatNormalValue} 
        />

        <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-300">
          <MarketHeader
            pestañaActiva={pestañaActiva}
            setPestañaActiva={setPestañaActiva}
            mercado={mercado}
            ofertasRecibidas={ofertasRecibidas}
            ofertasRealizadas={ofertasRealizadas}
            pujasRealizadas={pujasRealizadas}
            ultimaActualizacion={ultimaActualizacion}
          />

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
              {pestañaActiva === 'mercado' && (
                <MercadoTab
                  mercado={mercado}
                  pujasRealizadas={pujasRealizadas}
                  datosUsuario={datosUsuario}
                  filtros={filtros}
                  actualizarFiltro={actualizarFiltro}
                  limpiarFiltros={limpiarFiltros}
                  handlePujar={handlePujar}
                  handleActualizar={handleActualizar}
                  loading={loading}
                  formatValue={formatValue}
                  formatNormalValue={formatNormalValue}
                  calcularExpiracion={calcularExpiracion}
                  puedePujarPorJugador={puedePujarPorJugador}
                  getTextoBotonPuja={getTextoBotonPuja}
                  getTituloBotonPuja={getTituloBotonPuja}
                  esJugadorEnVentaPorMi={esJugadorEnVentaPorMi}
                  yaPujadoPorJugador={yaPujadoPorJugador}
                />
              )}
              {pestañaActiva === 'ofertas-recibidas' && (
                <OfertasRecibidasTab
                  ofertasRecibidas={ofertasRecibidas}
                  equipoId={equipoId}
                  datosUsuario={datosUsuario}
                  user={user}
                  refresh={refresh}
                  cargarOfertasRecibidas={cargarOfertasRecibidas}
                  formatNormalValue={formatNormalValue}
                />
              )}
              {pestañaActiva === 'ofertas-realizadas' && (
                <OfertasRealizadasTab
                  ofertasRealizadas={ofertasRealizadas || []}
                  pujasRealizadas={pujasRealizadas || []}
                  mercado={mercado || []}
                  handleEditarPuja={handleEditarPuja}
                  handleRetirarPuja={handleRetirarPuja}
                  formatNormalValue={formatNormalValue}
                  totalJugadores={totalJugadores}
                  maxJugadores={maxJugadores}
                  equipoId={equipoId}
                />
              )}
            </>
          )}
        </div>
      </div>

      <PujaModal
        mostrarModalPuja={mostrarModalPuja}
        modoEdicionPuja={modoEdicionPuja}
        jugadorSeleccionado={jugadorSeleccionado}
        pujaEditando={pujaEditando}
        montoPuja={montoPuja}
        montoPujaFormateado={montoPujaFormateado}
        loadingPuja={loadingPuja}
        handleChangeMontoPuja={handleChangeMontoPuja}
        confirmarPuja={confirmarPuja}
        cerrarModalPuja={cerrarModalPuja}
        formatValue={formatValue}
        formatNumber={formatNumber}
      />
    </div>
  );
};

export default MarketScreen;