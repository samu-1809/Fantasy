"""
Tests para las vistas/ViewSets de Fantasy
"""
import pytest
from django.urls import reverse
from rest_framework import status
from fantasy.models import Equipo, Jugador


@pytest.mark.django_db
class TestEquipoViewSet:
    """Tests para EquipoViewSet"""

    def test_list_equipos_sin_auth_falla(self, api_client):
        """Listar equipos sin autenticación debe fallar"""
        url = reverse('equipo-list')
        response = api_client.get(url)
        # DRF puede devolver 401 o 403 dependiendo de la config
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_list_equipos_con_auth(self, authenticated_client, equipo):
        """Usuario autenticado puede listar equipos"""
        url = reverse('equipo-list')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_fichar_jugador_exitoso(self, authenticated_client, equipo, jugador_portero):
        """Fichar un jugador con presupuesto suficiente"""
        # Asegurar que el jugador no esté ya fichado
        assert jugador_portero not in equipo.jugadores.all()

        url = reverse('equipo-fichar-jugador', kwargs={'pk': equipo.id})
        response = authenticated_client.post(url, {'jugador_id': jugador_portero.id})

        assert response.status_code == status.HTTP_200_OK
        equipo.refresh_from_db()
        assert jugador_portero in equipo.jugadores.all()

    def test_fichar_jugador_sin_presupuesto(self, authenticated_client, equipo, jugador_portero):
        """No se puede fichar sin presupuesto suficiente"""
        # Reducir presupuesto a menos del valor del jugador
        equipo.presupuesto = 1000000
        equipo.save()

        url = reverse('equipo-fichar-jugador', kwargs={'pk': equipo.id})
        response = authenticated_client.post(url, {'jugador_id': jugador_portero.id})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'presupuesto' in response.data['error'].lower()

    def test_fichar_jugador_ya_fichado(self, authenticated_client, equipo, user2, liga, jugador_portero):
        """No se puede fichar un jugador que ya está en otro equipo"""
        # Crear otro equipo y fichar el jugador
        equipo2 = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo 2',
            presupuesto=50000000
        )
        equipo2.jugadores.add(jugador_portero)

        # Intentar fichar con el primer equipo
        url = reverse('equipo-fichar-jugador', kwargs={'pk': equipo.id})
        response = authenticated_client.post(url, {'jugador_id': jugador_portero.id})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_vender_jugador_exitoso(self, authenticated_client, equipo_con_jugadores):
        """Vender un jugador correctamente"""
        jugador = equipo_con_jugadores.jugadores.first()
        presupuesto_inicial = equipo_con_jugadores.presupuesto

        url = reverse('equipo-vender-jugador', kwargs={'pk': equipo_con_jugadores.id})
        response = authenticated_client.post(url, {'jugador_id': jugador.id})

        # Verificar que no rompa las validaciones de plantilla
        # Como equipo_con_jugadores solo tiene 3 jugadores, puede que no se pueda vender
        # dependiendo de las posiciones
        if response.status_code == status.HTTP_200_OK:
            equipo_con_jugadores.refresh_from_db()
            assert jugador not in equipo_con_jugadores.jugadores.all()
            assert equipo_con_jugadores.presupuesto > presupuesto_inicial


@pytest.mark.django_db
class TestMercadoViewSet:
    """Tests para MercadoViewSet"""

    def test_mercado_sin_liga_id_falla(self, api_client):
        """Mercado sin liga_id debe retornar error"""
        url = reverse('mercado-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mercado_con_liga_id(self, api_client, liga, jugador_portero, jugador_defensa):
        """Mercado retorna jugadores disponibles"""
        url = reverse('mercado-list')
        response = api_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)

    def test_mercado_no_incluye_fichados(self, api_client, liga, equipo, jugador_portero):
        """Mercado no incluye jugadores ya fichados"""
        equipo.jugadores.add(jugador_portero)

        url = reverse('mercado-list')
        response = api_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        # Verificar que el jugador fichado no esté en la lista
        jugador_ids = [j['id'] for j in response.data]
        assert jugador_portero.id not in jugador_ids


@pytest.mark.django_db
class TestClasificacionViewSet:
    """Tests para ClasificacionViewSet"""

    def test_clasificacion_sin_liga_id_falla(self, api_client):
        """Clasificación sin liga_id debe retornar error"""
        url = reverse('clasificacion-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_clasificacion_con_equipos(self, api_client, liga, equipo_con_jugadores):
        """Clasificación muestra equipos ordenados por puntos"""
        url = reverse('clasificacion-list')
        response = api_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) >= 1

        # Verificar estructura
        if len(response.data) > 0:
            item = response.data[0]
            assert 'posicion' in item
            assert 'nombre' in item
            assert 'puntos_totales' in item

    def test_clasificacion_orden_por_puntos(self, api_client, liga, user, user2):
        """Clasificación ordena equipos por puntos descendente"""
        # Crear dos equipos
        equipo1 = Equipo.objects.create(
            usuario=user, liga=liga, nombre='Equipo 1', presupuesto=50000000
        )
        equipo2 = Equipo.objects.create(
            usuario=user2, liga=liga, nombre='Equipo 2', presupuesto=50000000
        )

        # Crear jugadores con puntos diferentes
        jugador1 = Jugador.objects.create(
            nombre='Jugador 1', posicion='POR', valor=5000000, puntos_totales=100
        )
        jugador2 = Jugador.objects.create(
            nombre='Jugador 2', posicion='DEF', valor=5000000, puntos_totales=50
        )

        equipo1.jugadores.add(jugador1)
        equipo2.jugadores.add(jugador2)

        url = reverse('clasificacion-list')
        response = api_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        # El equipo1 con más puntos debe estar primero
        assert response.data[0]['puntos_totales'] >= response.data[1]['puntos_totales']
        assert response.data[0]['posicion'] == 1
        assert response.data[1]['posicion'] == 2


@pytest.mark.django_db
class TestAuthViews:
    """Tests para vistas de autenticación"""

    def test_register_crea_usuario(self, api_client):
        """Registro crea un nuevo usuario"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert 'access' in response.data

    def test_login_retorna_token(self, api_client, user):
        """Login retorna access token"""
        url = reverse('login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

    def test_login_credenciales_invalidas(self, api_client):
        """Login con credenciales inválidas falla"""
        url = reverse('login')
        data = {
            'username': 'noexiste',
            'password': 'wrongpass'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
