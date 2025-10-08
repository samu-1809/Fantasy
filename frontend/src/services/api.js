const API_URL = 'http://127.0.0.1:8000/api';

// ==================== UTILIDADES ====================

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

export const cargarDatosIniciales = async (usuario) => {
  if (!usuario) {
    throw new Error("Usuario no definido");
  }
  
  console.log("👨‍💼 Usuario", usuario.username, "Admin:", usuario.is_superuser || usuario.is_staff);
  
  try {
    const isAdmin = usuario.is_superuser || usuario.is_staff;
    
    if (isAdmin) {
      console.log("🎯 Usuario es administrador, cargando datos básicos...");
      
      return {
        usuario,
        ligaActual: {
          id: 1,
          nombre: "Liga Principal", 
          jornada_actual: 1
        },
        jugadores: [],
        equipo: null,
        mercado: [],
        clasificacion: [],
        presupuesto: 0
      };
    } else {
      console.log("Usuario normal, usando endpoint datos-iniciales...");
      
      try {
        console.log("🔄 Llamando a /datos-iniciales/...");
        const response = await fetch(`${API_URL}/datos-iniciales/`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Error en la petición datos-iniciales');
        }
        
        const datos = await response.json();
        console.log("✅ Datos iniciales recibidos:", datos);
        
        if (!datos.equipo) {
          console.warn("⚠️ No se encontró equipo en la respuesta");
          throw new Error("No se pudo cargar el equipo del usuario");
        }
        
        return {
          usuario,
          ligaActual: {
            id: datos.liga_id || 1,
            nombre: "Liga Principal",
            jornada_actual: 1
          },
          jugadores: datos.jugadores || [],
          equipo: datos.equipo,
          mercado: datos.mercado || [],
          clasificacion: datos.clasificacion || [],
          presupuesto: datos.equipo.presupuesto || 0
        };
        
      } catch (error) {
        console.error("❌ Error con endpoint datos-iniciales:", error);
        return await cargarDatosManual(usuario);
      }
    }
  } catch (error) {
    console.error("❌ Error cargando datos iniciales:", error);
    return {
      usuario,
      ligaActual: { id: 1, nombre: "Liga Principal", jornada_actual: 1 },
      jugadores: [],
      equipo: null,
      mercado: [],
      clasificacion: [],
      presupuesto: 0
    };
  }
};

// 🆕 FUNCIÓN DE FALLBACK PARA CARGA MANUAL
const cargarDatosManual = async (usuario) => {
  try {
    console.log("🔍 Iniciando carga manual de datos...");
    
    let equipoData = null;
    try {
      console.log("🔄 Obteniendo equipo con /mi-equipo/...");
      equipoData = await getMiEquipo();
      console.log("✅ Equipo obtenido:", equipoData ? "SÍ" : "NO");
    } catch (error) {
      console.error("❌ Error obteniendo equipo:", error);
    }
    
    if (!equipoData) {
      try {
        console.log("🔄 Buscando equipo por usuario ID...");
        equipoData = await getEquipo(usuario.id);
        console.log("✅ Equipo por usuario:", equipoData ? "SÍ" : "NO");
      } catch (error) {
        console.error("❌ Error buscando equipo por usuario:", error);
      }
    }
    
    if (!equipoData) {
      console.log("⚠️ No se encontró equipo, usando valores por defecto");
      equipoData = {
        id: null,
        nombre: "Mi Equipo",
        presupuesto: 50000000,
        jugadores: [],
        liga: 1
      };
    }
    
    let jugadoresDelEquipo = [];
    if (equipoData.id) {
      try {
        console.log("🔄 Cargando jugadores del equipo...");
        jugadoresDelEquipo = await getJugadoresPorEquipo(equipoData.id);
        console.log(`✅ ${jugadoresDelEquipo.length} jugadores cargados`);
      } catch (error) {
        console.error("❌ Error cargando jugadores:", error);
      }
    }
    
    let mercadoData = [];
    let clasificacionData = [];
    
    try {
      console.log("🔄 Cargando mercado...");
      const ligaId = equipoData.liga || 1;
      mercadoData = await getMercado(ligaId);
      clasificacionData = await getClasificacion(ligaId);
      console.log(`✅ ${mercadoData.length} jugadores en mercado, ${clasificacionData.length} equipos en clasificación`);
    } catch (error) {
      console.error("❌ Error cargando datos adicionales:", error);
    }
    
    return {
      usuario,
      ligaActual: {
        id: equipoData.liga || 1,
        nombre: "Liga Principal",
        jornada_actual: 1
      },
      jugadores: jugadoresDelEquipo,
      equipo: equipoData,
      mercado: mercadoData,
      clasificacion: clasificacionData,
      presupuesto: equipoData.presupuesto || 50000000
    };
    
  } catch (error) {
    console.error("❌ Error en carga manual:", error);
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
    console.log(`📦 [Alternativa] Equipos encontrados: ${data.length}`);
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

export const ficharJugador = async (equipoId, jugadorId) => {
  const response = await fetch(`${API_URL}/equipos/${equipoId}/fichar_jugador/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ jugador_id: jugadorId }),
  });

  if (response.ok) {
    const data = await response.json();
    return data;
  } else {
    const errorText = await response.text();
    console.error('❌ Error del servidor:', errorText);
    
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(errorData.error || 'Error al fichar jugador');
    } catch {
      throw new Error(errorText || 'Error al fichar jugador');
    }
  }
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

export const venderJugador = async (equipoId, jugadorId, precio) => {
  const response = await fetch(`${API_URL}/equipos/${equipoId}/vender_jugador/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      jugador_id: jugadorId, 
      precio_venta: precio 
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
  const response = await fetch(`${API_URL}/mercado/?liga_id=${ligaId}`);
  return handleResponse(response);
};

// ==================== CLASIFICACIÓN ====================

export const getClasificacion = async (ligaId) => {
  const response = await fetch(`${API_URL}/clasificacion/?liga_id=${ligaId}`);
  return handleResponse(response);
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
  const response = await fetch(`${API_URL}/puntuaciones/asignar_puntos/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ jornada_id: jornadaId, puntos }),
  });
  return handleResponse(response);
};