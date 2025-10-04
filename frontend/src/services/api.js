const API_URL = 'http://127.0.0.1:8000/api';

// Función helper para manejar respuestas
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error en la petición');
  }
  return response.json();
};

// Ligas
export const getLigas = async () => {
  const response = await fetch(`${API_URL}/ligas/`);
  return handleResponse(response);
};

export const getLiga = async (id) => {
  const response = await fetch(`${API_URL}/ligas/${id}/`);
  return handleResponse(response);
};

// Jugadores
export const getJugadores = async (posicion = null) => {
  const url = posicion 
    ? `${API_URL}/jugadores/?posicion=${posicion}`
    : `${API_URL}/jugadores/`;
  const response = await fetch(url);
  return handleResponse(response);
};

// Equipos
export const getEquipos = async () => {
  const response = await fetch(`${API_URL}/equipos/`);
  return handleResponse(response);
};

export const getEquipo = async (id) => {
  const response = await fetch(`${API_URL}/equipos/${id}/`);
  return handleResponse(response);
};

export const ficharJugador = async (equipoId, jugadorId) => {
  const response = await fetch(`${API_URL}/equipos/${equipoId}/fichar_jugador/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jugador_id: jugadorId }),
  });
  return handleResponse(response);
};

export const venderJugador = async (equipoId, jugadorId) => {
  const response = await fetch(`${API_URL}/equipos/${equipoId}/vender_jugador/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jugador_id: jugadorId }),
  });
  return handleResponse(response);
};

// Mercado
export const getMercado = async (ligaId) => {
  const response = await fetch(`${API_URL}/mercado/?liga_id=${ligaId}`);
  return handleResponse(response);
};

// Clasificación
export const getClasificacion = async (ligaId) => {
  const response = await fetch(`${API_URL}/clasificacion/?liga_id=${ligaId}`);
  return handleResponse(response);
};

// Jornadas
export const getJornadas = async () => {
  const response = await fetch(`${API_URL}/jornadas/`);
  return handleResponse(response);
};

export const crearJornada = async (ligaId, numero) => {
  const response = await fetch(`${API_URL}/jornadas/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ liga: ligaId, numero }),
  });
  return handleResponse(response);
};

// Puntuaciones
export const asignarPuntos = async (jornadaId, puntos) => {
  const response = await fetch(`${API_URL}/puntuaciones/asignar_puntos/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jornada_id: jornadaId, puntos }),
  });
  return handleResponse(response);
};