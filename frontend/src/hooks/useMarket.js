import { useState, useEffect, useCallback } from 'react';
import { getMercado, ficharJugador } from '../services/api';

export const useMarket = (ligaId) => {
  const [mercado, setMercado] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    nombre: '',
    posicion: '',
    equipoReal: ''
  });

  const cargarMercado = useCallback(async () => {
    if (!ligaId) {
      console.warn('⚠️ No hay ligaId para cargar mercado');
      setError('No se pudo cargar la información de la liga');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Cargando mercado para liga:', ligaId);
      const data = await getMercado(ligaId);
      setMercado(data);
      console.log(`✅ ${data.length} jugadores cargados en mercado`);
    } catch (err) {
      console.error('❌ Error cargando mercado:', err);
      setError('Error cargando el mercado de jugadores: ' + err.message);
      setMercado([]);
    } finally {
      setLoading(false);
    }
  }, [ligaId]);

  const estaExpirado = useCallback((fechaMercado) => {
    if (!fechaMercado) return false;
    
    try {
      const fechaMercadoObj = new Date(fechaMercado);
      const expiracion = new Date(fechaMercadoObj.getTime() + (24 * 60 * 60 * 1000));
      const ahora = new Date();
      
      return ahora >= expiracion;
    } catch (error) {
      console.error('❌ Error verificando expiración:', error);
      return false;
    }
  }, []);

  const calcularExpiracion = useCallback((fechaMercado) => {
    if (!fechaMercado) return 'Fecha no disponible';
    
    try {
      const fechaMercadoObj = new Date(fechaMercado);
      const expiracion = new Date(fechaMercadoObj.getTime() + (24 * 60 * 60 * 1000));
      
      const opciones = { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      };
      return expiracion.toLocaleDateString('es-ES', opciones);
    } catch (error) {
      console.error('❌ Error calculando expiración:', error);
      return 'Fecha inválida';
    }
  }, []);

  const ficharJugadorMercado = useCallback(async (equipoId, jugadorId) => {
    try {
      const jugador = mercado.find(j => j.id === jugadorId);
      
      if (!jugador) {
        throw new Error('Jugador no encontrado');
      }
      
      // Verificar si el jugador ya expiró
      if (estaExpirado(jugador.fecha_mercado)) {
        throw new Error('Este jugador ya no está disponible en el mercado');
      }
      
      // Llamar a la API de fichaje
      await ficharJugador(equipoId, jugadorId);
      await cargarMercado(); // Recargar mercado después del fichaje
      
      return jugador;
    } catch (err) {
      console.error('❌ Error fichando jugador:', err);
      throw err;
    }
  }, [mercado, estaExpirado, cargarMercado]);

  const mercadoFiltrado = mercado.filter(jugador => {
    const matchNombre = filtros.nombre === '' || 
                       jugador.nombre.toLowerCase().includes(filtros.nombre.toLowerCase());
    const matchPosicion = filtros.posicion === '' || jugador.posicion === filtros.posicion;
    const matchEquipoReal = filtros.equipoReal === '' || 
                           (jugador.equipo_real_nombre && 
                            jugador.equipo_real_nombre.toLowerCase().includes(filtros.equipoReal.toLowerCase()));
    
    return matchNombre && matchPosicion && matchEquipoReal;
  });

  const actualizarFiltro = useCallback((campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros({
      nombre: '',
      posicion: '',
      equipoReal: ''
    });
  }, []);

  useEffect(() => {
    if (ligaId) {
      console.log('🎯 useEffect useMarket - ligaId:', ligaId);
      cargarMercado();
    }
  }, [ligaId, cargarMercado]); 

  return {
    mercado: mercadoFiltrado,
    mercadoCompleto: mercado,
    loading,
    error,
    filtros,
    cargarMercado,
    ficharJugador: ficharJugadorMercado,
    estaExpirado,
    calcularExpiracion,
    actualizarFiltro,
    limpiarFiltros
  };
};