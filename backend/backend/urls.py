from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponseRedirect
from django.conf import settings

def redirect_to_frontend(request):
    """Redirige al frontend (login)"""
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://fantasy-wine-three.vercel.app')
    return HttpResponseRedirect(frontend_url)

urlpatterns = [
    path('', redirect_to_frontend, name='home'),
    path('admin/', admin.site.urls),
    path('api/', include('fantasy.urls')),
]