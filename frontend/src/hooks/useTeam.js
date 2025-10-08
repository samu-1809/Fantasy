import { useState, useEffect } from 'react';
import { 
  getEquipo, 
  getJugadoresPorEquipo, 
  actualizarEstadosBanquillo,
  intercambiarJugadores,
  venderJugador
} from '../services/api';

export const useTeam = (equipoId) => {
  const [equipo, setEquipo] = useState(null);
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar equipo y jugadores
  const cargarEquipo = async () => {
    if (!equipoId) return;
    
    setLoading(true);
    setError(null);
    try {
      const equipoData = await getEquipo(equipoId);
      setEquipo(equipoData);

      // Cargar jugadores del equipo
      const jugadoresData = await getJugadoresPorEquipo(equipoId);
      setJugadores(jugadoresData);
    } catch (err) {
      setError('Error cargando datos del equipo');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Determinar alineación automáticamente
  const determinarAlineacion = (jugadoresList) => {
    const portero = jugadoresList.find(j => j.posicion === 'POR');
    const defensas = jugadoresList.filter(j => j.posicion === 'DEF');
    const delanteros = jugadoresList.filter(j => j.posicion === 'DEL');

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

    // Determinar banquillo
    const titulares = [portero_titular, ...defensas_titulares, ...delanteros_titulares].filter(Boolean);
    const banquillo = jugadoresList.filter(jugador => !titulares.includes(jugador));

    return {
      portero_titular,
      defensas_titulares,
      delanteros_titulares,
      banquillo
    };
  };

  // Sincronizar alineación con el backend
  const sincronizarAlineacion = async (alineacion) => {
    if (!equipoId) return;

    try {
      const estadosParaSincronizar = jugadores.map(jugador => ({
        jugador_id: jugador.id,
        en_banquillo: alineacion.banquillo.includes(jugador)
      }));

      await actualizarEstadosBanquillo(equipoId, estadosParaSincronizar);
    } catch (err) {
      console.error('Error sincronizando alineación:', err);
      throw err;
    }
  };

  // Realizar cambio entre jugadores
  const realizarCambio = async (jugadorOrigenId, jugadorDestinoId) => {
    if (!equipoId) return;

    try {
      await intercambiarJugadores(equipoId, jugadorOrigenId, jugadorDestinoId);
      await cargarEquipo(); // Recargar datos
    } catch (err) {
      console.error('Error realizando cambio:', err);
      throw err;
    }
  };

  // Vender jugador
  const venderJugadorEquipo = async (jugadorId, precio) => {
    if (!equipoId) return;

    try {
      await venderJugador(equipoId, jugadorId, precio);
      await cargarEquipo(); // Recargar datos
    } catch (err) {
      console.error('Error vendiendo jugador:', err);
      throw err;
    }
  };

  // Verificar si se puede vender un jugador
  const puedeVenderJugador = (jugador) => {
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
  };

  useEffect(() => {
    cargarEquipo();
  }, [equipoId]);

  return {
    equipo,
    jugadores,
    loading,
    error,
    cargarEquipo,
    determinarAlineacion,
    sincronizarAlineacion,
    realizarCambio,
    venderJugador: venderJugadorEquipo,
    puedeVenderJugador
  };
};