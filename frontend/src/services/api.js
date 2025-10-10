const API_URL = 'http://127.0.0.1:8000/api';

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
  if (!usuario) {
    throw new Error("Usuario no definido");
  }
  
  console.log("👨‍💼 Usuario", usuario.username, "Admin:", usuario.is_superuser || usuario.is_staff);
  
  // Si forzamos recarga, limpiar cualquier cache
  if (forzarRecarga) {
    console.log("🔄 Forzando recarga completa de datos...");
    const cacheKeys = ['datosUsuarioCache', 'equipoCache', 'jugadoresCache'];
    cacheKeys.forEach(key => localStorage.removeItem(key));
  }
  
  try {
    const isAdmin = usuario.is_superuser || usuario.is_staff;
    
    console.log("🔄 Llamando a /datos-iniciales/ para todos los usuarios...");
    
    const timestamp = forzarRecarga ? `?t=${Date.now()}` : '';
    const response = await fetch(`${API_URL}/datos-iniciales/${timestamp}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status} en la petición datos-iniciales`);
    }
    
    const datosBackend = await response.json();
    console.log("✅ Datos iniciales recibidos del backend:", datosBackend);
    
    console.log("🔍 Estructura de respuesta backend:", {
      tieneJugadores: !!datosBackend.jugadores,
      cantidadJugadores: datosBackend.jugadores?.length,
      tieneEquiposReales: !!datosBackend.equipos_reales,
      cantidadEquiposReales: datosBackend.equipos_reales?.length,
      es_admin: datosBackend.es_admin,
      tieneEquipo: !!datosBackend.equipo
    });
    
    if (isAdmin) {
      console.log("🎯 Procesando respuesta para ADMIN");
      
      return {
        usuario,
        es_admin: datosBackend.es_admin || true,
        ligaActual: datosBackend.ligaActual || {
          id: 1,
          nombre: "Liga de Administración", 
          jornada_actual: 1
        },
        jugadores: datosBackend.jugadores || [],
        equipos_reales: datosBackend.equipos_reales || [], // 🆕 CRÍTICO
        equipo: null,
        mercado: [],
        clasificacion: [],
        presupuesto: 0
      };
    } else {
      console.log("👤 Procesando respuesta para USUARIO NORMAL");
      
      // Verificar equipo para usuarios normales
      if (!datosBackend.equipo) {
        console.warn("⚠️ No se encontró equipo en la respuesta");
        throw new Error("No se pudo cargar el equipo del usuario");
      }
      
      // Asegurar liga_id
      const equipoConLiga = {
        ...datosBackend.equipo,
        liga_id: datosBackend.equipo.liga_id || datosBackend.liga_id || 1
      };
      
      console.log("🏆 Equipo con liga_id:", equipoConLiga.liga_id);
      
      return {
        usuario,
        es_admin: datosBackend.es_admin || false,
        ligaActual: {
          id: datosBackend.liga_id || equipoConLiga.liga_id || 1,
          nombre: datosBackend.liga_nombre || datosBackend.ligaActual?.nombre || "Liga Principal",
          jornada_actual: datosBackend.jornada_actual || datosBackend.ligaActual?.jornada_actual || 1
        },
        jugadores: datosBackend.jugadores || [],
        equipos_reales: datosBackend.equipos_reales || [], // 🆕 Para consistencia
        equipo: equipoConLiga,
        mercado: datosBackend.mercado || [],
        clasificacion: datosBackend.clasificacion || [],
        presupuesto: datosBackend.equipo?.presupuesto || 0
      };
    }
    
  } catch (error) {
    console.error("❌ Error cargando datos iniciales:", error);
    
    // Si forzamos recarga y hay error, relanzarlo
    if (forzarRecarga) {
      throw error;
    }
    
    // Fallback en caso de error
    const isAdmin = usuario.is_superuser || usuario.is_staff;
    return {
      usuario,
      es_admin: isAdmin,
      ligaActual: { 
        id: 1, 
        nombre: isAdmin ? "Liga de Administración" : "Liga Principal", 
        jornada_actual: 1 
      },
      jugadores: [],
      equipos_reales: [],
      equipo: null,
      mercado: [],
      clasificacion: [],
      presupuesto: 0
    };
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
  const response = await fetch(`${API_URL}/equipos/${equipoId}/guardar_alineacion/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
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

// ==================== ADMIN - EQUIPOS REALES ====================

export const getEquiposReales = async () => {
  const response = await fetch(`${API_URL}/equipos-reales/`);
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

export const aceptarOferta = async (ofertaId) => {
  const response = await fetch(`${API_URL}/ofertas/${ofertaId}/aceptar/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Error al aceptar la oferta');
  }
  
  return await response.json();
};

export const rechazarOferta = async (ofertaId) => {
  const response = await fetch(`${API_URL}/ofertas/${ofertaId}/rechazar/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Error al rechazar la oferta');
  }
  
  return await response.json();
};

export const ponerJugadorEnVenta = async (equipoId, jugadorId, precioVenta = null) => {
  const response = await fetch(`${API_URL}/equipos/${equipoId}/jugadores/${jugadorId}/poner-en-venta/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      precio_venta: precioVenta 
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al poner jugador en venta');
  }

  return await response.json();
};

export const quitarJugadorDelMercado = async (equipoId, jugadorId) => {
  console.log(`🔄 Retirando del mercado: equipo=${equipoId}, jugador=${jugadorId}`);
  
  // ✅ URL CORREGIDA
  const response = await fetch(`${API_URL}/equipos/${equipoId}/jugadores/${jugadorId}/quitar-del-mercado/`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al retirar jugador del mercado');
  }

  return await response.json();
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

export const getPujasRealizadas = async (equipoId) => {
  try {
    console.log(`🔍 Solicitando pujas realizadas para equipo: ${equipoId}`);
    const response = await fetch(`${API_URL}/equipos/${equipoId}/pujas_realizadas/`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status} al cargar pujas realizadas`);
    }
    
    const data = await response.json();
    console.log('✅ Pujas realizadas cargadas:', data);
    return data;
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