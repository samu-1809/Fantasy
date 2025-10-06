"""
Factory Boy factories para crear datos de prueba
"""
import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal, FuzzyInteger
from django.contrib.auth.models import User
from fantasy.models import Liga, Jugador, Equipo, Jornada, Puntuacion


class UserFactory(DjangoModelFactory):
    """Factory para crear usuarios de prueba"""
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@test.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override para usar create_user y hashear la contraseña"""
        manager = cls._get_manager(model_class)
        # Asegurar que la contraseña esté hasheada
        password = kwargs.pop('password', 'testpass123')
        user = manager.create_user(*args, **kwargs)
        user.set_password(password)
        user.save()
        return user


class LigaFactory(DjangoModelFactory):
    """Factory para crear ligas de prueba"""
    class Meta:
        model = Liga

    nombre = factory.Sequence(lambda n: f'Liga {n}')
    codigo = factory.Sequence(lambda n: f'LIG{n:04d}')
    presupuesto_inicial = FuzzyDecimal(40000000, 60000000)
    jornada_actual = FuzzyInteger(1, 10)


class JugadorFactory(DjangoModelFactory):
    """Factory para crear jugadores de prueba"""
    class Meta:
        model = Jugador

    nombre = factory.Faker('name')
    posicion = FuzzyChoice(['POR', 'DEF', 'MED', 'DEL'])
    valor = FuzzyDecimal(1000000, 15000000)
    puntos_totales = FuzzyInteger(0, 100)


class PorteroFactory(JugadorFactory):
    """Factory específico para porteros"""
    posicion = 'POR'
    valor = FuzzyDecimal(6000000, 12000000)


class DefensaFactory(JugadorFactory):
    """Factory específico para defensas"""
    posicion = 'DEF'
    valor = FuzzyDecimal(4000000, 10000000)


class MedioFactory(JugadorFactory):
    """Factory específico para centrocampistas"""
    posicion = 'MED'
    valor = FuzzyDecimal(5000000, 12000000)


class DelanteroFactory(JugadorFactory):
    """Factory específico para delanteros"""
    posicion = 'DEL'
    valor = FuzzyDecimal(6000000, 15000000)


class EquipoFactory(DjangoModelFactory):
    """Factory para crear equipos de prueba"""
    class Meta:
        model = Equipo

    usuario = factory.SubFactory(UserFactory)
    liga = factory.SubFactory(LigaFactory)
    nombre = factory.Sequence(lambda n: f'Equipo {n}')
    presupuesto = FuzzyDecimal(30000000, 50000000)

    @factory.post_generation
    def jugadores(self, create, extracted, **kwargs):
        """
        Permite añadir jugadores al crear el equipo:
        EquipoFactory.create(jugadores=[jugador1, jugador2])
        """
        if not create:
            return

        if extracted:
            for jugador in extracted:
                self.jugadores.add(jugador)


class JornadaFactory(DjangoModelFactory):
    """Factory para crear jornadas de prueba"""
    class Meta:
        model = Jornada

    liga = factory.SubFactory(LigaFactory)
    numero = factory.Sequence(lambda n: n + 1)


class PuntuacionFactory(DjangoModelFactory):
    """Factory para crear puntuaciones de prueba"""
    class Meta:
        model = Puntuacion

    jugador = factory.SubFactory(JugadorFactory)
    jornada = factory.SubFactory(JornadaFactory)
    puntos = FuzzyInteger(0, 10)
