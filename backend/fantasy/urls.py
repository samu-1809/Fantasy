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
router.register(r'puntuaciones', views.PuntuacionViewSet)
router.register(r'equipos-reales', views.EquipoRealViewSet)
router.register(r'partidos', views.PartidoViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', CookieTokenObtainPairView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/refresh/', CookieTokenRefreshView.as_view(), name='token-refresh'),
    path('auth/user/', views.current_user, name='current-user'),
    
    path('mi-equipo/', views.mi_equipo, name='mi_equipo'),
]