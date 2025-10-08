import { useState, useEffect } from 'react';
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

  const API_URL = 'http://127.0.0.1:8000/api';

  // Cargar mercado
  const cargarMercado = async () => {
    if (!ligaId) {
      setError('No se pudo cargar la información de la liga');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/mercado/?liga_id=${ligaId}`);
      
      if (response.ok) {
        const data = await response.json();
        setMercado(data);
      } else {
        throw new Error('Error cargando mercado');
      }
    } catch (err) {
      setError('Error cargando el mercado de jugadores');
      setMercado([]);
    } finally {
      setLoading(false);
    }
  };

  // Verificar si un jugador ha expirado
  const estaExpirado = (fechaMercado) => {
    if (!fechaMercado) return false;
    
    const fechaMercadoObj = new Date(fechaMercado);
    const expiracion = new Date(fechaMercadoObj.getTime() + (24 * 60 * 60 * 1000));
    const ahora = new Date();
    
    return ahora >= expiracion;
  };

  // Calcular fecha de expiración formateada
  const calcularExpiracion = (fechaMercado) => {
    if (!fechaMercado) return 'Fecha no disponible';
    
    const fechaMercadoObj = new Date(fechaMercado);
    const expiracion = new Date(fechaMercadoObj.getTime() + (24 * 60 * 60 * 1000));
    
    const opciones = { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return expiracion.toLocaleDateString('es-ES', opciones);
  };

  // Fichar jugador
  const ficharJugadorMercado = async (equipoId, jugadorId) => {
    try {
      const jugador = mercado.find(j => j.id === jugadorId);
      
      if (!jugador) {
        throw new Error('Jugador no encontrado');
      }
      
      // Verificar si el jugador ya expiró
      if (estaExpirado(jugador.fecha_mercado)) {
        throw new Error('Este jugador ya no está disponible en el mercado');
      }
      
      // SIEMPRE va al banquillo
      const vaAlBanquillo = true;
      
      await ficharJugador(equipoId, jugadorId, vaAlBanquillo);
      await cargarMercado(); // Recargar mercado después del fichaje
      
      return jugador;
    } catch (err) {
      console.error('Error fichando jugador:', err);
      throw err;
    }
  };

  // Aplicar filtros al mercado
  const mercadoFiltrado = mercado.filter(jugador => {
    const matchNombre = jugador.nombre.toLowerCase().includes(filtros.nombre.toLowerCase());
    const matchPosicion = filtros.posicion === '' || jugador.posicion === filtros.posicion;
    const matchEquipoReal = filtros.equipoReal === '' || 
                           (jugador.equipo_real_nombre && jugador.equipo_real_nombre.includes(filtros.equipoReal));
    
    return matchNombre && matchPosicion && matchEquipoReal;
  });

  // Actualizar filtros
  const actualizarFiltro = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltros({
      nombre: '',
      posicion: '',
      equipoReal: ''
    });
  };

  useEffect(() => {
    cargarMercado();
  }, [ligaId]);

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