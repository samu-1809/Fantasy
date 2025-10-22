# Importa todas las views para facilitar el acceso desde otros módulos
from .auth_views import RegisterView, LoginView
from .model_views import (
    LigaViewSet, JugadorViewSet, EquipoViewSet, EquipoRealViewSet, goleadores,
    JornadaViewSet, PartidoViewSet, PuntuacionViewSet, plantilla_equipo_real, clasificacion_equipos_reales
)
from .mercado_views import MercadoViewSet, OfertaViewSet, PujaViewSet
from .clasificacion_views import ClasificacionViewSet

from .notificaciones_views import (
    NotificacionViewSet,
    contar_no_leidas,
    listar_notificaciones,
    marcar_todas_leidas,
    marcar_como_leida,
)

# Importa las funciones de equipo_views
from .equipo_views import (
    mi_equipo, 
    poner_en_venta, 
    quitar_del_mercado,
    intercambiar_jugadores, 
    guardar_alineacion,
    mover_a_alineacion,
    plantilla_equipo,
    actualizar_estados_banquillo
)

# Importa funciones de puntuación
from .puntuacion_views import (
    puntuaciones_jugador, 
    actualizar_puntuacion_jugador, 
    equipos_disponibles_jornada,
    puntuaciones_por_partido
)

# Importa funciones de ofertas
from .ofertas_views import (
    ofertas_recibidas, 
    ofertas_realizadas, 
    aceptar_oferta,
    rechazar_oferta, 
    retirar_oferta,
    crear_oferta_directa,
    editar_oferta
)

# Importa funciones de pujas
from .pujas_views import (
    pujar_jugador, 
    pujas_realizadas, 
    retirar_puja,
    editar_puja
)

# Importa utilidades
from .utils_views import (
    datos_iniciales, 
    current_user, 
    finalizar_subastas
)

# 🎯 Define qué se exporta cuando se hace: from views import *
__all__ = [
    # ViewSets
    'RegisterView', 'LoginView', 'LigaViewSet', 'JugadorViewSet', 
    'EquipoViewSet', 'EquipoRealViewSet', 'JornadaViewSet', 'goleadores',
    'PartidoViewSet', 'PuntuacionViewSet', 'MercadoViewSet', 'clasificacion_equipos_reales',
    'OfertaViewSet', 'PujaViewSet', 'ClasificacionViewSet', 'plantilla_equipo_real',
    'NotificacionViewSet',  # Añadido aquí
    
    # Funciones de equipo
    'mi_equipo', 'poner_en_venta', 'quitar_del_mercado', 'mover_a_alineacion',
    'intercambiar_jugadores', 'guardar_alineacion', 'plantilla_equipo','actualizar_estados_banquillo',
    
    # Funciones de puntuación
    'puntuaciones_jugador', 'actualizar_puntuacion_jugador',
    'equipos_disponibles_jornada','puntuaciones_por_partido',
    
    # Funciones de ofertas
    'ofertas_recibidas', 'ofertas_realizadas', 'aceptar_oferta',
    'rechazar_oferta', 'retirar_oferta', 'crear_oferta_directa', 'editar_oferta',
    
    # Funciones de pujas
    'pujar_jugador', 'pujas_realizadas', 'retirar_puja', 'editar_puja',
    
    # Notificaciones
    'contar_no_leidas','listar_notificaciones','marcar_todas_leidas','marcar_como_leida',
    
    # Utilidades
    'datos_iniciales', 'current_user', 'finalizar_subastas'
]