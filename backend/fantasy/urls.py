from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.contrib.auth import views as auth_views
from . import views
from .auth_views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView
)

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

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', CookieTokenObtainPairView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('datos-iniciales/', views.datos_iniciales, name='datos_iniciales'),
    path('auth/refresh/', CookieTokenRefreshView.as_view(), name='token-refresh'),
    path('auth/user/', views.current_user, name='current-user'),
    path('jornadas/<int:jornada_id>/equipos-disponibles/', views.equipos_disponibles_jornada, name='equipos_disponibles_jornada'),
    path('mi-equipo/', views.mi_equipo, name='mi_equipo'),

    path('equipos/<int:pk>/detalle', views.equipo_detalle, name='equipo-detalle'),
    path('equipos/<int:equipo_id>/pujar_jugador/', views.pujar_jugador, name='pujar_jugador'),
    path('equipos/<int:equipo_id>/ofertas_recibidas/', views.ofertas_recibidas, name='ofertas_recibidas'),
    path('equipos/<int:equipo_id>/ofertas_realizadas/', views.ofertas_realizadas, name='ofertas_realizadas'),
    path('ofertas/<int:oferta_id>/aceptar/', views.aceptar_oferta, name='aceptar_oferta'),
    path('ofertas/<int:oferta_id>/rechazar/', views.rechazar_oferta, name='rechazar_oferta'),
    path('equipos/<int:equipo_id>/pujas_realizadas/', views.pujas_realizadas, name='pujas_realizadas'),
    path('pujas/<int:puja_id>/retirar/', views.retirar_puja, name='retirar_puja'),

    path('equipos/<int:equipo_id>/guardar_alineacion/', views.guardar_alineacion, name='guardar_alineacion'),
    path('finalizar-subastas/', views.finalizar_subastas, name='finalizar_subastas'),
    path('equipos/<int:equipo_id>/jugadores/<int:jugador_id>/poner_en_venta/', views.poner_en_venta, name='poner_en_venta'),
    path('ofertas/<int:oferta_id>/retirar/', views.retirar_oferta, name='retirar_oferta'),
    path('equipos/<int:equipo_id>/jugadores/<int:jugador_id>/quitar-del-mercado/', views.quitar_del_mercado, name='quitar_del_mercado'),
    path('equipos/<int:equipo_id>/intercambiar_jugadores/', views.intercambiar_jugadores, name='intercambiar_jugadores'),
    path('equipos/<int:equipo_id>/actualizar_estados_banquillo/', views.actualizar_estados_banquillo, name='actualizar_estados_banquillo'),
]