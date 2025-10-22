import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth.models import User
from fantasy.models import Equipo, Jugador, Liga

@pytest.mark.django_db
class TestRegisterView:
    """Tests para la vista de registro"""

    def test_register_success(self, api_client, liga, jugadores_suficientes_registro):
        """Registro exitoso de un nuevo usuario"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['user']['username'] == 'newuser'
        assert response.data['equipo_creado'] is True
        assert response.data['jugadores_asignados'] == 7
        assert response.data['titulares'] == 5
        assert response.data['banquillo'] == 2
        assert 'access' in response.data
        assert 'refresh' in response.data

        # Verificar que se creó el usuario
        user = User.objects.get(username='newuser')
        assert user is not None

        # Verificar que se creó el equipo
        equipo = Equipo.objects.get(usuario=user)
        assert equipo.nombre == "Equipo de newuser"
        assert equipo.presupuesto == 150000000 - response.data['costo_equipo']

        # Verificar que se asignaron 7 jugadores (5 titulares, 2 banquillo)
        jugadores_equipo = Jugador.objects.filter(equipo=equipo)
        assert jugadores_equipo.count() == 7
        titulares = jugadores_equipo.filter(en_banquillo=False)
        banquillo = jugadores_equipo.filter(en_banquillo=True)
        assert titulares.count() == 5
        assert banquillo.count() == 2

    def test_register_passwords_not_matching(self, api_client):
        """Registro con contraseñas que no coinciden"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123',
            'password2': 'differentpass'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # El serializer debería validar que las contraseñas coinciden

    def test_register_insufficient_players(self, api_client, liga, jugadores_insuficientes_registro):
        """Registro cuando no hay suficientes jugadores libres"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        response = api_client.post(url, data)

        # Debería fallar porque no hay suficientes jugadores
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_register_no_liga(self, api_client, jugadores_suficientes_registro):
        """Registro cuando no hay liga existente"""
        # Asegurarse de que no hay ligas
        Liga.objects.all().delete()

        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_register_duplicate_username(self, api_client, user):
        """Registro con nombre de usuario duplicado"""
        url = reverse('register')
        data = {
            'username': 'testuser',  # Ya existe
            'email': 'new@test.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # El serializer debería validar username único

    def test_register_cookie_set(self, api_client, liga, jugadores_suficientes_registro):
        """Verificar que se establece la cookie de refresh token"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        # Verificar que se establece la cookie
        assert 'refresh_token' in response.cookies
        assert response.cookies['refresh_token'].value is not None

    def test_register_team_composition(self, api_client, liga, jugadores_suficientes_registro):
        """Verificar la composición correcta del equipo (1 POR, 3 DEF, 3 DEL)"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        
        # Verificar composición del equipo
        user = User.objects.get(username='newuser')
        equipo = Equipo.objects.get(usuario=user)
        jugadores = Jugador.objects.filter(equipo=equipo)
        
        porteros = jugadores.filter(posicion='POR')
        defensas = jugadores.filter(posicion='DEF')
        delanteros = jugadores.filter(posicion='DEL')
        
        assert porteros.count() == 1
        assert defensas.count() == 3
        assert delanteros.count() == 3
        
        # Verificar distribución titulares/banquillo
        titulares = jugadores.filter(en_banquillo=False)
        banquillo = jugadores.filter(en_banquillo=True)
        
        assert titulares.count() == 5  # 1 POR + 2 DEF + 2 DEL
        assert banquillo.count() == 2  # 1 DEF + 1 DEL

@pytest.mark.django_db
class TestLoginView:
    """Tests para la vista de login"""

    def test_login_success(self, api_client, user):
        """Login exitoso"""
        url = reverse('login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['user']['username'] == 'testuser'
        assert 'access' in response.data

    def test_login_invalid_credentials(self, api_client):
        """Login con credenciales inválidas"""
        url = reverse('login')
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'error' in response.data

    def test_login_nonexistent_user(self, api_client):
        """Login con usuario que no existe"""
        url = reverse('login')
        data = {
            'username': 'nonexistent',
            'password': 'testpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'error' in response.data

    def test_login_with_equipo(self, api_client, equipo):
        """Login cuando el usuario tiene un equipo"""
        url = reverse('login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['equipo']['nombre'] == equipo.nombre

    def test_login_without_equipo(self, api_client, user2):
        """Login cuando el usuario no tiene equipo"""
        # user2 no tiene equipo
        url = reverse('login')
        data = {
            'username': 'testuser2',
            'password': 'testpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['equipo'] is None

    def test_login_empty_data(self, api_client):
        """Login sin enviar datos"""
        url = reverse('login')
        data = {}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_password(self, api_client):
        """Login sin contraseña"""
        url = reverse('login')
        data = {
            'username': 'testuser'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_username(self, api_client):
        """Login sin nombre de usuario"""
        url = reverse('login')
        data = {
            'password': 'testpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
class TestAuthEdgeCases:
    """Tests para casos edge de autenticación"""

    def test_register_with_special_characters(self, api_client, liga, jugadores_suficientes_registro):
        """Registro con caracteres especiales en el username"""
        url = reverse('register')
        data = {
            'username': 'user_123-test',
            'email': 'special@test.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        response = api_client.post(url, data)

        # Depende de la validación del serializer
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

    def test_register_long_username(self, api_client, liga, jugadores_suficientes_registro):
        """Registro con username muy largo"""
        url = reverse('register')
        data = {
            'username': 'a' * 150,  # Demasiado largo
            'email': 'long@test.com',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_case_sensitivity(self, api_client, user):
        """Login con diferentes casos en el username"""
        url = reverse('login')
        data = {
            'username': 'TESTUSER',  # Mayúsculas
            'password': 'testpass123'
        }
        response = api_client.post(url, data)

        # Django auth es case-sensitive por defecto
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_multiple_registrations_same_email(self, api_client, liga, jugadores_suficientes_registro):
        """Múltiples registros con el mismo email"""
        # Primer registro
        data1 = {
            'username': 'user1',
            'email': 'same@test.com',
            'password': 'pass123',
            'password2': 'pass123'
        }
        response1 = api_client.post(reverse('register'), data1)
        
        # Segundo registro con mismo email
        data2 = {
            'username': 'user2',
            'email': 'same@test.com',
            'password': 'pass123',
            'password2': 'pass123'
        }
        response2 = api_client.post(reverse('register'), data2)

        # Depende de si el modelo User permite emails duplicados
        assert response2.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

@pytest.mark.django_db
class TestAuthAdditionalCases:
    """Tests adicionales para casos específicos de autenticación"""
    
    def test_register_empty_username(self, api_client):
        """Registro con username vacío"""
        url = reverse('register')
        data = {
            'username': '',
            'email': 'test@test.com',
            'password': 'testpass123',
            'password2': 'testpass123'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_invalid_email(self, api_client):
        """Registro con email inválido"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'invalid-email',
            'password': 'testpass123',
            'password2': 'testpass123'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_inactive_user(self, api_client):
        """Login con usuario inactivo"""
        # Crear usuario inactivo
        user = User.objects.create_user(
            username='inactiveuser',
            password='testpass123',
            is_active=False
        )
        
        url = reverse('login')
        data = {
            'username': 'inactiveuser',
            'password': 'testpass123'
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_register_team_name_format(self, api_client, liga, jugadores_suficientes_registro):
        """Verificar formato del nombre del equipo creado"""
        url = reverse('register')
        data = {
            'username': 'testplayer',
            'email': 'test@test.com',
            'password': 'testpass123',
            'password2': 'testpass123'
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        user = User.objects.get(username='testplayer')
        equipo = Equipo.objects.get(usuario=user)
        assert equipo.nombre == f"Equipo de testplayer"