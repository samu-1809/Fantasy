import React, { useState, useEffect } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { actualizarEstadosBanquillo, getCurrentUser, cargarDatosIniciales, intercambiarJugadores, venderJugador } from '../../services/api';
import PlayerCard from './PlayerCard';
import FieldView from './FieldView';

const DashboardScreen = ({ datosUsuario }) => {
  const [equipoActual, setEquipoActual] = useState(datosUsuario?.equipo || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para gestión de cambios
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [modoCambio, setModoCambio] = useState(false);
  const [jugadorOrigenCambio, setJugadorOrigenCambio] = useState(null);
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [precioVenta, setPrecioVenta] = useState('');
  const [jugadorAVender, setJugadorAVender] = useState(null);
  const [mostrarModalOpciones, setMostrarModalOpciones] = useState(false);
  
  // Estados para la alineación
  const [portero_titular, setPorteroTitular] = useState(null);
  const [defensas_titulares, setDefensasTitulares] = useState([]);
  const [delanteros_titulares, setDelanterosTitulares] = useState([]);
  const [banquillo, setBanquillo] = useState([]);
  const [alineacionCargada, setAlineacionCargada] = useState(false);

  // DashboardScreen.jsx - Manejar mejor el estado
  useEffect(() => {
    const cargarAlineacion = async () => {
      // 🎯 MEJORADO: Verificar que tenemos datos completos
      if (!datosUsuario) {
        console.log('❌ No hay datosUsuario cargados');
        return;
      }

      if (!datosUsuario.equipo || !datosUsuario.equipo.id) {
        console.log('❌ No hay equipo cargado o equipo sin ID');
        return;
      }

      if (!datosUsuario.jugadores || datosUsuario.jugadores.length === 0) {
        console.log('❌ No hay jugadores cargados');
        return;
      }

      console.log('🔄 Cargando alineación...');
      setLoadingAlineacion(true);
      try {
        await determinarAlineacion();
        console.log('✅ Alineación cargada correctamente');
      } catch (err) {
        console.error('❌ Error cargando alineación:', err);
      } finally {
        setLoadingAlineacion(false);
      }
    };

    cargarAlineacion();
  }, [datosUsuario]);

  // Recargar datos del equipo
  const recargarDatosEquipo = async () => {
    try {
      console.log('🔄 Recargando datos del equipo...');
      const userData = await getCurrentUser();
      const nuevosDatos = await cargarDatosIniciales(userData);
      
      setEquipoActual(nuevosDatos.equipo);
      console.log('✅ Datos recargados correctamente');
      return nuevosDatos;
    } catch (error) {
      console.error('❌ Error recargando datos:', error);
      throw error;
    }
  };

  // Determinar alineación
  const determinarAlineacion = async (jugadores, equipoId) => {
    console.log('🎯 Determinando alineación...');
    
    const portero = jugadores.find(j => j.posicion === 'POR');
    const defensas = jugadores.filter(j => j.posicion === 'DEF');
    const delanteros = jugadores.filter(j => j.posicion === 'DEL');

    console.log(`📊 Jugadores por posición: POR:${portero ? 1 : 0}, DEF:${defensas.length}, DEL:${delanteros.length}`);

    // Lógica mejorada: Usar en_banquillo si está definido, si no usar puntos
    let defensas_titulares, delanteros_titulares;

    const defensasEnCampo = defensas.filter(d => d.en_banquillo === false);
    const delanterosEnCampo = delanteros.filter(d => d.en_banquillo === false);

    if (defensasEnCampo.length >= 2) {
      defensas_titulares = defensasEnCampo.slice(0, 2);
    } else {
      defensas_titulares = [...defensas]
        .sort((a, b) => b.puntos_totales - a.puntos_totales)
        .slice(0, 2);
    }

    if (delanterosEnCampo.length >= 2) {
      delanteros_titulares = delanterosEnCampo.slice(0, 2);
    } else {
      delanteros_titulares = [...delanteros]
        .sort((a, b) => b.puntos_totales - a.puntos_totales)
        .slice(0, 2);
    }

    const portero_titular = portero;

    console.log('🏆 Titulares seleccionados:');
    console.log('   POR:', portero_titular?.nombre);
    console.log('   DEF:', defensas_titulares.map(d => d.nombre));
    console.log('   DEL:', delanteros_titulares.map(d => d.nombre));

    // Determinar banquillo
    const titulares = [portero_titular, ...defensas_titulares, ...delanteros_titulares].filter(Boolean);
    const banquillo = jugadores.filter(jugador => !titulares.includes(jugador));

    console.log('🪑 Banquillo:', banquillo.map(b => b.nombre));

    // Sincronizar con el backend
    const estadosParaSincronizar = jugadores.map(jugador => ({
      jugador_id: jugador.id,
      en_banquillo: !titulares.includes(jugador)
    }));

    try {
      console.log('🔄 Sincronizando estados con el backend...');
      await actualizarEstadosBanquillo(equipoId, estadosParaSincronizar);
      console.log('✅ Estados sincronizados correctamente');
    } catch (error) {
      console.error('❌ Error sincronizando estados:', error);
    }

    return {
      portero_titular,
      defensas_titulares,
      delanteros_titulares,
      banquillo
    };
  };

  // Effect para cargar la alineación cuando cambia el equipo
  useEffect(() => {
    const cargarAlineacion = async () => {
      if (equipoActual && equipoActual.jugadores) {
        try {
          console.log('🔄 Cargando alineación...');
          const alineacion = await determinarAlineacion(equipoActual.jugadores, equipoActual.id);
          
          setPorteroTitular(alineacion.portero_titular);
          setDefensasTitulares(alineacion.defensas_titulares);
          setDelanterosTitulares(alineacion.delanteros_titulares);
          setBanquillo(alineacion.banquillo);
          setAlineacionCargada(true);
          
          console.log('✅ Alineación cargada correctamente');
        } catch (error) {
          console.error('❌ Error cargando alineación:', error);
          setAlineacionCargada(true);
        }
      }
    };

    cargarAlineacion();
  }, [equipoActual]);

  // Funciones de gestión de jugadores
  const handleClicJugador = (jugador) => {
    if (modoCambio && jugadorOrigenCambio) {
      realizarCambio(jugadorOrigenCambio, jugador);
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

  const realizarCambio = async (origen, destino) => {
    console.log('🔄 REALIZAR CAMBIO - Datos completos:');
    console.log('   Origen:', origen);
    console.log('   Destino:', destino);
    
    if (origen.posicion !== destino.posicion) {
      alert(`❌ No puedes cambiar un ${origen.posicion} por un ${destino.posicion}. Deben ser de la misma posición.`);
      cancelarModoCambio();
      return;
    }

    try {
      console.log('📡 Llamando a intercambiarJugadores...');
      await intercambiarJugadores(equipoActual.id, origen.id, destino.id);
      
      console.log('🔄 Recargando datos...');
      await recargarDatosEquipo();
      
      alert(`✅ Cambio realizado: ${origen.nombre} ↔ ${destino.nombre}`);
    } catch (err) {
      console.error('❌ Error en realizarCambio:', err);
      alert('❌ Error al realizar el cambio: ' + err.message);
    } finally {
      cancelarModoCambio();
    }
  };

  const getEstadoJugador = (jugador) => {
    if (modoCambio) {
      if (jugador.id === jugadorOrigenCambio?.id) {
        return 'origen-cambio';
      } else if (jugador.posicion === jugadorOrigenCambio?.posicion) {
        return 'apto-cambio';
      } else {
        return 'no-apto-cambio';
      }
    } else if (jugador.id === jugadorSeleccionado?.id) {
      return 'seleccionado';
    }
    return 'normal';
  };

  const abrirModalVenta = (jugador) => {
    setJugadorAVender(jugador);
    setPrecioVenta(jugador.valor.toString());
    setMostrarModalVenta(true);
    setJugadorSeleccionado(null);
    setMostrarModalOpciones(false);
  };

  const cerrarModalVenta = () => {
    setMostrarModalVenta(false);
    setJugadorAVender(null);
    setPrecioVenta('');
  };

  const confirmarVentaMercado = async () => {
    if (!jugadorAVender || !precioVenta) return;

    try {
      await venderJugador(equipoActual.id, jugadorAVender.id, parseInt(precioVenta));
      await recargarDatosEquipo();
      cerrarModalVenta();
      alert('✅ Jugador puesto en venta en el mercado');
    } catch (err) {
      alert('❌ Error al poner en venta: ' + err.message);
    }
  };

  const puedeVenderJugador = (jugador) => {
    if (!equipoActual || !equipoActual.jugadores) return false;

    const jugadores = equipoActual.jugadores;
    
    const contarPorPosicion = {
      'POR': jugadores.filter(j => j.posicion === 'POR').length,
      'DEF': jugadores.filter(j => j.posicion === 'DEF').length,
      'DEL': jugadores.filter(j => j.posicion === 'DEL').length
    };

    if (jugador.posicion === 'POR' && contarPorPosicion.POR === 1) return false;
    if (jugador.posicion === 'DEF' && contarPorPosicion.DEF === 2) return false;
    if (jugador.posicion === 'DEL' && contarPorPosicion.DEL === 2) return false;

    return true;
  };

  const handleVenderJugador = (jugador) => {
    if (!puedeVenderJugador(jugador)) {
      const mensajesError = {
        'POR': 'No puedes vender a tu único portero.',
        'DEF': 'No puedes vender este defensa (mínimo 2).',
        'DEL': 'No puedes vender este delantero (mínimo 2).'
      };
      alert(mensajesError[jugador.posicion]);
      return;
    }
    abrirModalVenta(jugador);
  };

  // Helpers
  const formatValue = (value) => `€${(value / 1000000).toFixed(1)}M`;
  const calcularPuntosTotales = () => equipoActual.jugadores.reduce((sum, j) => sum + j.puntos_totales, 0);
  const totalJugadores = equipoActual?.jugadores?.length || 0;
  const maxJugadores = 13;

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
            onClick={recargarDatosEquipo}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!equipoActual) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>No hay equipo disponible</p>
      </div>
    );
  }

  if (!alineacionCargada) {
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
            <div className="text-2xl font-bold text-blue-600">{formatValue(equipoActual.presupuesto)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Puntos Totales</div>
            <div className="text-2xl font-bold text-green-600">{calcularPuntosTotales()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Posición Liga</div>
            <div className="text-2xl font-bold text-purple-600">-</div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-2">
          <Users size={28} />
          {equipoActual.nombre}
        </h2>

        {/* Campo de fútbol */}
        <FieldView
          portero_titular={portero_titular}
          defensas_titulares={defensas_titulares}
          delanteros_titulares={delanteros_titulares}
          banquillo={banquillo}
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
              </div>

              <div className="flex gap-2 flex-col">
                <button
                  onClick={() => iniciarModoCambio(jugadorSeleccionado)}
                  className="bg-blue-600 text-white py-3 px-4 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Cambiar
                </button>
                <button
                  onClick={() => {
                    if (!puedeVenderJugador(jugadorSeleccionado)) {
                      const mensajesError = {
                        'POR': 'No puedes vender a tu único portero.',
                        'DEF': 'No puedes vender este defensa (mínimo 2).',
                        'DEL': 'No puedes vender este delantero (mínimo 2).'
                      };
                      alert(mensajesError[jugadorSeleccionado.posicion]);
                      return;
                    }
                    abrirModalVenta(jugadorSeleccionado);
                  }}
                  className="bg-red-600 text-white py-3 px-4 rounded text-sm hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <span>💰</span>
                  Poner en el mercado
                </button>
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
                <p className="text-sm">Valor actual: {formatValue(jugadorAVender.valor)}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio de venta:
                </label>
                <input
                  type="number"
                  value={precioVenta}
                  onChange={(e) => setPrecioVenta(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Ej: 5000000"
                  min={0}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Precio sugerido: {formatValue(jugadorAVender.valor)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={confirmarVentaMercado}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                >
                  Confirmar Venta
                </button>
                <button
                  onClick={cerrarModalVenta}
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

export default DashboardScreen;