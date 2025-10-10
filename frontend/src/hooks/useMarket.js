import { useState, useEffect, useCallback } from 'react';
import { 
  getMercado, 
  pujarJugador, 
  getOfertasRecibidas, 
  getOfertasRealizadas, 
  getPujasRealizadas,
  retirarPuja 
} from '../services/api';

export const useMarket = (ligaId) => {
  const [mercado, setMercado] = useState([]);
  const [ofertasRecibidas, setOfertasRecibidas] = useState([]);
  const [ofertasRealizadas, setOfertasRealizadas] = useState([]);
  const [pujasRealizadas, setPujasRealizadas] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    nombre: '',
    posicion: ''
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

  const cargarOfertasRecibidas = useCallback(async (equipoId) => {
  if (!equipoId) {
    console.warn('⚠️ useMarket: No hay equipoId para cargar ofertas recibidas');
    setOfertasRecibidas([]);
    return;
  }
  
  try {
    console.log(`🔄 useMarket: Cargando ofertas recibidas para equipo ${equipoId}`);
    const ofertas = await getOfertasRecibidas(equipoId);
    console.log(`✅ useMarket: Ofertas cargadas - ${ofertas.length} elementos`, ofertas);
    setOfertasRecibidas(ofertas);
  } catch (err) {
    console.error('❌ useMarket: Error cargando ofertas recibidas:', err);
    // Mostrar el error específico de la API si está disponible
    if (err.response) {
      console.error('❌ Detalles del error:', err.response.data);
    }
    setOfertasRecibidas([]);
  }
}, []);

  const cargarOfertasRealizadas = useCallback(async (equipoId) => {
    if (!equipoId) return;
    
    try {
      const ofertas = await getOfertasRealizadas(equipoId);
      setOfertasRealizadas(ofertas);
      console.log(`✅ ${ofertas.length} ofertas realizadas cargadas`);
    } catch (err) {
      console.error('❌ Error cargando ofertas realizadas:', err);
    }
  }, []);

  const cargarPujasRealizadas = useCallback(async (equipoId) => {
    if (!equipoId) return;
    
    try {
      const pujas = await getPujasRealizadas(equipoId);
      setPujasRealizadas(pujas);
      console.log(`✅ ${pujas.length} pujas realizadas cargadas`);
    } catch (err) {
      console.error('❌ Error cargando pujas realizadas:', err);
    }
  }, []);

  const realizarPuja = async (equipoId, jugadorId, montoPuja) => {
    try {
      const resultado = await pujarJugador(equipoId, jugadorId, montoPuja);
      await cargarMercado(); // Recargar mercado para actualizar la puja máxima
      return resultado;
    } catch (err) {
      throw err;
    }
  };

  const retirarPujaHook = async (pujaId) => {
    try {
      const resultado = await retirarPuja(pujaId);
      return resultado;
    } catch (err) {
      throw err;
    }
  };

  const actualizarFiltro = useCallback((campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros({
      nombre: '',
      posicion: ''
    });
  }, []);

  const estaExpirado = useCallback((fechaMercado) => {
    if (!fechaMercado) return true; // Si no hay fecha, considerar expirado
    
    try {
      const fechaMercadoObj = new Date(fechaMercado);
      const expiracion = new Date(fechaMercadoObj.getTime() + (24 * 60 * 60 * 1000)); // 1 día
      const ahora = new Date();
      
      return ahora >= expiracion;
    } catch (error) {
      console.error('❌ Error verificando expiración:', error);
      return true; // En caso de error, considerar expirado
    }
  }, []);

  const calcularExpiracion = useCallback((fechaMercado) => {
    if (!fechaMercado) return 'Fecha no disponible';
    
    try {
      const fechaMercadoObj = new Date(fechaMercado);
      const expiracion = new Date(fechaMercadoObj.getTime() + (24 * 60 * 60 * 1000)); // 1 día
      
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

  const mercadoFiltrado = mercado.filter(jugador => {
    const matchNombre = filtros.nombre === '' || 
                       jugador.nombre.toLowerCase().includes(filtros.nombre.toLowerCase());
    const matchPosicion = filtros.posicion === '' || jugador.posicion === filtros.posicion;
    
    return matchNombre && matchPosicion;
  });

  useEffect(() => {
    if (ligaId) {
      console.log('🎯 useEffect useMarket - ligaId:', ligaId);
      cargarMercado();
    }
  }, [ligaId, cargarMercado]);

  return {
    mercado: mercadoFiltrado,
    mercadoCompleto: mercado,
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
    retirarPuja: retirarPujaHook,
    actualizarFiltro,
    limpiarFiltros,
    estaExpirado,
    calcularExpiracion
  };
};