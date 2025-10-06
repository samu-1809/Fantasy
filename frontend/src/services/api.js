const API_URL = 'http://127.0.0.1:8000/api';

// Función helper para obtener headers con autenticación
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Función helper para manejar respuestas
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    throw new Error(error.error || error.message || 'Error en la petición');
  }
  return response.json();
};

// ==================== AUTENTICACIÓN ====================

export const registerUser = async (username, email, password) => {
  const response = await fetch(`${API_URL}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return handleResponse(response);
};

export const loginUser = async (username, password) => {
  const response = await fetch(`${API_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(response);
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/current-user/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
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
    headers: getAuthHeaders(),
    body: JSON.stringify({ jugador_id: jugadorId }),
  });
  return handleResponse(response);
};

export const venderJugador = async (equipoId, jugadorId) => {
  const response = await fetch(`${API_URL}/equipos/${equipoId}/vender_jugador/`, {
    method: 'POST',
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
    body: JSON.stringify({ liga: ligaId, numero }),
  });
  return handleResponse(response);
};

// Puntuaciones
export const asignarPuntos = async (jornadaId, puntos) => {
  const response = await fetch(`${API_URL}/puntuaciones/asignar_puntos/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ jornada_id: jornadaId, puntos }),
  });
  return handleResponse(response);
};