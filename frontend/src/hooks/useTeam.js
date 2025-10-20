import { useState, useEffect, useCallback } from 'react';
import { 
  getCurrentUser,
  cargarDatosIniciales,
  intercambiarJugadores, 
  ponerEnVenta,
  guardarAlineacion,
  quitarJugadorDelMercado,
  getClasificacion,
  moverJugadorAlineacion as apiMoverJugadorAlineacion // 🆕 Importar la función del API
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

  console.log('🔄 Calculando alineación basada en en_banquillo...');
  
  // Filtrar por posición y estado de banquillo
  const portero_titular = jugadoresList.find(j => j.posicion === 'POR' && !j.en_banquillo) || null;
  
  const defensas_titulares = jugadoresList
    .filter(j => j.posicion === 'DEF' && !j.en_banquillo)
    .sort((a, b) => b.puntos_totales - a.puntos_totales);
  
  const delanteros_titulares = jugadoresList
    .filter(j => j.posicion === 'DEL' && !j.en_banquillo)
    .sort((a, b) => b.puntos_totales - a.puntos_totales);
  
  const banquillo = jugadoresList.filter(j => j.en_banquillo);

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
  const [ligaActual, setLigaActual] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPosicion, setLoadingPosicion] = useState(false);
  const [error, setError] = useState(null);
  const [posicionLiga, setPosicionLiga] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date().toLocaleTimeString());
  const [alineacion, setAlineacion] = useState(determinarAlineacionBase([]));

  const cargarEquipo = useCallback(async () => {
    if (!equipoId) return;
    
    setLoading(true);
    setError(null);
    try {
      const userData = await getCurrentUser();
      const datosIniciales = await cargarDatosIniciales(userData, true);
      
      setEquipo(datosIniciales.equipo);
      setJugadores(datosIniciales.jugadores || []);
      setLigaActual(datosIniciales.ligaActual);
      setUltimaActualizacion(new Date().toLocaleTimeString());
      
      console.log('✅ useTeam: Datos cargados exitosamente');
    } catch (err) {
      setError('Error cargando datos del equipo');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [equipoId]);

  // Actualizar alineación cuando cambian los jugadores
  useEffect(() => {
    const nuevaAlineacion = determinarAlineacionBase(jugadores);
    setAlineacion(nuevaAlineacion);
  }, [jugadores]);

  // Cargar posición en liga
  useEffect(() => {
    const cargarPosicionLiga = async () => {
      if (!equipo || !equipo.id) return;

      const ligaId = equipo.liga_id || ligaActual?.id;
      if (!ligaId) return;

      setLoadingPosicion(true);
      try {
        const clasificacion = await getClasificacion(ligaId);
        
        if (clasificacion && Array.isArray(clasificacion)) {
          const equipoEnClasificacion = clasificacion.find(
            eq => eq.equipo_id === equipo.id || eq.nombre === equipo.nombre
          );
          setPosicionLiga(equipoEnClasificacion?.posicion || null);
        }
      } catch (error) {
        console.error('❌ Error cargando posición:', error);
        setPosicionLiga(null);
      } finally {
        setLoadingPosicion(false);
      }
    };

    if (equipo && equipo.id) {
      cargarPosicionLiga();
    }
  }, [equipo, ligaActual]);

  const determinarAlineacion = useCallback((jugadoresList) => {
    return determinarAlineacionBase(jugadoresList || jugadores);
  }, [jugadores]);

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

  // 🆕 Función para mover jugador del banquillo a la alineación
  const moverJugadorAlineacion = useCallback(async (jugadorId, posicion, index) => {
    if (!equipoId) return;

    try {
      console.log('🔄 useTeam: Moviendo jugador a alineación:', { jugadorId, posicion, index });

      // Llamar a la API para mover el jugador
      const resultado = await apiMoverJugadorAlineacion(equipoId, jugadorId, posicion, index);
      
      // Actualizar el estado local del jugador
      setJugadores(prevJugadores => 
        prevJugadores.map(jugador => 
          jugador.id === jugadorId 
            ? { ...jugador, en_banquillo: false }
            : jugador
        )
      );

      console.log('✅ useTeam: Jugador movido a alineación exitosamente');
      return resultado;
    } catch (error) {
      console.error('❌ useTeam: Error moviendo jugador a alineación:', error);
      throw error;
    }
  }, [equipoId]);

  // 🆕 CORREGIDO: Función mejorada para realizar cambios
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

  // 🆕 CORREGIDO: Función mejorada para quitar del mercado
  const retirarJugadorDelMercado = useCallback(async (jugadorId) => {
    if (!equipoId) return;

    try {
      console.log('🔄 useTeam: Quitando jugador del mercado:', jugadorId);
      const resultado = await quitarJugadorDelMercado(equipoId, jugadorId);
      console.log('✅ useTeam: Jugador quitado del mercado exitosamente:', resultado);
      await cargarEquipo(); // Recargar datos
      return resultado;
    } catch (err) {
      console.error('❌ useTeam: Error retirando jugador del mercado:', err);
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

  // 🆕 Función para forzar actualización
  const forzarActualizacion = useCallback(async () => {
    console.log('🔄 useTeam: Forzando actualización de datos');
    await cargarEquipo();
  }, [cargarEquipo]);

  // 🆕 Calcular puntos totales
  const calcularPuntosTotales = useCallback(() => {
    return jugadores.reduce((sum, j) => sum + (j.puntos_totales || 0), 0);
  }, [jugadores]);

  // 🆕 Función para encontrar jugadores intercambiables (CORREGIDA)
  const encontrarJugadoresIntercambiables = useCallback((jugadorSeleccionado) => {
    if (!jugadorSeleccionado) return [];
    
    console.log('🔍 Buscando jugadores intercambiables para:', jugadorSeleccionado.nombre);
    console.log('📍 Posición:', jugadorSeleccionado.posicion);
    console.log('🏟️ En banquillo:', jugadorSeleccionado.en_banquillo);

    // 🆕 CORRECCIÓN: Permitir intercambios entre titulares y banquillo
    const intercambiables = jugadores.filter(j => 
      j.id !== jugadorSeleccionado.id && 
      j.posicion === jugadorSeleccionado.posicion && 
      !j.en_venta &&
      // 🆕 CAMBIO IMPORTANTE: Permitir intercambio entre cualquier estado
      // Solo excluir si está en venta
      true
    );

    console.log('🎯 Jugadores intercambiables encontrados:', intercambiables.map(j => ({
      nombre: j.nombre,
      posicion: j.posicion,
      en_banquillo: j.en_banquillo,
      en_venta: j.en_venta
    })));

    return intercambiables;
  }, [jugadores]);

  // 🆕 Función para obtener jugadores del banquillo por posición
  const getJugadoresBanquilloPorPosicion = useCallback((posicion) => {
    if (!jugadores || !Array.isArray(jugadores)) return [];
    
    return jugadores.filter(jugador => 
      jugador && 
      jugador.posicion === posicion && 
      jugador.en_banquillo === true
    );
  }, [jugadores]);

  useEffect(() => {
    cargarEquipo();
  }, [cargarEquipo]);

  return {
    equipo,
    jugadores,
    ligaActual,
    alineacion,
    loading,
    loadingPosicion,
    error,
    posicionLiga,
    ultimaActualizacion,
    cargarEquipo,
    determinarAlineacion,
    sincronizarAlineacion,
    realizarCambio,
    venderJugador: ponerJugadorEnVenta,
    retirarJugadorDelMercado,
    puedeVenderJugador,
    forzarActualizacion,
    calcularPuntosTotales,
    encontrarJugadoresIntercambiables,
    moverJugadorAlineacion, // 🆕 Nueva función
    getJugadoresBanquilloPorPosicion // 🆕 Nueva función
  };
};