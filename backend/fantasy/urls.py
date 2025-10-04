from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LigaViewSet, JugadorViewSet, EquipoViewSet, 
    MercadoViewSet, ClasificacionViewSet, JornadaViewSet, PuntuacionViewSet,
    RegisterView, LoginView, current_user
)

router = DefaultRouter()
router.register(r'ligas', LigaViewSet)
router.register(r'jugadores', JugadorViewSet)
router.register(r'equipos', EquipoViewSet)
router.register(r'mercado', MercadoViewSet, basename='mercado')
router.register(r'clasificacion', ClasificacionViewSet, basename='clasificacion')
router.register(r'jornadas', JornadaViewSet)
router.register(r'puntuaciones', PuntuacionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/user/', current_user, name='current-user'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]