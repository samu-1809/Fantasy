import { useState, useEffect, useCallback } from 'react';
import { 
  getCurrentUser,
  cargarDatosIniciales,
  intercambiarJugadores, 
  ponerEnVenta,
  guardarAlineacion,
  quitarJugadorDelMercado
} from '../services/api';

// Función pura fuera del hook para evitar recreación
const determinarAlineacionBase = (jugadoresList) => {
  if (!jugadoresList || jugadoresList.length === 0) {
    return {
      portero_titular: null,
      defensas_titulares: [],
      delanteros_titulares: [],
      banquillo: []
    };
  }

  const portero = jugadoresList.find(j => j.posicion === 'POR');
  const defensas = jugadoresList.filter(j => j.posicion === 'DEF');
  const delanteros = jugadoresList.filter(j => j.posicion === 'DEL');

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
  const titulares = [portero_titular, ...defensas_titulares, ...delanteros_titulares].filter(Boolean);
  const banquillo = jugadoresList.filter(jugador => !titulares.includes(jugador));

  return {
    portero_titular,
    defensas_titulares,
    delanteros_titulares,
    banquillo
  };
};

export const useTeam = (equipoId) => {
  const [equipo, setEquipo] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarEquipo = useCallback(async () => {
    if (!equipoId) return;
    
    setLoading(true);
    setError(null);
    try {
      const userData = await getCurrentUser();
      const datosIniciales = await cargarDatosIniciales(userData, true);
      
      setEquipo(datosIniciales.equipo);
      setJugadores(datosIniciales.jugadores || []);
    } catch (err) {
      setError('Error cargando datos del equipo');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [equipoId]);

  // Determinar alineación automáticamente - versión memoizada
  const determinarAlineacion = useCallback((jugadoresList) => {
    return determinarAlineacionBase(jugadoresList || jugadores);
  }, [jugadores]);

  // Sincronizar alineación con el backend
  const sincronizarAlineacion = useCallback(async (alineacion) => {
    if (!equipoId) return;

    try {
      const estadosParaSincronizar = jugadores.map(jugador => ({
        jugador_id: jugador.id,
        en_banquillo: alineacion.banquillo.includes(jugador)
      }));

      console.log('💾 Guardando alineación en backend...', estadosParaSincronizar);
      await guardarAlineacion(equipoId, estadosParaSincronizar);
      console.log('✅ Alineación guardada correctamente');
    } catch (err) {
      console.error('❌ Error sincronizando alineación:', err);
      throw err;
    }
  }, [equipoId, jugadores]);

  // Realizar cambio entre jugadores
  const realizarCambio = useCallback(async (jugadorOrigenId, jugadorDestinoId) => {
    if (!equipoId) return;

    try {
      console.log('🔄 Realizando cambio en backend...', { jugadorOrigenId, jugadorDestinoId });
      await intercambiarJugadores(equipoId, jugadorOrigenId, jugadorDestinoId);
      await cargarEquipo(); // Recargar datos
      console.log('✅ Cambio completado');
    } catch (err) {
      console.error('❌ Error realizando cambio:', err);
      throw err;
    }
  }, [equipoId, cargarEquipo]);

  // Poner jugador en venta
  const ponerJugadorEnVenta = useCallback(async (jugadorId, precio) => {
    if (!equipoId) return;

    try {
      await ponerEnVenta(equipoId, jugadorId, precio);
      await cargarEquipo(); // Recargar datos
    } catch (err) {
      console.error('Error poniendo jugador en venta:', err);
      throw err;
    }
  }, [equipoId, cargarEquipo]);

  // Retirar jugador del mercado
  const retirarJugadorDelMercado = useCallback(async (jugadorId) => {
    if (!equipoId) return;

    try {
      await quitarJugadorDelMercado(equipoId, jugadorId);
      await cargarEquipo(); // Recargar datos
    } catch (err) {
      console.error('Error retirando jugador del mercado:', err);
      throw err;
    }
  }, [equipoId, cargarEquipo]);

  // Verificar si se puede vender un jugador
  const puedeVenderJugador = useCallback((jugador) => {
    if (!jugador || !jugadores.length) return false;

    const contarPorPosicion = {
      'POR': jugadores.filter(j => j.posicion === 'POR').length,
      'DEF': jugadores.filter(j => j.posicion === 'DEF').length,
      'DEL': jugadores.filter(j => j.posicion === 'DEL').length
    };

    if (jugador.posicion === 'POR' && contarPorPosicion.POR === 1) return false;
    if (jugador.posicion === 'DEF' && contarPorPosicion.DEF === 2) return false;
    if (jugador.posicion === 'DEL' && contarPorPosicion.DEL === 2) return false;

    return true;
  }, [jugadores]);

  useEffect(() => {
    cargarEquipo();
  }, [cargarEquipo]);

  return {
    equipo,
    jugadores,
    loading,
    error,
    cargarEquipo,
    determinarAlineacion,
    sincronizarAlineacion,
    realizarCambio,
    venderJugador: ponerJugadorEnVenta,
    retirarJugadorDelMercado,
    puedeVenderJugador
  };
};