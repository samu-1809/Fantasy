from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LigaViewSet, JugadorViewSet, EquipoViewSet,
    MercadoViewSet, ClasificacionViewSet, JornadaViewSet, PuntuacionViewSet,
    RegisterView, LoginView, current_user
)
from .auth_views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView
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
    # Auth endpoints - nueva implementación con cookies
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', CookieTokenObtainPairView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/refresh/', CookieTokenRefreshView.as_view(), name='token-refresh'),
    path('auth/user/', current_user, name='current-user'),
    # Legacy login (deprecado, usar auth/login/)
    path('login/', LoginView.as_view(), name='legacy-login'),
]