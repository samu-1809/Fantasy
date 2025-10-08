import { useState, useEffect } from 'react';

export const useAdmin = () => {
  const [jornadas, setJornadas] = useState([]);
  const [equiposReales, setEquiposReales] = useState([]);
  const [partidos, setPartidos] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = 'http://127.0.0.1:8000/api';

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

  useEffect(() => {
    cargarJornadas();
    cargarEquiposReales();
  }, []);

  return {
    jornadas,
    equiposReales,
    partidos,
    loading,
    error,
    cargarJornadas,
    cargarEquiposReales,
    cargarPartidosJornada,
    crearJornada,
    eliminarJornada,
    crearPartido,
    actualizarResultadoPartido,
    eliminarPartido
  };
};