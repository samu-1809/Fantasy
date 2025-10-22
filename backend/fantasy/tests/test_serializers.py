import pytest
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from fantasy.models import (
    Liga, Jugador, Equipo, Jornada, EquipoReal, 
    Puntuacion, Partido, Oferta, Puja, Notificacion, AlineacionCongelada
)
from fantasy.serializers import (
    LigaSerializer, JugadorSerializer, JugadorDetailSerializer, EquipoSerializer,
    UserSerializer, RegisterSerializer, LoginSerializer, EquipoRealSerializer,
    JornadaSerializer, PartidoSerializer, OfertaSerializer, PujaSerializer,
    NotificacionSerializer, AlineacionCongeladaSerializer, JugadorMercadoSerializer,
    PuntuacionSerializer, PuntuacionJornadaSerializer
)

@pytest.mark.django_db
class TestLigaSerializer:
    """Tests para LigaSerializer"""

    def test_liga_serializer(self, liga):
        serializer = LigaSerializer(liga)
        data = serializer.data
        
        assert data['id'] == liga.id
        assert data['nombre'] == liga.nombre
        assert data['codigo'] == liga.codigo
        assert data['jornada_actual'] == liga.jornada_actual

@pytest.mark.django_db
class TestJugadorSerializers:
    """Tests para serializers de Jugador"""

    def test_jugador_serializer(self, jugador_portero, equipo):
        jugador_portero.equipo = equipo
        jugador_portero.save()
        
        serializer = JugadorSerializer(jugador_portero)
        data = serializer.data
        
        assert data['id'] == jugador_portero.id
        assert data['nombre'] == jugador_portero.nombre
        assert data['posicion'] == jugador_portero.posicion
        assert data['valor'] == jugador_portero.valor
        assert data['equipo_nombre'] == equipo.nombre
        assert 'puntuaciones_jornadas' in data

    def test_jugador_serializer_sin_equipo(self, jugador_portero):
        serializer = JugadorSerializer(jugador_portero)
        data = serializer.data
        
        assert data['equipo_nombre'] is None
        assert data['usuario_vendedor'] is None

    def test_jugador_detail_serializer(self, jugador_portero, puntuacion_jugador):
        serializer = JugadorDetailSerializer(jugador_portero)
        data = serializer.data
        
        assert data['id'] == jugador_portero.id
        assert data['nombre'] == jugador_portero.nombre
        assert 'puntuaciones_jornadas' in data
        assert len(data['puntuaciones_jornadas']) == 1

    def test_jugador_serializer_puntuaciones(self, jugador_portero, jornada, jornada2):
        # Crear múltiples puntuaciones
        Puntuacion.objects.create(jugador=jugador_portero, jornada=jornada, puntos=5, goles=0)
        Puntuacion.objects.create(jugador=jugador_portero, jornada=jornada2, puntos=7, goles=0)
        
        serializer = JugadorSerializer(jugador_portero)
        data = serializer.data
        
        assert len(data['puntuaciones_jornadas']) == 2
        assert data['puntuaciones_jornadas'][0]['puntos'] == 5
        assert data['puntuaciones_jornadas'][1]['puntos'] == 7

@pytest.mark.django_db
class TestEquipoSerializer:
    """Tests para EquipoSerializer"""

    def test_equipo_serializer(self, equipo_con_jugadores):
        serializer = EquipoSerializer(equipo_con_jugadores)
        data = serializer.data
        
        assert data['id'] == equipo_con_jugadores.id
        assert data['nombre'] == equipo_con_jugadores.nombre
        assert data['usuario_username'] == equipo_con_jugadores.usuario.username
        assert data['liga_nombre'] == equipo_con_jugadores.liga.nombre
        assert 'jugadores' in data
        assert 'jugadores_campo' in data
        assert 'jugadores_banquillo' in data

    def test_equipo_serializer_jugadores_campo_banquillo(self, equipo_completo_con_jugadores):
        serializer = EquipoSerializer(equipo_completo_con_jugadores)
        data = serializer.data
        
        # Verificar que separa correctamente jugadores en campo y banquillo
        assert len(data['jugadores_campo']) == 5
        assert len(data['jugadores_banquillo']) == 3
        
        # Todos los jugadores en campo no deben estar en banquillo
        for jugador in data['jugadores_campo']:
            assert jugador['en_banquillo'] is False
        
        # Todos los jugadores en banquillo deben estar en banquillo
        for jugador in data['jugadores_banquillo']:
            assert jugador['en_banquillo'] is True

@pytest.mark.django_db
class TestAuthSerializers:
    """Tests para serializers de autenticación"""

    def test_user_serializer(self, user):
        serializer = UserSerializer(user)
        data = serializer.data
        
        assert data['id'] == user.id
        assert data['username'] == user.username
        assert data['email'] == user.email
        # Password no debe estar incluido
        assert 'password' not in data

    def test_register_serializer_valid(self):
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'testpass123',
            'password2': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        serializer = RegisterSerializer(data=data)
        
        assert serializer.is_valid() is True
        user = serializer.save()
        assert user.username == 'newuser'
        assert user.check_password('testpass123') is True

    def test_register_serializer_passwords_not_match(self):
        data = {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'testpass123',
            'password2': 'differentpass'
        }
        serializer = RegisterSerializer(data=data)
        
        assert serializer.is_valid() is False
        assert 'non_field_errors' in serializer.errors

    def test_login_serializer(self):
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        serializer = LoginSerializer(data=data)
        
        assert serializer.is_valid() is True
        assert serializer.validated_data == data

    def test_login_serializer_missing_fields(self):
        data = {
            'username': 'testuser'
            # Falta password
        }
        serializer = LoginSerializer(data=data)
        
        assert serializer.is_valid() is False
        assert 'password' in serializer.errors

@pytest.mark.django_db
class TestPartidoSerializer:
    """Tests para PartidoSerializer"""

    def test_partido_serializer(self, partido):
        serializer = PartidoSerializer(partido)
        data = serializer.data
        
        assert data['id'] == partido.id
        assert data['equipo_local_nombre'] == partido.equipo_local.nombre
        assert data['equipo_visitante_nombre'] == partido.equipo_visitante.nombre
        assert data['jornada_numero'] == partido.jornada.numero
        assert data['goles_local'] == partido.goles_local
        assert data['goles_visitante'] == partido.goles_visitante

    def test_partido_serializer_validation_same_team(self):
        equipo_real = EquipoReal.objects.create(nombre='Test Team')
        jornada = Jornada.objects.create(numero=1)
        
        data = {
            'jornada': jornada.id,
            'equipo_local': equipo_real.id,
            'equipo_visitante': equipo_real.id,
            'goles_local': 2,
            'goles_visitante': 1,
            'jugado': True
        }
        serializer = PartidoSerializer(data=data)
        
        assert serializer.is_valid() is False
        assert 'non_field_errors' in serializer.errors

    def test_partido_serializer_validation_duplicate_teams(self, partido):
        # Intentar crear otro partido con los mismos equipos en la misma jornada
        data = {
            'jornada': partido.jornada.id,
            'equipo_local': partido.equipo_local.id,
            'equipo_visitante': partido.equipo_visitante.id,
            'goles_local': 1,
            'goles_visitante': 1,
            'jugado': True
        }
        serializer = PartidoSerializer(data=data)
        
        assert serializer.is_valid() is False

@pytest.mark.django_db
class TestOfertaPujaSerializers:
    """Tests para serializers de Oferta y Puja"""

    def test_oferta_serializer(self, oferta_pendiente):
        serializer = OfertaSerializer(oferta_pendiente)
        data = serializer.data
        
        assert data['id'] == oferta_pendiente.id
        assert data['monto'] == oferta_pendiente.monto
        assert data['estado'] == oferta_pendiente.estado
        assert data['jugador_nombre'] == oferta_pendiente.jugador.nombre
        assert data['equipo_ofertante_nombre'] == oferta_pendiente.equipo_ofertante.nombre
        assert data['equipo_receptor_nombre'] == oferta_pendiente.equipo_receptor.nombre

    def test_puja_serializer(self, puja_activa):
        serializer = PujaSerializer(puja_activa)
        data = serializer.data
        
        assert data['id'] == puja_activa.id
        assert data['monto'] == puja_activa.monto
        assert data['equipo_nombre'] == puja_activa.equipo.nombre
        assert data['jugador_nombre'] == puja_activa.jugador.nombre
        assert data['valor_jugador'] == puja_activa.jugador.valor
        assert 'jugador_en_venta' in data
        assert 'jugador_expirado' in data

@pytest.mark.django_db
class TestNotificacionSerializer:
    """Tests para NotificacionSerializer"""

    def test_notificacion_serializer(self, notificacion_publica):
        serializer = NotificacionSerializer(notificacion_publica)
        data = serializer.data
        
        assert data['id'] == notificacion_publica.id
        assert data['titulo'] == notificacion_publica.titulo
        assert data['mensaje'] == notificacion_publica.mensaje
        assert data['tipo'] == notificacion_publica.tipo
        assert data['leida'] == notificacion_publica.leida
        assert 'tiempo_desde_creacion' in data

@pytest.mark.django_db
class TestAlineacionCongeladaSerializer:
    """Tests para AlineacionCongeladaSerializer"""

    def test_alineacion_congelada_serializer(self, alineacion_congelada):
        serializer = AlineacionCongeladaSerializer(alineacion_congelada)
        data = serializer.data
        
        assert data['id'] == alineacion_congelada.id
        assert data['equipo_nombre'] == alineacion_congelada.equipo.nombre
        assert data['jornada_numero'] == alineacion_congelada.jornada.numero
        assert 'jugadores_titulares_info' in data
        assert 'formacion_actual' in data
        
        # Verificar estructura de formacion_actual
        formacion = data['formacion_actual']
        assert 'POR' in formacion
        assert 'DEF' in formacion
        assert 'DEL' in formacion
        assert 'total' in formacion

    def test_alineacion_congelada_serializer_con_puntos(self, alineacion_congelada_con_puntos):
        serializer = AlineacionCongeladaSerializer(alineacion_congelada_con_puntos)
        data = serializer.data
        
        assert data['puntos_obtenidos'] == alineacion_congelada_con_puntos.puntos_obtenidos
        assert data['dinero_ganado'] == alineacion_congelada_con_puntos.dinero_ganado

@pytest.mark.django_db
class TestJugadorMercadoSerializer:
    """Tests para JugadorMercadoSerializer"""

    def test_jugador_mercado_serializer_libre(self, jugador_libre_en_mercado_activo):
        serializer = JugadorMercadoSerializer(jugador_libre_en_mercado_activo)
        data = serializer.data
        
        assert data['id'] == jugador_libre_en_mercado_activo.id
        assert data['nombre'] == jugador_libre_en_mercado_activo.nombre
        assert data['tipo'] == 'libre_rotatorio'
        assert data['en_venta'] is True
        assert 'expirado' in data
        assert 'estadisticas' in data
        assert 'puntuaciones_jornadas' in data

    def test_jugador_mercado_serializer_usuario(self, jugador_usuario_en_venta):
        serializer = JugadorMercadoSerializer(jugador_usuario_en_venta)
        data = serializer.data
        
        assert data['tipo'] == 'venta_usuario'
        assert data['vendedor'] == jugador_usuario_en_venta.equipo.nombre
        assert data['precio_venta'] == jugador_usuario_en_venta.precio_venta

    def test_jugador_mercado_serializer_estadisticas(self, jugador_libre_en_mercado_activo, puntuacion_jugador_mercado):
        serializer = JugadorMercadoSerializer(jugador_libre_en_mercado_activo)
        data = serializer.data
        
        estadisticas = data['estadisticas']
        assert 'goles' in estadisticas
        assert 'partidos_jugados' in estadisticas
        assert 'puntos_totales' in estadisticas

    def test_jugador_mercado_serializer_expirado(self, jugador_libre_en_mercado_expirado):
        serializer = JugadorMercadoSerializer(jugador_libre_en_mercado_expirado)
        data = serializer.data
        
        assert data['expirado'] is True

@pytest.mark.django_db
class TestPuntuacionSerializers:
    """Tests para serializers de Puntuacion"""

    def test_puntuacion_serializer(self, puntuacion_jugador):
        serializer = PuntuacionSerializer(puntuacion_jugador)
        data = serializer.data
        
        assert data['id'] == puntuacion_jugador.id
        assert data['puntos'] == puntuacion_jugador.puntos
        assert data['jugador_nombre'] == puntuacion_jugador.jugador.nombre
        assert data['jornada_numero'] == puntuacion_jugador.jornada.numero

    def test_puntuacion_jornada_serializer(self, puntuacion_jugador):
        serializer = PuntuacionJornadaSerializer(puntuacion_jugador)
        data = serializer.data
        
        assert data['jornada_id'] == puntuacion_jugador.jornada.id
        assert data['jornada_numero'] == puntuacion_jugador.jornada.numero
        assert data['puntos'] == puntuacion_jugador.puntos
        assert 'goles' in data

@pytest.mark.django_db
class TestEquipoRealSerializer:
    """Tests para EquipoRealSerializer"""

    def test_equipo_real_serializer(self, equipo_real):
        serializer = EquipoRealSerializer(equipo_real)
        data = serializer.data
        
        assert data['id'] == equipo_real.id
        assert data['nombre'] == equipo_real.nombre

@pytest.mark.django_db
class TestJornadaSerializer:
    """Tests para JornadaSerializer"""

    def test_jornada_serializer(self, jornada):
        serializer = JornadaSerializer(jornada)
        data = serializer.data
        
        assert data['id'] == jornada.id
        assert data['numero'] == jornada.numero
        assert 'partidos_count' in data

    def test_jornada_serializer_partidos_count(self, jornada, partido):
        serializer = JornadaSerializer(jornada)
        data = serializer.data
        
        assert data['partidos_count'] == 1

@pytest.mark.django_db
class TestSerializerEdgeCases:
    """Tests para casos edge de serializers"""

    def test_serializer_with_none_relationships(self):
        # Crear un jugador sin equipo_real
        jugador = Jugador.objects.create(
            nombre='Jugador Sin Equipo Real',
            posicion='DEL',
            valor=5000000,
            puntos_totales=0,
            equipo_real=None
        )
        
        serializer = JugadorSerializer(jugador)
        data = serializer.data
        
        # No debería fallar, debería manejar None correctamente
        assert data['equipo_real_nombre'] is None

    def test_serializer_empty_data(self):
        # Probar serializers con datos vacíos
        serializer = RegisterSerializer(data={})
        assert serializer.is_valid() is False
        
        serializer = LoginSerializer(data={})
        assert serializer.is_valid() is False

    def test_serializer_invalid_data_types(self):
        # Probar con tipos de datos incorrectos
        data = {
            'username': 123,  # Debería ser string
            'email': 'invalid-email',
            'password': 'pass',
            'password2': 'pass'
        }
        serializer = RegisterSerializer(data=data)
        # Depende de las validaciones, pero al menos debería procesarlo
        assert serializer.is_valid() is False

    def test_serializer_method_fields(self, jugador_portero, multiple_puntuaciones):
        # Verificar que los campos método no fallen con datos complejos
        serializer = JugadorSerializer(jugador_portero)
        data = serializer.data
        
        # Los campos método deberían estar presentes
        assert 'puntuaciones_jornadas' in data
        assert isinstance(data['puntuaciones_jornadas'], list)