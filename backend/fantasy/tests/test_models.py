"""
Tests para los modelos de Fantasy
"""
import pytest
from django.db import IntegrityError
from fantasy.models import Liga, Jugador, Equipo, Jornada, Puntuacion
from .factories import (
    UserFactory, LigaFactory, JugadorFactory, EquipoFactory,
    JornadaFactory, PuntuacionFactory, PorteroFactory
)


@pytest.mark.django_db
class TestLigaModel:
    """Tests para el modelo Liga"""

    def test_create_liga(self):
        """Crear una liga con valores por defecto"""
        liga = LigaFactory()
        assert liga.id is not None
        assert liga.presupuesto_inicial > 0
        assert liga.jornada_actual >= 1

    def test_codigo_unico(self):
        """El código de liga debe ser único"""
        liga1 = LigaFactory(codigo='UNIQUE2024')
        with pytest.raises(IntegrityError):
            LigaFactory(codigo='UNIQUE2024')

    def test_str_representation(self):
        """__str__ devuelve el nombre de la liga"""
        liga = LigaFactory(nombre='Liga Test')
        assert str(liga) == 'Liga Test'


@pytest.mark.django_db
class TestJugadorModel:
    """Tests para el modelo Jugador"""

    def test_create_jugador(self):
        """Crear un jugador"""
        jugador = JugadorFactory(nombre='Test Player', posicion='DEL')
        assert jugador.id is not None
        assert jugador.nombre == 'Test Player'
        assert jugador.posicion == 'DEL'

    def test_posiciones_validas(self):
        """Todas las posiciones deben ser válidas"""
        posiciones = ['POR', 'DEF', 'MED', 'DEL']
        for pos in posiciones:
            jugador = JugadorFactory(posicion=pos)
            assert jugador.posicion == pos

    def test_puntos_totales_default(self):
        """Puntos totales por defecto es 0"""
        jugador = JugadorFactory()
        assert jugador.puntos_totales == 0

    def test_str_representation(self):
        """__str__ incluye nombre y posición"""
        jugador = JugadorFactory(nombre='Messi', posicion='DEL')
        assert 'Messi' in str(jugador)
        assert 'DEL' in str(jugador)


@pytest.mark.django_db
class TestEquipoModel:
    """Tests para el modelo Equipo"""

    def test_create_equipo(self, user, liga):
        """Crear un equipo"""
        equipo = Equipo.objects.create(
            usuario=user,
            liga=liga,
            nombre='Mi Equipo',
            presupuesto=50000000
        )
        assert equipo.id is not None
        assert equipo.nombre == 'Mi Equipo'

    def test_unique_together_usuario_liga(self, user, liga):
        """Un usuario solo puede tener un equipo por liga"""
        Equipo.objects.create(usuario=user, liga=liga, nombre='Equipo 1', presupuesto=50000000)
        with pytest.raises(IntegrityError):
            Equipo.objects.create(usuario=user, liga=liga, nombre='Equipo 2', presupuesto=50000000)

    def test_equipo_puede_tener_jugadores(self, equipo, jugador_portero, jugador_defensa):
        """Equipo puede tener múltiples jugadores"""
        equipo.jugadores.add(jugador_portero, jugador_defensa)
        assert equipo.jugadores.count() == 2

    def test_str_representation(self, equipo):
        """__str__ incluye nombre y username"""
        result = str(equipo)
        assert equipo.nombre in result
        assert equipo.usuario.username in result


@pytest.mark.django_db
class TestJornadaModel:
    """Tests para el modelo Jornada"""

    def test_create_jornada(self, liga):
        """Crear una jornada"""
        jornada = Jornada.objects.create(liga=liga, numero=1)
        assert jornada.id is not None
        assert jornada.numero == 1

    def test_unique_together_liga_numero(self, liga):
        """No puede haber dos jornadas con el mismo número en una liga"""
        Jornada.objects.create(liga=liga, numero=1)
        with pytest.raises(IntegrityError):
            Jornada.objects.create(liga=liga, numero=1)

    def test_str_representation(self, jornada):
        """__str__ incluye número y liga"""
        result = str(jornada)
        assert f'Jornada {jornada.numero}' in result


@pytest.mark.django_db
class TestPuntuacionModel:
    """Tests para el modelo Puntuacion"""

    def test_create_puntuacion(self, jugador_portero, jornada):
        """Crear una puntuación"""
        puntuacion = Puntuacion.objects.create(
            jugador=jugador_portero,
            jornada=jornada,
            puntos=8
        )
        assert puntuacion.id is not None
        assert puntuacion.puntos == 8

    def test_unique_together_jugador_jornada(self, jugador_portero, jornada):
        """Un jugador solo puede tener una puntuación por jornada"""
        Puntuacion.objects.create(jugador=jugador_portero, jornada=jornada, puntos=8)
        with pytest.raises(IntegrityError):
            Puntuacion.objects.create(jugador=jugador_portero, jornada=jornada, puntos=7)

    def test_str_representation(self, jugador_portero, jornada):
        """__str__ incluye jugador, jornada y puntos"""
        puntuacion = Puntuacion.objects.create(
            jugador=jugador_portero,
            jornada=jornada,
            puntos=8
        )
        result = str(puntuacion)
        assert jugador_portero.nombre in result
        assert '8' in result
