import React, { useState, useEffect, useRef } from 'react';
import { useTeam } from '../../hooks/useTeam';
import FieldView from './FieldView';

// Componentes modulares
import DashboardHeader from './components/DashboardHeader';
import StatsPanel from './components/StatsPanel';
import ExchangeModeBanner from './components/ExchangeModeBanner';
import PlayerOptionsModal from './components/PlayerOptionsModal';
import SellPlayerModal from './components/SellPlayerModal';
import SaleConfirmationAnimation from './components/SaleConfirmationAnimation';
import EmptyTeamMessage from './components/EmptyTeamMessage';
import FieldSection from './components/FieldSection';
import LoadingState from './components/LoadingState';
import IncompleteLineupWarning from './components/IncompleteLineupWarning';

const DashboardScreen = ({ datosUsuario, onRefresh }) => {
  const equipoId = datosUsuario?.equipo?.id;
  
  // Usar el hook useTeam
  const {
    equipo,
    jugadores,
    ligaActual,
    alineacion,
    loading,
    loadingPosicion,
    error,
    posicionLiga,
    ultimaActualizacion,
    realizarCambio,
    venderJugador,
    retirarJugadorDelMercado,
    forzarActualizacion,
    calcularPuntosTotales,
    encontrarJugadoresIntercambiables
  } = useTeam(equipoId);

  // Estados de UI
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [mostrarModalOpciones, setMostrarModalOpciones] = useState(false);
  const [modoCambio, setModoCambio] = useState(false);
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [precioVenta, setPrecioVenta] = useState('');
  const [jugadoresIntercambiables, setJugadoresIntercambiables] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarAnimacionVenta, setMostrarAnimacionVenta] = useState(false);
  const [jugadorVendido, setJugadorVendido] = useState(null);

  // 🆕 Referencia para detectar clics fuera del campo
  const fieldRef = useRef(null);

  // 🆕 Efecto para manejar clics fuera del campo (cancelar modo cambio)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modoCambio && fieldRef.current && !fieldRef.current.contains(event.target)) {
        cancelarModoCambio();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modoCambio]);

  // Efecto para escuchar eventos de actualización
  useEffect(() => {
    const handleMercadoUpdate = async () => {
      console.log('🔄 Dashboard: Recibido evento de actualización del mercado');
      await forzarActualizacion();
      if (onRefresh) onRefresh();
    };

    const handleOfertaAceptadaConExito = async (event) => {
      console.log('🎯 Dashboard: Recibido evento ofertaAceptadaConExito', event.detail);
      
      if (event.detail.jugadorVendido) {
        setJugadorVendido(event.detail.jugadorVendido);
        setMostrarAnimacionVenta(true);
        
        setTimeout(() => {
          setMostrarAnimacionVenta(false);
          setJugadorVendido(null);
        }, 3000);
      }
      
      setTimeout(async () => {
        await forzarActualizacion();
        if (onRefresh) onRefresh();
      }, 800);
    };

    const handleJugadorPuestoEnVenta = async () => {
      console.log('🔄 Dashboard: Recibido evento jugadorPuestoEnVenta');
      await forzarActualizacion();
      if (onRefresh) onRefresh();
    };

    const handleDashboardUpdate = async () => {
      console.log('🔄 Dashboard: Recibido evento dashboardShouldUpdate');
      await forzarActualizacion();
      if (onRefresh) onRefresh();
    };

    const handleJugadorQuitadoDelMercado = async () => {
      console.log('🔄 Dashboard: Recibido evento jugadorQuitadoDelMercado');
      await forzarActualizacion();
      if (onRefresh) onRefresh();
    };

    const handleIntercambioExitoso = async () => {
      console.log('🔄 Dashboard: Recibido evento intercambioExitoso');
      await forzarActualizacion();
      if (onRefresh) onRefresh();
    };

    // Escuchar eventos de actualización
    const events = [
      ['mercadoShouldUpdate', handleMercadoUpdate],
      ['jugadorVendido', handleMercadoUpdate],
      ['fichajeExitoso', handleMercadoUpdate],
      ['ofertaAceptada', handleMercadoUpdate],
      ['ofertaRechazada', handleMercadoUpdate],
      ['ofertaAceptadaConExito', handleOfertaAceptadaConExito],
      ['jugadorPuestoEnVenta', handleJugadorPuestoEnVenta],
      ['dashboardShouldUpdate', handleDashboardUpdate],
      ['jugadorQuitadoDelMercado', handleJugadorQuitadoDelMercado],
      ['intercambioExitoso', handleIntercambioExitoso]
    ];

    events.forEach(([event, handler]) => {
      window.addEventListener(event, handler);
    });

    return () => {
      events.forEach(([event, handler]) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [forzarActualizacion, onRefresh]);

  // Handlers
  const handleClicJugador = (jugador) => {
    if (modoCambio) {
      // 🆕 CORRECCIÓN: Permitir cancelar haciendo clic en el mismo jugador
      if (jugador.id === jugadorSeleccionado?.id) {
        cancelarModoCambio();
        return;
      }
      
      if (jugadoresIntercambiables.some(j => j.id === jugador.id)) {
        realizarIntercambio(jugador);
      }
      return;
    }
    
    setJugadorSeleccionado(jugador);
    setMostrarModalOpciones(true);
  };

  const getPlayerState = (jugador) => {
    if (modoCambio && jugador.id === jugadorSeleccionado?.id) {
      return 'origen-cambio';
    }
    
    if (modoCambio) {
      if (jugadoresIntercambiables.some(j => j.id === jugador.id)) {
        return 'apto-cambio';
      } else {
        return 'no-apto-cambio';
      }
    }
    
    return 'normal';
  };

  const activarModoCambio = () => {
    if (!jugadorSeleccionado) return;
    
    console.log('🎯 Activando modo cambio para:', jugadorSeleccionado.nombre);
    console.log('📍 Es titular:', !jugadorSeleccionado.en_banquillo);

    // 🆕 CORRECCIÓN: Usar la nueva función del hook
    const intercambiables = encontrarJugadoresIntercambiables(jugadorSeleccionado);
    
    if (intercambiables.length === 0) {
      alert(`No hay jugadores de la posición ${jugadorSeleccionado.posicion} disponibles para intercambio`);
      return;
    }
    
    setJugadoresIntercambiables(intercambiables);
    setModoCambio(true);
    setMostrarModalOpciones(false);
  };

  const realizarIntercambio = async (jugadorDestino) => {
    if (!jugadorSeleccionado || !equipo) return;

    setCargando(true);
    try {
      console.log('🔄 Realizando intercambio:', {
        origen: jugadorSeleccionado.nombre,
        destino: jugadorDestino.nombre
      });

      await realizarCambio(jugadorSeleccionado.id, jugadorDestino.id);
      
      console.log('✅ Intercambio realizado exitosamente');
      
      window.dispatchEvent(new CustomEvent('dashboardShouldUpdate'));
      window.dispatchEvent(new CustomEvent('mercadoShouldUpdate'));
      window.dispatchEvent(new CustomEvent('intercambioExitoso'));
      
    } catch (error) {
      console.error('❌ Error en intercambio:', error);
      alert('Error al realizar el intercambio: ' + error.message);
    } finally {
      setCargando(false);
      setModoCambio(false);
      setJugadorSeleccionado(null);
      setJugadoresIntercambiables([]);
    }
  };

  const cancelarModoCambio = () => {
    console.log('❌ Cancelando modo cambio');
    setModoCambio(false);
    setJugadorSeleccionado(null);
    setJugadoresIntercambiables([]);
  };

  const handlePonerEnVenta = () => {
    if (!jugadorSeleccionado || !equipo) return;

    const valorActual = jugadorSeleccionado.valor || 0;
    const precioSugerido = Math.floor(valorActual * 1.2);

    setPrecioVenta(precioSugerido.toString());
    setMostrarModalVenta(true);
    setMostrarModalOpciones(false);
  };

  // 🆕 CORREGIDO: Función mejorada para quitar del mercado
  const handleQuitarDelMercado = async () => {
    if (!jugadorSeleccionado || !equipo) return;

    setCargando(true);
    try {
      console.log('🔄 Dashboard: Quitando del mercado:', jugadorSeleccionado.nombre);
      
      // 🆕 Usar la función del hook que ahora maneja mejor los errores
      await retirarJugadorDelMercado(jugadorSeleccionado.id);
      
      console.log('✅ Dashboard: Jugador quitado del mercado exitosamente');
      
      // Disparar eventos de actualización
      window.dispatchEvent(new CustomEvent('dashboardShouldUpdate'));
      window.dispatchEvent(new CustomEvent('mercadoShouldUpdate'));
      
      setMostrarModalOpciones(false);
      
    } catch (error) {
      console.error('❌ Dashboard: Error quitando del mercado:', error);
      alert('❌ Error al quitar del mercado: ' + (error.message || 'Error interno del servidor'));
    } finally {
      setCargando(false);
    }
  };

  const confirmarVenta = async () => {
    if (!jugadorSeleccionado || !precioVenta || !equipo) return;

    setCargando(true);
    try {
      const precio = parseInt(precioVenta);
      if (isNaN(precio) || precio <= 0) {
        alert('Por favor ingresa un precio válido');
        return;
      }

      const valorActual = jugadorSeleccionado.valor || 0;
      const precioMinimo = Math.floor(valorActual * 0.8);
      
      if (precio < precioMinimo) {
        alert(`El precio mínimo permitido es €${formatNumber(precioMinimo)} (80% del valor actual)`);
        return;
      }

      console.log('💰 Confirmando venta:', {
        jugador: jugadorSeleccionado.nombre,
        precio: precio
      });

      await venderJugador(jugadorSeleccionado.id, precio);
      
      console.log('✅ Jugador puesto en venta exitosamente');
      
      window.dispatchEvent(new CustomEvent('jugadorPuestoEnVenta', {
        detail: {
          jugadorId: jugadorSeleccionado.id,
          equipoId: equipo.id,
          precioVenta: precio
        }
      }));
      
      window.dispatchEvent(new CustomEvent('dashboardShouldUpdate'));
      window.dispatchEvent(new CustomEvent('mercadoShouldUpdate'));
      
      setMostrarModalVenta(false);
      setPrecioVenta('');
      
      alert(`✅ ${jugadorSeleccionado.nombre} puesto en venta por €${formatNumber(precio)}`);
      
    } catch (error) {
      console.error('❌ Error poniendo en venta:', error);
      alert('❌ Error al poner en venta: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  const cancelarVenta = () => {
    setMostrarModalVenta(false);
    setPrecioVenta('');
  };

  // Helper functions
  const formatValue = (value) => {
    if (!value) return '€0.0M';
    return `€${(value / 1000000).toFixed(1)}M`;
  };

  const formatNumber = (number) => {
    if (!number && number !== 0) return '0';
    const num = parseInt(number) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Calcular posiciones faltantes
  const calcularPosicionesFaltantes = () => {
    const faltantes = [];
    const porteros = jugadores.filter(j => j.posicion === 'POR' && !j.en_banquillo).length;
    const defensas = jugadores.filter(j => j.posicion === 'DEF' && !j.en_banquillo).length;
    const delanteros = jugadores.filter(j => j.posicion === 'DEL' && !j.en_banquillo).length;

    if (porteros < 1) faltantes.push('POR');
    if (defensas < 2) faltantes.push('DEF');
    if (delanteros < 2) faltantes.push('DEL');

    return faltantes;
  };

  if (loading && !equipo) {
    return <LoadingState tipo="loading" />;
  }

  if (error || !equipo) {
    return (
      <LoadingState 
        tipo="no-team" 
        onRetry={forzarActualizacion}
        onReload={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <SaleConfirmationAnimation 
        mostrarAnimacionVenta={mostrarAnimacionVenta}
        jugadorVendido={jugadorVendido}
      />

      <div className="max-w-7xl mx-auto px-4">
        <DashboardHeader
          equipo={equipo}
          ligaActual={ligaActual}
          ultimaActualizacion={ultimaActualizacion}
          onRefresh={forzarActualizacion}
        />

        {modoCambio && (
          <ExchangeModeBanner
            jugadorSeleccionado={jugadorSeleccionado}
            jugadoresIntercambiables={jugadoresIntercambiables}
            cargando={cargando}
            onCancel={cancelarModoCambio}
          />
        )}

        <div className="space-y-6">
          <StatsPanel
            equipo={equipo}
            puntosTotales={calcularPuntosTotales()}
            posicionLiga={posicionLiga}
            loadingPosicion={loadingPosicion}
            formatValue={formatValue}
          />

          {/* Advertencia de alineación incompleta */}
          <IncompleteLineupWarning posicionesFaltantes={calcularPosicionesFaltantes()} />

          <FieldSection
            titularesCount={jugadores.filter(j => !j.en_banquillo).length}
            totalCount={jugadores.length}
            onRefresh={forzarActualizacion}
          >
            {jugadores.length === 0 ? (
              <EmptyTeamMessage />
            ) : (
              <div 
                ref={fieldRef}
                className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200"
              >
                <FieldView
                  portero_titular={alineacion.portero_titular}
                  defensas_titulares={alineacion.defensas_titulares}
                  delanteros_titulares={alineacion.delanteros_titulares}
                  banquillo={alineacion.banquillo}
                  onPlayerClick={handleClicJugador}
                  onSellPlayer={handlePonerEnVenta}
                  onRemoveFromMarket={handleQuitarDelMercado}
                  getPlayerState={getPlayerState}
                  modoCambio={modoCambio}
                />
              </div>
            )}
          </FieldSection>
        </div>
      </div>

      {mostrarModalOpciones && jugadorSeleccionado && (
        <PlayerOptionsModal
          jugadorSeleccionado={jugadorSeleccionado}
          onClose={() => setMostrarModalOpciones(false)}
          onSell={handlePonerEnVenta}
          onExchange={activarModoCambio}
          onRemoveFromMarket={handleQuitarDelMercado}
          formatValue={formatValue}
          formatNumber={formatNumber}
        />
      )}

      {mostrarModalVenta && jugadorSeleccionado && (
        <SellPlayerModal
          jugadorSeleccionado={jugadorSeleccionado}
          equipo={equipo}
          precioVenta={precioVenta}
          setPrecioVenta={setPrecioVenta}
          onCancel={cancelarVenta}
          onConfirm={confirmarVenta}
          cargando={cargando}
          formatValue={formatValue}
          formatNumber={formatNumber}
        />
      )}
    </div>
  );
};

export default DashboardScreen;