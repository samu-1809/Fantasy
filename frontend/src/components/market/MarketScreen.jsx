import React, { useState, useEffect } from 'react';
import { useMarket } from '../../hooks/useMarket';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from './hooks/useRefresh';
import MarketHeader from './components/MarketHeader';
import MercadoTab from './components/MercadoTab';
import OfertasRecibidasTab from './components/OfertasRecibidasTab';
import OfertasRealizadasTab from './components/OfertasRealizadasTab';
import PujaModal from './components/PujaModal';
import { ShoppingCart, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { retirarOferta, editarPuja, editarOferta } from '../../services/api';

const MarketScreen = ({ datosUsuario, onFichajeExitoso }) => {
  const { user } = useAuth();
  const equipoId = React.useMemo(() => {
    if (!datosUsuario) return null;
    
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

  const formatNumber = (number) => {
    if (!number && number !== 0) return '';
    const num = parseInt(number) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    if (montoPuja && !isNaN(montoPuja)) {
      setMontoPujaFormateado(formatNumber(montoPuja));
    } else {
      setMontoPujaFormateado('');
    }
  }, [montoPuja]);

  useEffect(() => {
    const handleJugadorPuestoEnVenta = () => {
      console.log('🔄 MarketScreen: Recibido evento jugadorPuestoEnVenta');
      refresh();
    };

    window.addEventListener('jugadorPuestoEnVenta', handleJugadorPuestoEnVenta);

    return () => {
      window.removeEventListener('jugadorPuestoEnVenta', handleJugadorPuestoEnVenta);
    };
  }, [refresh]);

  useEffect(() => {
    if (pestañaActiva === 'mercado') {
      cargarMercado();
    } else if (pestañaActiva === 'ofertas-realizadas' && equipoId) {
      cargarOfertasRealizadas(equipoId);
      cargarPujasRealizadas(equipoId);
    }
    if (equipoId) {
      cargarOfertasRecibidas(equipoId);
    }

    setUltimaActualizacion(new Date().toLocaleTimeString());
  }, [refreshKey, pestañaActiva, equipoId]);

  useEffect(() => {
    refresh();
  }, [pestañaActiva]);

  useEffect(() => {
    if (pestañaActiva === 'mercado' && equipoId) {
      cargarPujasRealizadas(equipoId);
    }
  }, [pestañaActiva, equipoId, cargarPujasRealizadas]);

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

  // 🆕 Función para retirar ofertas
  const handleRetirarOferta = async (ofertaId) => {
    if (!window.confirm('¿Estás seguro de que quieres retirar esta oferta? Se te devolverá el dinero.')) {
      return;
    }

    try {
      await retirarOferta(ofertaId);
      alert('✅ Oferta retirada correctamente. El dinero ha sido devuelto a tu presupuesto.');
      
      if (equipoId) {
        await cargarOfertasRealizadas(equipoId);
      }
      
      if (onFichajeExitoso) {
        onFichajeExitoso();
      }
    } catch (err) {
      alert('❌ Error al retirar la oferta: ' + err.message);
    }
  };

  // 🆕 Función para editar puja
  const handleEditarPuja = async (pujaId, nuevoMonto) => {
    try {
      const resultado = await editarPuja(pujaId, nuevoMonto);
      
      // Recargar datos después de editar
      if (equipoId) {
        await cargarPujasRealizadas(equipoId);
      }
      
      if (onFichajeExitoso) {
        onFichajeExitoso();
      }
      
      alert('✅ Puja actualizada correctamente');
      return resultado;
    } catch (error) {
      alert('❌ Error al editar la puja: ' + error.message);
      throw error;
    }
  };

  // 🆕 Función para editar oferta
  const handleEditarOferta = async (ofertaId, nuevoMonto) => {
    try {
      const resultado = await editarOferta(ofertaId, nuevoMonto);
      
      // Recargar datos después de editar
      if (equipoId) {
        await cargarOfertasRealizadas(equipoId);
      }
      
      if (onFichajeExitoso) {
        onFichajeExitoso();
      }
      
      alert('✅ Oferta actualizada correctamente');
      return resultado;
    } catch (error) {
      alert('❌ Error al editar la oferta: ' + error.message);
      throw error;
    }
  };

  // Reemplaza todo el useEffect problemático con esto:
  useEffect(() => {
    const retirarPujasDeJugadoresInexistentes = async () => {
      if (pujasRealizadas.length === 0 || !equipoId) return;

      // Filtrar solo pujas que realmente necesitan ser retiradas
      const pujasParaRetirar = pujasRealizadas.filter(puja => {
        const jugadorNoDisponible = !puja.jugador_en_venta || puja.jugador_expirado;
        const puedeSerRetirada = !puja.es_ganadora && jugadorNoDisponible;
        
        // Solo procesar si realmente necesita ser retirada
        return puedeSerRetirada && puja.activa !== false;
      });

      if (pujasParaRetirar.length === 0) return;

      console.log(`🔄 Intentando retirar ${pujasParaRetirar.length} pujas de jugadores no disponibles`);

      for (const puja of pujasParaRetirar) {
        try {
          console.log(`🔄 Retirando puja ${puja.id} para jugador ${puja.jugador_nombre}`);
          await retirarPuja(puja.id);
          console.log(`✅ Puja ${puja.id} retirada exitosamente`);
          
          // Pequeña pausa entre requests
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          // Si el error es que la subasta terminó, marcamos la puja como no activa
          if (err.message.includes('subasta ha terminado') || err.message.includes('No se puede retirar')) {
            console.log(`⚠️ Puja ${puja.id} no puede ser retirada (subasta terminada), marcando como inactiva`);
          } else {
            console.error(`❌ Error retirando puja ${puja.id}:`, err.message);
          }
        }
      }

      // Recargar datos solo si se procesaron pujas
      setTimeout(() => {
        cargarPujasRealizadas(equipoId);
        cargarMercado();
      }, 500);
    };

    // Ejecutar solo si hay pujas para procesar
    const tienePujasParaProcesar = pujasRealizadas.some(puja => 
      (!puja.jugador_en_venta || puja.jugador_expirado) && 
      !puja.es_ganadora && 
      puja.activa !== false
    );

    if (tienePujasParaProcesar) {
      retirarPujasDeJugadoresInexistentes();
    }
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

  // 🆕 Función corregida para verificar si ya se pujó por un jugador
  const yaPujadoPorJugador = (jugadorId) => {
    console.log('🔍 Verificando pujas para jugador:', jugadorId);
    
    // Verificar en pujas activas
    const yaPujado = pujasRealizadas.some(puja => {
      const esPujaActiva = puja.jugador === jugadorId &&
                          !puja.es_ganadora && 
                          puja.jugador_en_venta && 
                          !puja.jugador_expirado;
      
      console.log(`Puja ${puja.id}: jugador=${puja.jugador}, activa=${esPujaActiva}`);
      return esPujaActiva;
    });

    // Verificar en ofertas directas pendientes
    const yaOfertado = ofertasRealizadas.some(oferta => {
      const esOfertaPendiente = oferta.jugador === jugadorId &&
                               oferta.estado === 'pendiente';
      
      console.log(`Oferta ${oferta.id}: jugador=${oferta.jugador}, pendiente=${esOfertaPendiente}`);
      return esOfertaPendiente;
    });

    console.log(`Resultado: yaPujado=${yaPujado}, yaOfertado=${yaOfertado}`);
    return yaPujado || yaOfertado;
  };

  const getOfertaExistente = (jugadorId) => {
    const pujaExistente = pujasRealizadas.find(puja => 
      puja.jugador === jugadorId &&
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    );

    if (pujaExistente) return { tipo: 'puja', data: pujaExistente };

    const ofertaExistente = ofertasRealizadas.find(oferta => 
      oferta.jugador === jugadorId &&
      oferta.estado === 'pendiente'
    );

    if (ofertaExistente) return { tipo: 'oferta', data: ofertaExistente };

    return null;
  };

  const getPujaExistente = (jugadorId) => {
    return pujasRealizadas.find(puja => 
      puja.jugador === jugadorId &&
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    );
  };

  const handleIniciarEdicionPuja = (puja) => {
    if (!puja.jugador_en_venta || puja.jugador_expirado) {
      alert('❌ No puedes editar esta puja porque el jugador ya no está disponible');
      return;
    }

    setPujaEditando(puja);
    setModoEdicionPuja(true);
    setMontoPuja((puja.monto + 1).toString());
    setMostrarModalPuja(true);
  };

  // 🆕 Función corregida para manejar pujas
  const handlePujar = (jugador) => {
    console.log('🎯 Intentando pujar por:', jugador);
    
    if (yaPujadoPorJugador(jugador.id)) {
      const ofertaExistente = getOfertaExistente(jugador.id);
      
      if (ofertaExistente) {
        if (ofertaExistente.tipo === 'puja') {
          handleIniciarEdicionPuja(ofertaExistente.data);
        } else {
          alert(`⚠️ Ya tienes una oferta directa pendiente por ${jugador.nombre}. No puedes hacer una puja en subasta por el mismo jugador.`);
        }
        return;
      }
    }

    // 🆕 CORRECCIÓN: Permitir pujar en cualquier tipo de venta que esté en el mercado
    // El mercado incluye tanto subastas como ventas directas de usuarios
    setJugadorSeleccionado(jugador);
    setModoEdicionPuja(false);
    setPujaEditando(null);
    setMontoPuja('');
    setMostrarModalPuja(true);
  };

  const handleChangeMontoPuja = (numericValue) => {
    setMontoPuja(numericValue);
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
  const maxJugadores = 10;
  const presupuesto = datosUsuario?.equipo?.presupuesto || 0;

  const esJugadorEnVentaPorMi = (jugador) => {
    const esMiJugador = jugador.tipo === 'venta_usuario' && jugador.vendedor === nombreEquipoUsuario;
    return esMiJugador;
  };

  // 🆕 Función corregida para verificar si se puede pujar
  const puedePujarPorJugador = (jugador) => {
    console.log('🔍 Verificando si se puede pujar por:', jugador.nombre);
    
    const esMiJugador = esJugadorEnVentaPorMi(jugador);
    
    if (esMiJugador) {
      console.log('❌ No se puede pujar: es mi jugador');
      return false;
    }
    
    if (!jugador.en_venta || jugador.expirado) {
      console.log('❌ No se puede pujar: no está en venta o expirado');
      return false;
    }
    
    // Verificar si ya se pujó por este jugador
    if (yaPujadoPorJugador(jugador.id)) {
      console.log('❌ No se puede pujar: ya se pujó por este jugador');
      return false;
    }
    
    // Verificar límites de pujas
    const pujasActivas = pujasRealizadas.filter(puja => 
      !puja.es_ganadora && 
      puja.jugador_en_venta && 
      !puja.jugador_expirado
    ).length;
    
    const capacidadDisponible = maxJugadores - totalJugadores;
    const pujasPermitidas = Math.max(0, capacidadDisponible);
    
    if (pujasActivas >= pujasPermitidas) {
      console.log('❌ No se puede pujar: límite de pujas alcanzado');
      return false;
    }
    
    if (presupuesto <= (jugador.valor || 0)) {
      console.log('❌ No se puede pujar: presupuesto insuficiente');
      return false;
    }
    
    console.log('✅ Se puede pujar por este jugador');
    return true;
  };

  const getTextoBotonPuja = (jugador) => {
    if (esJugadorEnVentaPorMi(jugador)) return 'Tu jugador';
    if (!jugador.en_venta || jugador.expirado) return 'Expirado';
    
    // Verificar ofertas existentes
    const ofertaExistente = getOfertaExistente(jugador.id);
    if (ofertaExistente) {
      return ofertaExistente.tipo === 'puja' ? 'Ya pujado' : 'Oferta enviada';
    }
    
    // Verificar límites de pujas
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
    
    // Verificar ofertas existentes
    const ofertaExistente = getOfertaExistente(jugador.id);
    if (ofertaExistente) {
      return ofertaExistente.tipo === 'puja' 
        ? 'Ya tienes una puja activa por este jugador. Puedes editarla en "Ofertas & Pujas"'
        : 'Ya tienes una oferta directa pendiente por este jugador';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-lg border border-white/20">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-3">
              <ShoppingCart className="text-white" size={32} />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Mercado de Fichajes
              </h1>
              <p className="text-gray-600 mt-1">Liga {datosUsuario?.ligaActual?.nombre}</p>
            </div>
          </div>
        </div>

        {/* Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Presupuesto */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Presupuesto</p>
                <p className="text-3xl font-bold mt-2">{formatValue(presupuesto)}</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <TrendingUp className="text-white" size={28} />
              </div>
            </div>
          </div>

          {/* Jugadores */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Plantilla</p>
                <p className="text-3xl font-bold mt-2">{totalJugadores}<span className="text-green-200">/{maxJugadores}</span></p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <Users className="text-white" size={28} />
              </div>
            </div>
          </div>

          {/* Pujas Activas */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Pujas Activas</p>
                <p className="text-3xl font-bold mt-2">
                  {pujasRealizadas.filter(puja => 
                    !puja.es_ganadora && 
                    puja.jugador_en_venta && 
                    !puja.jugador_expirado
                  ).length}
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <ShoppingCart className="text-white" size={28} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <MarketHeader
            pestañaActiva={pestañaActiva}
            setPestañaActiva={setPestañaActiva}
            mercado={mercado}
            ofertasRecibidas={ofertasRecibidas}
            ofertasRealizadas={ofertasRealizadas}
            pujasRealizadas={pujasRealizadas}
            ultimaActualizacion={ultimaActualizacion}
            onRefresh={handleActualizar}
          />

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl mb-6 flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="mr-3 text-red-500" size={24} />
                <div>
                  <div className="font-semibold">Error al cargar</div>
                  <div className="text-sm">{error}</div>
                </div>
              </div>
              <button 
                onClick={handleActualizar}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">Cargando mercado...</p>
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
                  handleRetirarOferta={handleRetirarOferta}
                  handleEditarOferta={handleEditarOferta} // 🆕 Pasar la nueva función
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
        datosUsuario={datosUsuario}
      />
    </div>
  );
};

export default MarketScreen;