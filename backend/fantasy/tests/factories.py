"""
Factory Boy factories para crear datos de prueba
"""
import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal, FuzzyInteger
from django.contrib.auth.models import User
from fantasy.models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, AlineacionCongelada


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


class EquipoRealFactory(DjangoModelFactory):
    """Factory para crear equipos reales de prueba"""
    class Meta:
        model = EquipoReal

    nombre = factory.Sequence(lambda n: f'Equipo Real {n}')


class JugadorFactory(DjangoModelFactory):
    """Factory para crear jugadores de prueba"""
    class Meta:
        model = Jugador

    nombre = factory.Faker('name')
    posicion = FuzzyChoice(['POR', 'DEF', 'DEL'])  # Fútbol sala: solo POR, DEF, DEL
    valor = FuzzyDecimal(1000000, 15000000)
    puntos_totales = FuzzyInteger(0, 100)
    equipo_real = factory.SubFactory(EquipoRealFactory)
    goles = FuzzyInteger(0, 20)

    # Campos por defecto para jugadores libres
    equipo = None
    en_venta = False
    en_banquillo = True


class PorteroFactory(JugadorFactory):
    """Factory específico para porteros"""
    posicion = 'POR'
    valor = FuzzyDecimal(6000000, 12000000)


class DefensaFactory(JugadorFactory):
    """Factory específico para defensas"""
    posicion = 'DEF'
    valor = FuzzyDecimal(4000000, 10000000)


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
    puntos_totales = FuzzyInteger(0, 200)

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

    numero = factory.Sequence(lambda n: n + 1)
    # fecha se auto-genera con auto_now_add=True


class PuntuacionFactory(DjangoModelFactory):
    """Factory para crear puntuaciones de prueba"""
    class Meta:
        model = Puntuacion

    jugador = factory.SubFactory(JugadorFactory)
    jornada = factory.SubFactory(JornadaFactory)
    puntos = FuzzyInteger(0, 15)
    goles = FuzzyInteger(0, 3)


class AlineacionCongeladaFactory(DjangoModelFactory):
    """Factory para crear alineaciones congeladas de prueba"""
    class Meta:
        model = AlineacionCongelada

    equipo = factory.SubFactory(EquipoFactory)
    jornada = factory.SubFactory(JornadaFactory)
    tiene_posiciones_completas = True
    puntos_obtenidos = FuzzyInteger(0, 50)
    dinero_ganado = factory.LazyAttribute(lambda o: o.puntos_obtenidos * 100000)
    posiciones_faltantes = factory.LazyFunction(list)

    @factory.post_generation
    def jugadores_titulares(self, create, extracted, **kwargs):
        """
        Permite añadir jugadores titulares al crear la alineación:
        AlineacionCongeladaFactory.create(jugadores_titulares=[jugador1, jugador2])
        """
        if not create:
            return

        if extracted:
            for jugador in extracted:
                self.jugadores_titulares.add(jugador)
        else:
            # Por defecto, crear una formación válida de fútbol sala: 1 POR + 4 jugadores campo
            porteros = PorteroFactory.create_batch(1)
            defensas = DefensaFactory.create_batch(2)
            delanteros = DelanteroFactory.create_batch(2)
            
            for jugador in porteros + defensas + delanteros:
                self.jugadores_titulares.add(jugador)


# Factories especializadas para formación de fútbol sala
class FormacionFutbolSalaFactory(AlineacionCongeladaFactory):
    """Factory para crear alineaciones con formación específica de fútbol sala"""
    
    @factory.post_generation
    def jugadores_titulares(self, create, extracted, **kwargs):
        if not create:
            return

        # Crear formación exacta de fútbol sala: 1 POR + 2 DEF + 2 DEL
        porteros = PorteroFactory.create_batch(1)
        defensas = DefensaFactory.create_batch(2)
        delanteros = DelanteroFactory.create_batch(2)
        
        for jugador in porteros + defensas + delanteros:
            self.jugadores_titulares.add(jugador)
        
        # Marcar como formación completa
        self.tiene_posiciones_completas = True
        self.posiciones_faltantes = []
        self.save()


class FormacionIncompletaFactory(AlineacionCongeladaFactory):
    """Factory para crear alineaciones incompletas de fútbol sala"""
    
    @factory.post_generation
    def jugadores_titulares(self, create, extracted, **kwargs):
        if not create:
            return

        # Crear formación incompleta: solo 3 jugadores, sin portero
        defensas = DefensaFactory.create_batch(2)
        delanteros = DelanteroFactory.create_batch(1)
        
        for jugador in defensas + delanteros:
            self.jugadores_titulares.add(jugador)
        
        # Marcar como formación incompleta
        self.tiene_posiciones_completas = False
        self.posiciones_faltantes = ['POR', 'JUGADORES (tienes 3, necesitas 5)']
        self.save()


class AlineacionConPuntuacionesFactory(AlineacionCongeladaFactory):
    """Factory para crear alineaciones con puntuaciones pre-calculadas"""
    
    @factory.post_generation
    def jugadores_titulares(self, create, extracted, **kwargs):
        if not create:
            return

        # Crear jugadores con puntuaciones para la jornada
        porteros = PorteroFactory.create_batch(1)
        defensas = DefensaFactory.create_batch(2)
        delanteros = DelanteroFactory.create_batch(2)
        
        todos_jugadores = porteros + defensas + delanteros
        
        # Asignar puntuaciones realistas a cada jugador
        puntos_totales = 0
        for i, jugador in enumerate(todos_jugadores):
            puntos_jugador = (i + 1) * 2  # 2, 4, 6, 8, 10 puntos
            PuntuacionFactory.create(
                jugador=jugador,
                jornada=self.jornada,
                puntos=puntos_jugador,
                goles=1 if jugador.posicion == 'DEL' and i % 2 == 0 else 0
            )
            puntos_totales += puntos_jugador
            self.jugadores_titulares.add(jugador)
        
        # Actualizar puntos y dinero
        self.puntos_obtenidos = puntos_totales
        self.dinero_ganado = puntos_totales * 100000
        self.tiene_posiciones_completas = True
        self.save()