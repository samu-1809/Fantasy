import { useState, useEffect } from 'react';

export const useAdmin = () => {
  const [jornadas, setJornadas] = useState([]);
  const [equiposReales, setEquiposReales] = useState([]);
  const [partidos, setPartidos] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState(null);

  const API_URL = 'http://127.0.0.1:8000/api';

  // 🆕 Efecto para seleccionar automáticamente la primera jornada
  useEffect(() => {
    if (jornadas.length > 0 && !jornadaSeleccionada) {
      setJornadaSeleccionada(jornadas[0].id);
    }
  }, [jornadas, jornadaSeleccionada]);

  // ==================== FUNCIONES BÁSICAS ====================

  // Cargar jornadas
  const cargarJornadas = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/jornadas/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJornadas(data);
      } else {
        throw new Error('Error cargando jornadas');
      }
    } catch (err) {
      setError('Error cargando jornadas: ' + err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar equipos reales
  const cargarEquiposReales = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/equipos-reales/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEquiposReales(data);
      } else {
        throw new Error('Error cargando equipos reales');
      }
    } catch (err) {
      console.error('Error cargando equipos reales:', err);
    }
  };

  // Cargar partidos de una jornada
  const cargarPartidosJornada = async (jornadaId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/jornadas/${jornadaId}/partidos/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPartidos(prev => ({
          ...prev,
          [jornadaId]: data
        }));
        return data;
      } else {
        throw new Error('Error cargando partidos');
      }
    } catch (err) {
      console.error('Error cargando partidos:', err);
      setPartidos(prev => ({
        ...prev,
        [jornadaId]: []
      }));
      return [];
    }
  };

  // ==================== GESTIÓN DE JORNADAS ====================

  // Crear nueva jornada
  const crearJornada = async (numeroJornada) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/jornadas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          numero: parseInt(numeroJornada)
        }),
      });
      
      if (response.ok) {
        await cargarJornadas();
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
    } catch (err) {
      console.error('Error creando jornada:', err);
      throw err;
    }
  };

  // Eliminar jornada
  const eliminarJornada = async (jornadaId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/jornadas/${jornadaId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await cargarJornadas();
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar jornada');
      }
    } catch (err) {
      console.error('Error eliminando jornada:', err);
      throw err;
    }
  };

  // ==================== GESTIÓN DE PARTIDOS ====================

  // Crear partido
  const crearPartido = async (jornadaId, equipoLocalId, equipoVisitanteId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/partidos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jornada: jornadaId,
          equipo_local: parseInt(equipoLocalId),
          equipo_visitante: parseInt(equipoVisitanteId),
          fecha: new Date().toISOString(),
          goles_local: 0,
          goles_visitante: 0
        }),
      });
      
      if (response.ok) {
        await cargarPartidosJornada(jornadaId);
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear partido');
      }
    } catch (err) {
      console.error('Error creando partido:', err);
      throw err;
    }
  };

  // Actualizar resultado de partido
  const actualizarResultadoPartido = async (partidoId, golesLocal, golesVisitante) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/partidos/${partidoId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goles_local: golesLocal,
          goles_visitante: golesVisitante
        }),
      });
      
      return response.ok;
    } catch (err) {
      console.error('Error actualizando resultado:', err);
      throw err;
    }
  };

  // Eliminar partido
  const eliminarPartido = async (partidoId, jornadaId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/partidos/${partidoId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await cargarPartidosJornada(jornadaId);
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar partido');
      }
    } catch (err) {
      console.error('Error eliminando partido:', err);
      throw err;
    }
  };

  // ==================== GESTIÓN DE PUNTUACIONES ====================

  // Cargar puntuaciones de una jornada (masivas)
  const cargarPuntuacionesJornada = async (jornadaId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/puntuaciones/?jornada=${jornadaId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Error cargando puntuaciones');
      }
    } catch (err) {
      console.error('Error cargando puntuaciones:', err);
      return [];
    }
  };

  // 🆕 Asignar puntos masivamente (función existente)
  const asignarPuntos = async (jornadaId, puntos) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/puntuaciones/asignar_puntos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jornada_id: jornadaId,
          puntos: puntos
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al asignar puntos');
      }

      return response.json();
    } catch (err) {
      console.error('Error asignando puntos:', err);
      throw err;
    }
  };

  // 🆕 Cargar puntuaciones de un jugador específico
  const cargarPuntuacionesJugador = async (jugadorId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/jugadores/${jugadorId}/puntuaciones/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error cargando puntuaciones del jugador:', error);
      throw error;
    }
  };

  // 🆕 Actualizar puntuación individual
  const actualizarPuntuacionJugador = async (jugadorId, jornadaId, puntos) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/puntuaciones/actualizar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jugador_id: jugadorId,
          jornada_id: jornadaId,
          puntos: puntos
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error actualizando puntuación:', error);
      throw error;
    }
  };

  // 🆕 Crear nueva puntuación
  const crearPuntuacionJugador = async (jugadorId, jornadaId, puntos = 0) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/puntuaciones/crear/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jugador_id: jugadorId,
          jornada_id: jornadaId,
          puntos: puntos
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creando puntuación:', error);
      throw error;
    }
  };

  // 🆕 Eliminar puntuación
  const eliminarPuntuacionJugador = async (puntuacionId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/puntuaciones/${puntuacionId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error eliminando puntuación:', error);
      throw error;
    }
  };

  // ==================== EFECTOS INICIALES ====================

  useEffect(() => {
    cargarJornadas();
    cargarEquiposReales();
  }, []);

  // ==================== RETORNO DEL HOOK ====================

  return {
    // Estados
    jornadas,
    equiposReales,
    partidos,
    jornadaSeleccionada, 
    setJornadaSeleccionada, 
    loading,
    error,
    
    // Funciones básicas
    cargarJornadas,
    cargarEquiposReales,
    cargarPartidosJornada,
    
    // Gestión de jornadas
    crearJornada,
    eliminarJornada,
    
    // Gestión de partidos
    crearPartido,
    actualizarResultadoPartido,
    eliminarPartido,
    
    // Gestión de puntuaciones
    cargarPuntuacionesJornada,
    asignarPuntos,
    cargarPuntuacionesJugador,
    actualizarPuntuacionJugador,
    crearPuntuacionJugador,
    eliminarPuntuacionJugador
  };
};