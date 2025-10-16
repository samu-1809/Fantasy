# fantasy/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views  
from .auth_views import CookieTokenObtainPairView, CookieTokenRefreshView, LogoutView

router = DefaultRouter()
router.register(r'ligas', views.LigaViewSet)
router.register(r'jugadores', views.JugadorViewSet)
router.register(r'equipos', views.EquipoViewSet)
router.register(r'mercado', views.MercadoViewSet, basename='mercado')
router.register(r'clasificacion', views.ClasificacionViewSet, basename='clasificacion')
router.register(r'jornadas', views.JornadaViewSet)
router.register(r'partidos', views.PartidoViewSet)
router.register(r'equipos-reales', views.EquipoRealViewSet)
router.register(r'puntuaciones', views.PuntuacionViewSet)
router.register(r'ofertas', views.OfertaViewSet, basename='ofertas')
router.register(r'pujas', views.PujaViewSet, basename='pujas')
router.register(r'notificaciones', views.NotificacionViewSet, basename='notificaciones')  # Asegúrate de tener esta línea

urlpatterns = [
    # ==================== PUNTUACIONES ====================
    path('jugadores/<int:jugador_id>/puntuaciones/', views.puntuaciones_jugador, name='puntuaciones_jugador'),
    path('puntuaciones/actualizar/', views.actualizar_puntuacion_jugador, name='actualizar_puntuacion_jugador'),
    path('partidos/<int:partido_id>/puntuaciones/', views.puntuaciones_por_partido, name='puntuaciones-partido'),
    
    # ==================== AUTENTICACIÓN ====================
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', CookieTokenObtainPairView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/refresh/', CookieTokenRefreshView.as_view(), name='token-refresh'),
    path('auth/user/', views.current_user, name='current-user'),
    
    # ==================== DATOS GENERALES ====================
    path('datos-iniciales/', views.datos_iniciales, name='datos_iniciales'),
    path('mi-equipo/', views.mi_equipo, name='mi_equipo'),

    # ==================== EQUIPOS REALES ====================
    path('equipos-reales/<int:equipo_id>/plantilla/', views.plantilla_equipo_real, name='plantilla_equipo'),
    
    # ==================== EQUIPOS ====================
    path('equipos/<int:equipo_id>/plantilla/', views.plantilla_equipo, name='plantilla_equipo'),
    path('equipos/<int:equipo_id>/guardar_alineacion/', views.guardar_alineacion, name='guardar_alineacion'),
    path('equipos/<int:equipo_id>/actualizar_estados_banquillo/', views.actualizar_estados_banquillo, name='actualizar_estados_banquillo'),
    path('equipos/<int:equipo_id>/intercambiar_jugadores/', views.intercambiar_jugadores, name='intercambiar_jugadores'),
    
    # ==================== GESTIÓN DE JUGADORES ====================
    path('equipos/<int:equipo_id>/jugadores/<int:jugador_id>/poner_en_venta/', views.poner_en_venta, name='poner_en_venta'),
    path('equipos/<int:equipo_id>/jugadores/<int:jugador_id>/quitar_del_mercado/', views.quitar_del_mercado, name='quitar_del_mercado'),
    
    # ==================== MERCADO - OFERTAS ====================
    path('equipos/<int:equipo_id>/ofertas_recibidas/', views.ofertas_recibidas, name='ofertas_recibidas'),
    path('equipos/<int:equipo_id>/ofertas_realizadas/', views.ofertas_realizadas, name='ofertas_realizadas'),
    path('ofertas/<int:oferta_id>/aceptar/', views.aceptar_oferta, name='aceptar_oferta'),
    path('ofertas/<int:oferta_id>/rechazar/', views.rechazar_oferta, name='rechazar_oferta'),
    path('ofertas/<int:oferta_id>/retirar/', views.retirar_oferta, name='retirar_oferta'),
    path('ofertas-directas/crear/', views.crear_oferta_directa, name='crear_oferta_directa'),   
    path('ofertas/<int:oferta_id>/editar/', views.editar_oferta, name='editar_oferta'), 
    
    # ==================== MERCADO - PUJAS ====================
    path('equipos/<int:equipo_id>/pujar_jugador/', views.pujar_jugador, name='pujar_jugador'),
    path('equipos/<int:equipo_id>/pujas_realizadas/', views.pujas_realizadas, name='pujas_realizadas'),
    path('pujas/<int:puja_id>/retirar/', views.retirar_puja, name='retirar_puja'),
    path('pujas/<int:puja_id>/editar/', views.editar_puja, name='editar_puja'),

    # ==================== NOTIFICACIONES ====================
    path('notificaciones/usuario/', views.listar_notificaciones, name='listar-notificaciones'),
    path('notificaciones/contar-no-leidas/', views.contar_no_leidas, name='contar-no-leidas'),
    path('notificaciones/marcar-todas-leidas/', views.marcar_todas_leidas, name='marcar-todas-leidas'),
    path('notificaciones/<int:notificacion_id>/marcar-leida/', views.marcar_como_leida, name='marcar-notificacion-leida'),
    
    # ==================== JORNADAS Y PARTIDOS ====================
    path('jornadas/<int:jornada_id>/equipos-disponibles/', views.equipos_disponibles_jornada, name='equipos_disponibles_jornada'),
    
    # ==================== ADMINISTRACIÓN ====================
    path('finalizar-subastas/', views.finalizar_subastas, name='finalizar_subastas'),
    path('', include(router.urls)),

]