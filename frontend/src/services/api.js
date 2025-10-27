const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// ==================== UTENTICACIÓN ====================

const getAuthHeaders = () => {
  let token = localStorage.getItem('access_token');
  
  // Si no hay token, intenta obtenerlo de diferentes formas
  if (!token) {
    console.warn('⚠️ No se encontró access_token en localStorage');
    
    // Verifica si hay un token en sessionStorage o cookies
    token = sessionStorage.getItem('access_token') || 
            document.cookie.match(/access_token=([^;]+)/)?.[1];
    
    if (token) {
      console.log('✅ Token encontrado en sessionStorage/cookies');
      localStorage.setItem('access_token', token);
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('✅ Token añadido a headers');
  } else {
    console.error('❌ No hay token disponible');
  }

  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error en la petición' }));
    throw new Error(error.error || error.message || 'Error en la petición');
  }
  return response.json();
};

// ==================== AUTENTICACIÓN ====================

export const registerUser = async (userData) => {
  const requestData = {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    password2: userData.password2,
    first_name: userData.first_name,
    last_name: userData.last_name
  };

  console.log('📤 Enviando registro:', requestData);

  const response = await fetch(`${API_URL}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(requestData),
  });
  
  console.log('📥 Respuesta registro:', response.status);
  return handleResponse(response);
};

export const loginUser = async (username, password) => {
  const response = await fetch(`${API_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(response);
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/auth/user/`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleResponse(response);
};

export const logoutUser = async () => {
  const response = await fetch(`${API_URL}/auth/logout/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleResponse(response);
};

export const refreshToken = async () => {
  const response = await fetch(`${API_URL}/auth/refresh/`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(response);
};

// ==================== DATOS INICIALES ====================

export const getMiEquipo = async () => {
  const response = await fetch(`${API_URL}/mi-equipo/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const cargarDatosIniciales = async (usuario, forzarRecarga = false) => {
  console.log("🚀🚀🚀 api.js: INICIANDO cargarDatosIniciales");
  console.log("   👤 Usuario:", usuario?.username);
  console.log("   🆔 User ID:", usuario?.id);
  
  if (!usuario) {
    throw new Error("Usuario no definido");
  }
  
  try {
    console.log("📡 api.js: Haciendo fetch a /datos-iniciales/");
    
    const response = await fetch(`${API_URL}/datos-iniciales/`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    
    console.log("📊 api.js: Response status:", response.status);
    console.log("📊 api.js: Response ok:", response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ api.js: Error response body:", errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const datosBackend = await response.json();
    console.log("✅✅✅ api.js: RESPUESTA CRUDA DEL BACKEND:", datosBackend);
    
    // 🆕 VERIFICACIÓN EXTREMA DE LA RESPUESTA
    console.log("🔍 api.js - Análisis respuesta backend:");
    console.log("   - Tiene 'equipo':", !!datosBackend.equipo);
    console.log("   - Tiene 'jugadores':", !!datosBackend.jugadores);
    console.log("   - Tiene 'es_admin':", datosBackend.es_admin);
    console.log("   - Keys principales:", Object.keys(datosBackend));
    
    if (datosBackend.equipo) {
      console.log("   🏆 Equipo recibido - ID:", datosBackend.equipo.id);
      console.log("   🏆 Equipo recibido - nombre:", datosBackend.equipo.nombre);
    } else {
      console.warn("   ⚠️⚠️⚠️ NO hay equipo en la respuesta del backend");
    }
    
    // Procesamiento normal...
    if (usuario.is_superuser || usuario.is_staff) {
      return {
        usuario: datosBackend.usuario || usuario,
        es_admin: true,
        ligaActual: datosBackend.ligaActual || { id: 1, nombre: "Liga Admin", jornada_actual: 1 },
        jugadores: datosBackend.jugadores || [],
        equipos_reales: datosBackend.equipos_reales || [],
        equipo: null,
        mercado: [],
        clasificacion: [],
        presupuesto: 0
      };
    } else {
      // 🆕 VERIFICACIÓN EXTRA PARA USUARIOS NORMALES
      if (!datosBackend.equipo) {
        console.error("💥💥💥 api.js: USUARIO NORMAL SIN EQUIPO - Esto no debería pasar");
      }
      
      return {
        usuario: datosBackend.usuario || usuario,
        es_admin: false,
        ligaActual: datosBackend.ligaActual || {
          id: datosBackend.liga_id || 1,
          nombre: datosBackend.liga_nombre || "Liga Principal",
          jornada_actual: datosBackend.jornada_actual || 1
        },
        jugadores: datosBackend.jugadores || [],
        equipos_reales: datosBackend.equipos_reales || [],
        equipo: datosBackend.equipo, // 🎯 ESTE ES EL CAMPO CRÍTICO
        mercado: datosBackend.mercado || [],
        clasificacion: datosBackend.clasificacion || [],
        presupuesto: datosBackend.presupuesto || datosBackend.equipo?.presupuesto || 0
      };
    }
    
  } catch (error) {
    console.error("❌❌❌ api.js: ERROR COMPLETO en cargarDatosIniciales:", error);
    throw error;
  }
};

// ==================== LIGAS ====================

export const getLigas = async () => {
  const response = await fetch(`${API_URL}/ligas/`);
  return handleResponse(response);
};

export const getLiga = async (id) => {
  const response = await fetch(`${API_URL}/ligas/${id}/`);
  return handleResponse(response);
};

// ==================== JUGADORES ====================

export const getJugadores = async (posicion = null, equipoId = null) => {
  let url = `${API_URL}/jugadores/`;
  const params = new URLSearchParams();
  
  if (posicion) params.append('posicion', posicion);
  if (equipoId) params.append('equipo', equipoId);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  return handleResponse(response);
};

export const getJugadoresPorEquipo = async (equipoId) => {
  const response = await fetch(`${API_URL}/jugadores/?equipo=${equipoId}`);
  return handleResponse(response);
};

export const getPuntuacionesJugador = async (jugadorId) => {
  try {
    console.log(`🔍 Solicitando puntuaciones del jugador: ${jugadorId}`);
    const response = await fetch(`${API_URL}/jugadores/${jugadorId}/puntuaciones/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    console.log('📨 Respuesta de puntuaciones:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta:', errorText);
      throw new Error(`Error ${response.status} al cargar puntuaciones: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Puntuaciones cargadas:', data);
    return data;
  } catch (error) {
    console.error('❌ Error en getPuntuacionesJugador:', error);
    throw error;
  }
};

export const getJugadorDetalles = async (jugadorId) => {
  const response = await fetch(`${API_URL}/jugadores/${jugadorId}/`);
  return handleResponse(response);
};

// ==================== EQUIPOS ====================

export const getEquipos = async () => {
  const response = await fetch(`${API_URL}/equipos/`);
  return handleResponse(response);
};

export const getEquipo = async (userId) => {
  try {
    console.log(`🔍 [Alternativa] Buscando equipo para usuario: ${userId}`);
    
    const response = await fetch(`${API_URL}/equipos/?usuario=${userId}`, {
      headers: getAuthHeaders()
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error('Error en la petición');
    }
    
    const data = await response.json();
    console.log(`📦 [Alternativa] Equipos encontrados:`, data);
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error obteniendo equipo por usuario:', error);
    throw error;
  }
};

export const getEquipoById = async (equipoId) => {
  try {
    console.log(`🔍 Buscando equipo por ID: ${equipoId}`);
    
    const headers = getAuthHeaders();
    console.log('📤 Headers de autenticación:', headers);
    
    const response = await fetch(`${API_URL}/equipos/${equipoId}/detalle`, {
      headers: headers
    });
    
    console.log('📥 Respuesta del servidor:', response.status, response.statusText);
    
    if (response.status === 404) {
      console.log(`❌ Equipo con ID ${equipoId} no encontrado`);
      return null;
    }
    
    if (response.status === 401) {
      console.log('❌ No autorizado - Token inválido o expirado');
      throw new Error('No autorizado');
    }
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Equipo encontrado por ID:', data);
    return data;
  } catch (error) {
    console.error('Error obteniendo equipo por ID:', error);
    throw error;
  }
};

export const crearEquipo = async (equipoData) => {
  const response = await fetch(`${API_URL}/equipos/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(equipoData),
  });
  return handleResponse(response);
};

// ==================== OPERACIONES DE EQUIPO ====================

export const guardarAlineacion = async (equipoId, jugadoresData) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/equipos/${equipoId}/guardar_alineacion/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ jugadores: jugadoresData })
  });

  if (!response.ok) {
    throw new Error('Error al guardar alineación');
  }

  return response.json();
};

export const intercambiarJugadores = async (equipoId, jugadorOrigenId, jugadorDestinoId) => {
  console.log(`🔍 Llamando API intercambiarJugadores:`);
  console.log(`   Equipo ID: ${equipoId}`);
  console.log(`   Jugador Origen ID: ${jugadorOrigenId}`);
  console.log(`   Jugador Destino ID: ${jugadorDestinoId}`);
  
  const requestBody = { 
    jugador_origen_id: jugadorOrigenId,
    jugador_destino_id: jugadorDestinoId
  };
  
  console.log('📦 Request body:', requestBody);
  
  const response = await fetch(`${API_URL}/equipos/${equipoId}/intercambiar_jugadores/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(requestBody),
  });

  console.log(`📊 Respuesta HTTP: ${response.status}`);
  console.log(`📊 Respuesta OK: ${response.ok}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error response:', errorText);
    
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || 'Error al intercambiar jugadores');
    } catch {
      throw new Error(errorText || 'Error al intercambiar jugadores');
    }
  }

  const result = await response.json();
  console.log('✅ Intercambio exitoso:', result);
  return result;
};

export const actualizarEstadosBanquillo = async (equipoId, estados) => {
  try {
    console.log(`🔄 Sincronizando estados para equipo ${equipoId}:`, estados);
    
    const response = await fetch(`${API_URL}/equipos/${equipoId}/actualizar_estados_banquillo/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ estados })
    });
    
    if (!response.ok) {
      throw new Error('Error sincronizando estados');
    }
    
    const result = await response.json();
    console.log('✅ Estados sincronizados:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sincronizando estados:', error);
    throw error;
  }
};

export const ponerEnVenta = async (equipoId, jugadorId, precio) => {
  console.log(`🔄 Poniendo en venta: equipo=${equipoId}, jugador=${jugadorId}, precio=${precio}`);
  
  // ✅ URL CORREGIDA - usar el endpoint correcto del backend
  const response = await fetch(`${API_URL}/equipos/${equipoId}/jugadores/${jugadorId}/poner_en_venta/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      precio_venta: precio  // ✅ Ahora el body solo necesita el precio_venta
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al poner jugador en el mercado');
  }

  return await response.json();
};

// ==================== MERCADO ====================

export const getMercado = async (ligaId) => {
  console.log('🔐 Token en localStorage:', localStorage.getItem('access_token'));
  console.log('🔍 Llamando a:', `${API_URL}/mercado/?liga_id=${ligaId}`);
  
  const headers = getAuthHeaders();
  console.log('📤 Headers enviados:', headers);
  
  const response = await fetch(`${API_URL}/mercado/?liga_id=${ligaId}`, {
    headers: headers
  });
  
  console.log('📥 Status response:', response.status);
  console.log('📥 Response ok:', response.ok);
  
  return handleResponse(response);
};

// ==================== CLASIFICACIÓN ====================

export const getClasificacion = async (ligaId) => {
  try {
    console.log(`🏆 Obteniendo clasificación para liga_id: ${ligaId}`);
    const response = await fetch(`${API_URL}/clasificacion/?liga_id=${ligaId}`);
    
    if (!response.ok) {
      console.error(`❌ Error HTTP ${response.status} obteniendo clasificación`);
      throw new Error(`Error obteniendo clasificación: ${response.status}`);
    }
    
    const clasificacion = await response.json();
    console.log(`✅ Clasificación obtenida: ${clasificacion.length} equipos`);
    return clasificacion;
  } catch (error) {
    console.error('❌ Error en getClasificacion:', error);
    throw error;
  }
};

export const getPlantillaEquipo = async (equipoId) => {
  try {
    console.log(`🔍 Solicitando plantilla del equipo: ${equipoId}`);
    
    const response = await fetch(`${API_URL}/equipos/${equipoId}/plantilla/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    console.log('📨 Respuesta de plantilla:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta:', errorText);
      throw new Error(`Error ${response.status} al cargar plantilla: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Plantilla cargada:', data);
    return data;
  } catch (error) {
    console.error('❌ Error en getPlantillaEquipo:', error);
    throw error;
  }
};

// ==================== JORNADAS Y PARTIDOS ====================

export const getJornadas = async () => {
  const response = await fetch(`${API_URL}/jornadas/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const getPartidosJornada = async (jornadaId) => {
  const response = await fetch(`${API_URL}/jornadas/${jornadaId}/partidos/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const crearJornada = async (numero) => {
  const response = await fetch(`${API_URL}/jornadas/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ numero }),
  });
  return handleResponse(response);
};

// ==================== EQUIPOS REALES ====================

export const getEquiposReales = async () => {
  const response = await fetch(`${API_URL}/equipos-reales/`);
  return handleResponse(response);
};

export const getJugadoresPorEquipoReal = async (equipoId) => {
  const response = await fetch(`${API_URL}/equipos-reales/${equipoId}/plantilla/`);
  return handleResponse(response);
};

export const getClasificacionEquiposReales = async () => {
  const response = await fetch(`${API_URL}/clasificacion-equipos-reales/`);
  return handleResponse(response);
};

export const getGoleadores = async () => {
  const response = await fetch(`${API_URL}/goleadores/`);
  return handleResponse(response);
};

// ==================== ADMIN - EQUIPOS DISPONIBLES ====================

export const getEquiposDisponiblesJornada = async (jornadaId) => {
  const response = await fetch(`${API_URL}/jornadas/${jornadaId}/equipos-disponibles/`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error cargando equipos disponibles:', errorText);
    throw new Error('Error al cargar equipos disponibles para la jornada');
  }
  
  return await response.json();
};

// ==================== ADMIN - PARTIDOS ====================

export const crearPartido = async (partidoData) => {
  const response = await fetch(`${API_URL}/partidos/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(partidoData),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error creando partido:', errorText);
    throw new Error('Error al crear el partido');
  }
  
  return await response.json();
};

export const eliminarPartido = async (partidoId) => {
  const response = await fetch(`${API_URL}/partidos/${partidoId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error eliminando partido:', errorText);
    throw new Error('Error al eliminar el partido');
  }
  
  if (response.status === 204) {
    return { message: 'Partido eliminado correctamente' };
  }
  
  return await response.json();
};

export const actualizarResultadoPartido = async (partidoId, resultadoData) => {
  // 🆕 USAR PATCH EN EL ENDPOINT ESTÁNDAR
  const response = await fetch(`${API_URL}/partidos/${partidoId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(resultadoData),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error actualizando resultado:', errorText);
    throw new Error('Error al actualizar el resultado del partido');
  }
  
  return await response.json();
};

// ==================== PUNTUACIONES ====================

export const asignarPuntos = async (jornadaId, puntos) => {
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
};

export const getPuntuacionesPartido = async (partidoId) => {
  try {
    console.log(`🔍 Solicitando puntuaciones del partido: ${partidoId}`);
    const response = await fetch(`${API_URL}/partidos/${partidoId}/puntuaciones/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Puntuaciones del partido cargadas:', data);
    return data;
  } catch (error) {
    console.error('❌ Error en getPuntuacionesPartido:', error);
    throw error;
  }
};

// ==================== SISTEMA DE SUBASTAS ====================

export const pujarJugador = async (equipoId, jugadorId, montoPuja) => {
  const response = await fetch(`${API_URL}/equipos/${equipoId}/pujar_jugador/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      jugador_id: jugadorId, 
      monto_puja: montoPuja 
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al realizar la puja');
  }

  return await response.json();
};

export const getOfertasRecibidas = async (equipoId) => {
  try {
    console.log(`🔍 Solicitando ofertas recibidas para equipo: ${equipoId}`);
    const response = await fetch(`${API_URL}/equipos/${equipoId}/ofertas_recibidas/`, {
      headers: getAuthHeaders(),
    });
    
    console.log('📨 Respuesta de ofertas recibidas:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta:', errorText);
      throw new Error(`Error ${response.status} al cargar ofertas recibidas: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Ofertas recibidas cargadas:', data);
    return data;
  } catch (error) {
    console.error('❌ Error en getOfertasRecibidas:', error);
    throw error;
  }
};

export const getOfertasRealizadas = async (equipoId) => {
  const response = await fetch(`${API_URL}/equipos/${equipoId}/ofertas_realizadas/`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Error al cargar ofertas realizadas');
  }
  
  return await response.json();
};

export const rechazarOferta = async (ofertaId) => {
  console.log(`🔄 [API] Rechazando oferta ID: ${ofertaId}`);
  
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/ofertas/${ofertaId}/rechazar/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 [API] Status rechazar oferta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error response rechazar oferta:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Error ${response.status}: ${errorText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('✅ [API] Oferta rechazada exitosamente:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [API] Error en rechazarOferta:', error);
    throw error;
  }
};

export const aceptarOferta = async (ofertaId) => {
  console.log(`🔄 [API] Aceptando oferta ID: ${ofertaId}`);
  
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/ofertas/${ofertaId}/aceptar/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 [API] Status aceptar oferta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error response aceptar oferta:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Error ${response.status}: ${errorText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('✅ [API] Oferta aceptada exitosamente:', result);
    
    // 🆕 Disparar evento con detalles del jugador vendido para la animación
    window.dispatchEvent(new CustomEvent('ofertaAceptadaConExito', {
      detail: {
        jugadorVendido: result.jugador_vendido || { nombre: 'Jugador' }
      }
    }));
    
    // Disparar eventos de actualización
    window.dispatchEvent(new CustomEvent('mercadoShouldUpdate'));
    window.dispatchEvent(new CustomEvent('jugadorVendido'));
    window.dispatchEvent(new CustomEvent('ofertaAceptada'));
    
    return result;
    
  } catch (error) {
    console.error('❌ [API] Error en aceptarOferta:', error);
    throw error;
  }
};

export const retirarOferta = async (ofertaId) => {
  const response = await fetch(`${API_URL}/ofertas/${ofertaId}/retirar/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al retirar oferta');
  }
  
  return await response.json();
};

export const editarPuja = async (pujaId, nuevoMonto) => {
  console.log(`🔄 [API] Editando puja ID: ${pujaId} con monto: ${nuevoMonto}`);
  
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/pujas/${pujaId}/editar/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nuevo_monto: nuevoMonto }),
    });

    console.log(`📊 [API] Status editar puja: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error response editar puja:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Error ${response.status}: ${errorText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('✅ [API] Puja editada exitosamente:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [API] Error en editarPuja:', error);
    throw error;
  }
};

export const editarOferta = async (ofertaId, nuevoMonto) => {
  console.log(`🔄 [API] Editando oferta ID: ${ofertaId} con monto: ${nuevoMonto}`);
  
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/ofertas/${ofertaId}/editar/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nuevo_monto: nuevoMonto }),
    });

    console.log(`📊 [API] Status editar oferta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error response editar oferta:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Error ${response.status}: ${errorText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('✅ [API] Oferta editada exitosamente:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [API] Error en editarOferta:', error);
    throw error;
  }
};

export const ponerJugadorEnVenta = async (equipoId, jugadorId, precioVenta = null) => {
  console.log(`🔄 [API] Poniendo jugador ${jugadorId} en venta del equipo ${equipoId} con precio ${precioVenta}`);
  
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/equipos/${equipoId}/jugadores/${jugadorId}/poner-en-venta/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        precio_venta: precioVenta 
      }),
    });

    console.log(`📊 [API] Status poner en venta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error response poner en venta:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Error ${response.status}: ${errorText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('✅ [API] Jugador puesto en venta exitosamente:', result);
    
    // 🆕 Disparar eventos de actualización para actualizar la UI automáticamente
    window.dispatchEvent(new CustomEvent('mercadoShouldUpdate'));
    window.dispatchEvent(new CustomEvent('jugadorPuestoEnVenta', {
      detail: {
        jugadorId: jugadorId,
        equipoId: equipoId,
        precioVenta: precioVenta
      }
    }));
    window.dispatchEvent(new CustomEvent('dashboardShouldUpdate'));
    
    return result;
    
  } catch (error) {
    console.error('❌ [API] Error en ponerEnVenta:', error);
    throw error;
  }
};

export const rechazarOfertasPorJugador = async (equipoId, jugadorId) => {
  console.log(`🔄 [API] Rechazando ofertas pendientes para jugador ID: ${jugadorId}`);
  
  try {
    const token = localStorage.getItem('access_token');
    
    // Primero obtenemos las ofertas recibidas
    const responseOfertas = await fetch(`${API_URL}/equipos/${equipoId}/ofertas_recibidas/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!responseOfertas.ok) {
      throw new Error('Error al obtener ofertas recibidas');
    }

    const ofertasRecibidas = await responseOfertas.json();
    
    // Filtramos las ofertas pendientes para este jugador
    const ofertasPendientes = ofertasRecibidas.filter(oferta => 
      oferta.jugador_id === jugadorId && oferta.estado === 'pendiente'
    );

    console.log(`📊 [API] Encontradas ${ofertasPendientes.length} ofertas pendientes para el jugador`);

    // Rechazamos cada oferta pendiente
    for (const oferta of ofertasPendientes) {
      try {
        await rechazarOferta(oferta.id);
        console.log(`✅ [API] Oferta ${oferta.id} rechazada automáticamente`);
      } catch (error) {
        console.error(`❌ [API] Error rechazando oferta ${oferta.id}:`, error);
      }
    }

    return {
      mensaje: `Se rechazaron ${ofertasPendientes.length} ofertas pendientes automáticamente`,
      ofertasRechazadas: ofertasPendientes.length
    };
    
  } catch (error) {
    console.error('❌ [API] Error en rechazarOfertasPorJugador:', error);
    throw error;
  }
};

export const quitarJugadorDelMercado = async (equipoId, jugadorId) => {
  console.log(`🔄 [API] Quitando jugador ${jugadorId} del mercado del equipo ${equipoId}`);
  
  try {
    const token = localStorage.getItem('access_token');
    
    // 🆕 Primero rechazamos las ofertas pendientes
    await rechazarOfertasPorJugador(equipoId, jugadorId);

    // Luego quitamos el jugador del mercado
    const response = await fetch(`${API_URL}/equipos/${equipoId}/jugadores/${jugadorId}/quitar_del_mercado/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📊 [API] Status quitar del mercado: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error response quitar del mercado:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Error ${response.status}: ${errorText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('✅ [API] Jugador quitado del mercado exitosamente:', result);
    
    // Disparar eventos de actualización
    window.dispatchEvent(new CustomEvent('mercadoShouldUpdate'));
    window.dispatchEvent(new CustomEvent('jugadorQuitadoDelMercado'));
    
    return result;
    
  } catch (error) {
    console.error('❌ [API] Error en quitarJugadorDelMercado:', error);
    throw error;
  }
};

export const realizarPuja = async (equipoId, jugadorId, montoPuja) => {
  console.log(`🎯 Realizando puja:`, {
    equipoId,
    jugadorId, 
    montoPuja
  });

  try {
    const response = await fetch(`${API_URL}/equipos/${equipoId}/pujar_jugador/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        jugador_id: jugadorId,
        monto_puja: montoPuja
      }),
    });

    console.log(`📊 Status response: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Error ${response.status}: ${errorText}`);
      } catch {
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('✅ Puja exitosa:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error en realizarPuja:', error);
    throw error;
  }
};

export const moverJugadorAlineacion = async (equipoId, jugadorId, posicion, index = 0) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/equipos/${equipoId}/mover_a_alineacion/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      jugador_id: jugadorId,
      posicion: posicion,
      index: index
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al mover jugador a la alineación');
  }

  return response.json();
};

export const getPujasRealizadas = async (equipoId) => {
  try {
    console.log(`📨 Cargando pujas realizadas para equipo ${equipoId}...`);
    
    const response = await fetch(`${API_URL}/equipos/${equipoId}/pujas_realizadas/`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status} al cargar pujas realizadas`);
    }
    
    const data = await response.json();
    console.log('✅ Pujas realizadas cargadas:', data);
    
    // Asegurar que cada puja tenga el campo activa
    const pujasConActiva = data.map(puja => ({
      ...puja,
      activa: puja.activa !== undefined ? puja.activa : true
    }));
    
    return pujasConActiva;
    
  } catch (error) {
    console.error('❌ Error en getPujasRealizadas:', error);
    throw error;
  }
};

export const retirarPuja = async (pujaId) => {
  const response = await fetch(`${API_URL}/pujas/${pujaId}/retirar/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al retirar puja');
  }
  
  return await response.json();
};

export const crearOfertaDirecta = async (jugadorId, monto) => {
  try {
    console.log(`💰 Creando oferta directa: jugador ${jugadorId}, monto ${monto}`);
    
    const response = await fetch(`${API_URL}/ofertas-directas/crear/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        jugador_id: jugadorId,
        monto: parseInt(monto)
      }),
    });
    
    console.log('📨 Respuesta oferta directa:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en respuesta:', errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Oferta directa creada:', data);
    return data;
  } catch (error) {
    console.error('❌ Error en crearOfertaDirecta:', error);
    throw error;
  }
};

export const getNotificaciones = async () => {
  const response = await fetch(`${API_URL}/notificaciones/mis_notificaciones/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener notificaciones');
  return await response.json();
};

export const obtenerNotificaciones = async () => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/notificaciones/usuario/`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al cargar notificaciones');
  }
  
  return response.json();
};

export const contarNotificacionesNoLeidas = async () => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/notificaciones/contar-no-leidas/`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al cargar contador de notificaciones');
  }
  
  return response.json();
};

export const marcarTodasNotificacionesLeidas = async () => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/notificaciones/marcar-todas-leidas/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al marcar notificaciones como leídas');
  }
  
  return response.json();
};

export const marcarNotificacionLeida = async (notificacionId) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/notificaciones/${notificacionId}/marcar-leida/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al marcar notificación como leída');
  }
  
  return response.json();
};

export const getTransacciones = async () => {
  const response = await fetch(`${API_URL}/transacciones/mis_transacciones/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Error al obtener transacciones');
  return await response.json();
};