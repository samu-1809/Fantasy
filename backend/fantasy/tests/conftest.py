"""
Configuración de pytest y fixtures compartidos
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from fantasy.models import Liga, Jugador, Equipo, Jornada


@pytest.fixture
def api_client():
    """Cliente API de DRF sin autenticación"""
    return APIClient()


@pytest.fixture
def user(db):
    """Usuario de prueba"""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def user2(db):
    """Segundo usuario de prueba"""
    return User.objects.create_user(
        username='testuser2',
        email='test2@example.com',
        password='testpass123'
    )


@pytest.fixture
def admin_user(db):
    """Usuario administrador"""
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='admin123'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Cliente API autenticado con user"""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Cliente API autenticado como admin"""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def liga(db):
    """Liga de prueba"""
    return Liga.objects.create(
        nombre='Liga de Prueba',
        codigo='TEST2024',
        presupuesto_inicial=50000000,
        jornada_actual=1
    )


@pytest.fixture
def jugador_portero(db):
    """Jugador portero de prueba"""
    return Jugador.objects.create(
        nombre='Portero Test',
        posicion='POR',
        valor=8000000,
        puntos_totales=0
    )


@pytest.fixture
def jugador_defensa(db):
    """Jugador defensa de prueba"""
    return Jugador.objects.create(
        nombre='Defensa Test',
        posicion='DEF',
        valor=6000000,
        puntos_totales=0
    )


@pytest.fixture
def jugador_medio(db):
    """Jugador centrocampista de prueba"""
    return Jugador.objects.create(
        nombre='Medio Test',
        posicion='MED',
        valor=7000000,
        puntos_totales=0
    )


@pytest.fixture
def jugador_delantero(db):
    """Jugador delantero de prueba"""
    return Jugador.objects.create(
        nombre='Delantero Test',
        posicion='DEL',
        valor=9000000,
        puntos_totales=0
    )


@pytest.fixture
def equipo(db, user, liga):
    """Equipo de prueba"""
    return Equipo.objects.create(
        usuario=user,
        liga=liga,
        nombre='Equipo Test',
        presupuesto=50000000
    )


@pytest.fixture
def equipo_con_jugadores(db, equipo, jugador_portero, jugador_defensa, jugador_delantero):
    """Equipo con jugadores asignados"""
    equipo.jugadores.add(jugador_portero, jugador_defensa, jugador_delantero)
    equipo.presupuesto -= (jugador_portero.valor + jugador_defensa.valor + jugador_delantero.valor)
    equipo.save()
    return equipo


@pytest.fixture
def jornada(db, liga):
    """Jornada de prueba"""
    return Jornada.objects.create(
        liga=liga,
        numero=1
    )
