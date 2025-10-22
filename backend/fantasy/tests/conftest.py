"""
Configuración de pytest y fixtures compartidos
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from unittest.mock import MagicMock
from django.utils import timezone
from datetime import timedelta
from fantasy.models import (
    Liga, Jugador, Equipo, Jornada, EquipoReal, 
    AlineacionCongelada, Puntuacion, Partido, Oferta, Puja, Notificacion
)


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
        jornada_actual=1
    )


@pytest.fixture
def equipo_real(db):
    """Equipo real de prueba"""
    return EquipoReal.objects.create(nombre='Equipo Real Test')


@pytest.fixture
def equipo_real2(db):
    """Segundo equipo real de prueba"""
    return EquipoReal.objects.create(nombre='Equipo Real Test 2')


@pytest.fixture
def jugador_portero(db, equipo_real):
    """Jugador portero de prueba"""
    return Jugador.objects.create(
        nombre='Portero Test',
        posicion='POR',
        valor=8000000,
        puntos_totales=0,
        equipo_real=equipo_real
    )


@pytest.fixture
def jugador_defensa(db, equipo_real):
    """Jugador defensa de prueba"""
    return Jugador.objects.create(
        nombre='Defensa Test',
        posicion='DEF',
        valor=6000000,
        puntos_totales=0,
        equipo_real=equipo_real
    )


@pytest.fixture
def jugador_delantero(db, equipo_real):
    """Jugador delantero de prueba"""
    return Jugador.objects.create(
        nombre='Delantero Test',
        posicion='DEL',
        valor=9000000,
        puntos_totales=0,
        equipo_real=equipo_real
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
def equipo2(db, user2, liga):
    """Segundo equipo de prueba"""
    return Equipo.objects.create(
        usuario=user2,
        liga=liga,
        nombre='Equipo Test 2',
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
def jornada(db):
    """Jornada de prueba"""
    return Jornada.objects.create(numero=1)


@pytest.fixture
def jornada2(db):
    """Segunda jornada de prueba"""
    return Jornada.objects.create(numero=2)


# FIXTURES PARA ALINEACIÓN CONGELADA Y FÚTBOL SALA

@pytest.fixture
def jugadores_futbol_sala(db, equipo_real):
    """8 jugadores para formación de fútbol sala (5 titulares + 3 suplentes)"""
    jugadores = []
    
    # 2 porteros
    for i in range(2):
        jugadores.append(Jugador.objects.create(
            nombre=f'Portero {i+1}',
            posicion='POR',
            valor=7000000 + i * 1000000,
            puntos_totales=0,
            equipo_real=equipo_real
        ))
    
    # 3 defensas
    for i in range(3):
        jugadores.append(Jugador.objects.create(
            nombre=f'Defensa {i+1}',
            posicion='DEF',
            valor=5000000 + i * 800000,
            puntos_totales=0,
            equipo_real=equipo_real
        ))
    
    # 3 delanteros
    for i in range(3):
        jugadores.append(Jugador.objects.create(
            nombre=f'Delantero {i+1}',
            posicion='DEL',
            valor=8000000 + i * 1000000,
            puntos_totales=0,
            equipo_real=equipo_real
        ))
    
    return jugadores


@pytest.fixture
def equipo_con_alineacion_futbol_sala(db, equipo, jugadores_futbol_sala):
    """Equipo con 5 jugadores titulares (formación fútbol sala)"""
    # Asignar 5 jugadores como titulares
    for jugador in jugadores_futbol_sala[:5]:
        jugador.equipo = equipo
        jugador.en_banquillo = False
        jugador.save()
    
    # Los otros 3 como suplentes
    for jugador in jugadores_futbol_sala[5:8]:
        jugador.equipo = equipo
        jugador.en_banquillo = True
        jugador.save()
    
    return equipo


@pytest.fixture
def alineacion_congelada(db, equipo, jornada, jugadores_futbol_sala):
    """Alineación congelada básica con 5 jugadores"""
    alineacion = AlineacionCongelada.objects.create(
        equipo=equipo,
        jornada=jornada,
        tiene_posiciones_completas=True,
        puntos_obtenidos=0,
        dinero_ganado=0
    )
    
    # Asignar 5 jugadores titulares
    for jugador in jugadores_futbol_sala[:5]:
        alineacion.jugadores_titulares.add(jugador)
    
    return alineacion


@pytest.fixture
def alineacion_congelada_con_puntos(db, equipo, jornada, jugadores_futbol_sala):
    """Alineación congelada con puntos calculados"""
    # Crear puntuaciones para los jugadores
    puntos_totales = 0
    for i, jugador in enumerate(jugadores_futbol_sala[:5]):
        puntos = (i + 1) * 3  # 3, 6, 9, 12, 15 puntos
        Puntuacion.objects.create(
            jugador=jugador,
            jornada=jornada,
            puntos=puntos,
            goles=1 if jugador.posicion == 'DEL' else 0
        )
        puntos_totales += puntos
    
    alineacion = AlineacionCongelada.objects.create(
        equipo=equipo,
        jornada=jornada,
        tiene_posiciones_completas=True,
        puntos_obtenidos=puntos_totales,
        dinero_ganado=puntos_totales * 100000
    )
    
    # Asignar jugadores titulares
    for jugador in jugadores_futbol_sala[:5]:
        alineacion.jugadores_titulares.add(jugador)
    
    return alineacion


@pytest.fixture
def jugadores_con_puntuaciones(db, jornada, equipo_real):
    """Jugadores con puntuaciones predefinidas"""
    jugadores = []
    
    # Crear 5 jugadores con diferentes puntuaciones
    posiciones = ['POR', 'DEF', 'DEF', 'DEL', 'DEL']
    for i, pos in enumerate(posiciones):
        jugador = Jugador.objects.create(
            nombre=f'Jugador {pos} {i+1}',
            posicion=pos,
            valor=5000000 + i * 1000000,
            puntos_totales=0,
            equipo_real=equipo_real
        )
        
        # Crear puntuación
        puntos = (i + 1) * 4  # 4, 8, 12, 16, 20 puntos
        Puntuacion.objects.create(
            jugador=jugador,
            jornada=jornada,
            puntos=puntos,
            goles=2 if pos == 'DEL' else 0
        )
        
        jugadores.append(jugador)
    
    return jugadores


@pytest.fixture
def alineacion_incompleta(db, equipo, jornada, jugadores_futbol_sala):
    """Alineación congelada incompleta (solo 3 jugadores, sin portero)"""
    alineacion = AlineacionCongelada.objects.create(
        equipo=equipo,
        jornada=jornada,
        tiene_posiciones_completas=False,
        puntos_obtenidos=0,
        dinero_ganado=0,
        posiciones_faltantes=['POR', 'JUGADORES (tienes 3, necesitas 5)']
    )
    
    # Asignar solo 3 jugadores (sin portero)
    for jugador in jugadores_futbol_sala[2:5]:  # 3 defensas/delanteros
        alineacion.jugadores_titulares.add(jugador)
    
    return alineacion


# FIXTURES PARA PARTIDOS

@pytest.fixture
def partido(db, jornada, equipo_real, equipo_real2):
    """Partido de prueba con dos equipos reales diferentes"""
    return Partido.objects.create(
        jornada=jornada,
        equipo_local=equipo_real,
        equipo_visitante=equipo_real2,
        fecha=timezone.now(),
        goles_local=2,
        goles_visitante=1,
        jugado=True
    )


@pytest.fixture
def partido_no_jugado(db, jornada, equipo_real, equipo_real2):
    """Partido no jugado de prueba"""
    return Partido.objects.create(
        jornada=jornada,
        equipo_local=equipo_real,
        equipo_visitante=equipo_real2,
        fecha=timezone.now() + timezone.timedelta(days=1),
        jugado=False
    )


# FIXTURES PARA OFERTAS Y PUJAS

@pytest.fixture
def oferta_pendiente(db, jugador_portero, equipo, equipo2):
    """Oferta pendiente de prueba"""
    # Asignar jugador al equipo2
    jugador_portero.equipo = equipo2
    jugador_portero.save()
    
    return Oferta.objects.create(
        jugador=jugador_portero,
        equipo_ofertante=equipo,
        equipo_receptor=equipo2,
        monto=10000000,
        estado='pendiente'
    )


@pytest.fixture
def oferta_aceptada(db, jugador_defensa, equipo, equipo2):
    """Oferta aceptada de prueba"""
    jugador_defensa.equipo = equipo2
    jugador_defensa.save()
    
    return Oferta.objects.create(
        jugador=jugador_defensa,
        equipo_ofertante=equipo,
        equipo_receptor=equipo2,
        monto=8000000,
        estado='aceptada',
        fecha_respuesta=timezone.now()
    )


@pytest.fixture
def oferta_rechazada(db, jugador_delantero, equipo, equipo2):
    """Oferta rechazada de prueba"""
    jugador_delantero.equipo = equipo2
    jugador_delantero.save()
    
    return Oferta.objects.create(
        jugador=jugador_delantero,
        equipo_ofertante=equipo,
        equipo_receptor=equipo2,
        monto=12000000,
        estado='rechazada',
        fecha_respuesta=timezone.now()
    )

@pytest.fixture
def oferta_retirada(db, equipo, equipo2, jugador_usuario):
    """Oferta retirada por el ofertante"""
    return Oferta.objects.create(
        jugador=jugador_usuario,
        equipo_receptor=equipo2,
        equipo_ofertante=equipo,
        monto=9000000,
        estado='retirada',
        fecha_respuesta=timezone.now()
    )

@pytest.fixture
def puja_activa(db, jugador_portero, equipo):
    """Puja activa de prueba"""
    # Poner jugador en mercado
    jugador_portero.en_venta = True
    jugador_portero.fecha_mercado = timezone.now()
    jugador_portero.save()
    
    return Puja.objects.create(
        jugador=jugador_portero,
        equipo=equipo,
        monto=10000000,
        activa=True
    )

@pytest.fixture
def puja_inactiva(db, equipo, jugador_mercado):
    """Puja inactiva de un equipo por un jugador del mercado"""
    return Puja.objects.create(
        jugador=jugador_mercado,
        equipo=equipo,
        monto=6000000,
        activa=False
    )

@pytest.fixture
def puja_ganadora(db, jugador_defensa, equipo):
    """Puja ganadora de prueba"""
    jugador_defensa.en_venta = True
    jugador_defensa.fecha_mercado = timezone.now()
    jugador_defensa.save()
    
    return Puja.objects.create(
        jugador=jugador_defensa,
        equipo=equipo,
        monto=15000000,
        es_ganadora=True,
        activa=True
    )


@pytest.fixture
def jugador_en_mercado(db, equipo_real, equipo):
    """Jugador en el mercado de transferencias"""
    jugador = Jugador.objects.create(
        nombre='Jugador Mercado Test',
        posicion='DEL',
        valor=10000000,
        puntos_totales=50,
        equipo_real=equipo_real,
        equipo=equipo,  # Tiene equipo actual
        en_venta=True,
        fecha_mercado=timezone.now(),
        precio_venta=15000000
    )
    return jugador


@pytest.fixture
def jugador_libre_en_mercado(db, equipo_real):
    """Jugador libre en el mercado de transferencias"""
    jugador = Jugador.objects.create(
        nombre='Jugador Libre Test',
        posicion='DEF',
        valor=5000000,
        puntos_totales=30,
        equipo_real=equipo_real,
        equipo=None,  # Jugador libre
        en_venta=True,
        fecha_mercado=timezone.now(),
        precio_venta=8000000
    )
    return jugador


@pytest.fixture
def jugador_libre(db, equipo_real):
    """Jugador libre (sin equipo fantasy)"""
    return Jugador.objects.create(
        nombre='Jugador Libre',
        posicion='DEL',
        valor=7000000,
        puntos_totales=0,
        equipo_real=equipo_real,
        equipo=None,
        en_venta=False
    )


# FIXTURES PARA PUNTUACIONES

@pytest.fixture
def puntuacion_jugador(db, jugador_portero, jornada):
    """Puntuación de jugador para una jornada"""
    return Puntuacion.objects.create(
        jugador=jugador_portero,
        jornada=jornada,
        puntos=8,
        goles=0
    )


@pytest.fixture
def multiple_puntuaciones(db, jugadores_con_puntuaciones, jornada):
    """Múltiples puntuaciones para testing"""
    return Puntuacion.objects.filter(jornada=jornada)

@pytest.fixture
def multiple_ofertas_pendientes(db, equipo, equipo2, jugador_usuario):
    """Múltiples ofertas pendientes para el mismo jugador"""
    oferta1 = Oferta.objects.create(
        jugador=jugador_usuario,
        equipo_receptor=equipo2,
        equipo_ofertante=equipo,
        monto=9000000,
        estado='pendiente'
    )
    
    # Crear otro equipo para más ofertas
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user3 = User.objects.create_user(
        username='testuser3',
        password='testpass123',
        email='test3@example.com'
    )
    equipo3 = Equipo.objects.create(
        usuario=user3,
        liga=equipo.liga,
        nombre='Equipo3',
        presupuesto=50000000
    )
    
    oferta2 = Oferta.objects.create(
        jugador=jugador_usuario,
        equipo_receptor=equipo2,
        equipo_ofertante=equipo3,
        monto=9500000,
        estado='pendiente'
    )
    
    return [oferta1, oferta2]
    
# FIXTURES PARA TESTING DE ALINEACIONES CONGELADAS ESPECÍFICAS

@pytest.fixture
def alineacion_con_puntuaciones_calculadas(db, equipo, jornada, jugadores_con_puntuaciones):
    """Alineación congelada con puntuaciones ya calculadas"""
    # Asignar jugadores al equipo
    for jugador in jugadores_con_puntuaciones:
        jugador.equipo = equipo
        jugador.en_banquillo = False
        jugador.save()
    
    # Calcular puntos totales
    puntos_totales = sum(
        Puntuacion.objects.get(jugador=jugador, jornada=jornada).puntos 
        for jugador in jugadores_con_puntuaciones
    )
    
    alineacion = AlineacionCongelada.objects.create(
        equipo=equipo,
        jornada=jornada,
        tiene_posiciones_completas=True,
        puntos_obtenidos=puntos_totales,
        dinero_ganado=puntos_totales * 100000
    )
    
    # Asignar jugadores titulares
    for jugador in jugadores_con_puntuaciones:
        alineacion.jugadores_titulares.add(jugador)
    
    return alineacion


# FIXTURES PARA REGISTRO DE USUARIOS

@pytest.fixture
def jugadores_libres_para_registro(db, equipo_real):
    """7 jugadores libres para pruebas de registro (1 POR, 3 DEF, 3 DEL)"""
    jugadores = []
    
    # 1 portero
    jugadores.append(Jugador.objects.create(
        nombre='Portero Libre 1',
        posicion='POR',
        valor=5000000,  # Valor que quepa en presupuesto
        puntos_totales=0,
        equipo_real=equipo_real
    ))
    
    # 3 defensas
    for i in range(3):
        jugadores.append(Jugador.objects.create(
            nombre=f'Defensa Libre {i+1}',
            posicion='DEF',
            valor=3000000 + i * 1000000,
            puntos_totales=0,
            equipo_real=equipo_real
        ))
    
    # 3 delanteros
    for i in range(3):
        jugadores.append(Jugador.objects.create(
            nombre=f'Delantero Libre {i+1}',
            posicion='DEL',
            valor=4000000 + i * 1000000,
            puntos_totales=0,
            equipo_real=equipo_real
        ))
    
    return jugadores


# FIXTURES ADICIONALES PARA TESTS ESPECÍFICOS

@pytest.fixture
def jugador_con_puntuaciones_multiples_jornadas(db, equipo_real, jornada, jornada2):
    """Jugador con puntuaciones en múltiples jornadas"""
    jugador = Jugador.objects.create(
        nombre='Jugador Multi Jornada',
        posicion='DEL',
        valor=6000000,
        puntos_totales=0,
        equipo_real=equipo_real
    )
    
    # Crear puntuaciones en dos jornadas
    Puntuacion.objects.create(jugador=jugador, jornada=jornada, puntos=8, goles=1)
    Puntuacion.objects.create(jugador=jugador, jornada=jornada2, puntos=6, goles=0)
    
    return jugador


@pytest.fixture
def partido_con_jugadores_asignados(db, jornada, equipo_real, equipo_real2, jugadores_futbol_sala):
    """Partido con jugadores asignados a los equipos reales"""
    # Asignar algunos jugadores al equipo local
    for jugador in jugadores_futbol_sala[:3]:
        jugador.equipo_real = equipo_real
        jugador.save()
    
    # Asignar otros jugadores al equipo visitante
    for jugador in jugadores_futbol_sala[3:6]:
        jugador.equipo_real = equipo_real2
        jugador.save()
    
    return Partido.objects.create(
        jornada=jornada,
        equipo_local=equipo_real,
        equipo_visitante=equipo_real2,
        fecha=timezone.now(),
        goles_local=2,
        goles_visitante=1,
        jugado=True
    )


@pytest.fixture
def equipo_con_jugadores_y_puntuaciones(db, equipo, jornada, jugadores_con_puntuaciones):
    """Equipo con jugadores que tienen puntuaciones"""
    # Asignar jugadores al equipo
    for jugador in jugadores_con_puntuaciones:
        jugador.equipo = equipo
        jugador.en_banquillo = False
        jugador.save()
    
    return equipo


# FIXTURES ADICIONALES PARA UTILS_VIEWS

@pytest.fixture
def jugador_con_subasta_expirada(db, equipo_real, equipo):
    """Jugador con subasta expirada"""
    jugador = Jugador.objects.create(
        nombre='Jugador Subasta Expirada',
        posicion='DEL',
        valor=10000000,
        puntos_totales=40,
        equipo_real=equipo_real,
        equipo=equipo,
        en_venta=True,
        fecha_mercado=timezone.now() - timedelta(hours=25),  # Expirado
        precio_venta=15000000,
        puja_actual=12000000,
        equipo_pujador=equipo
    )
    return jugador

@pytest.fixture
def jugador_con_subasta_activa(db, equipo_real, equipo):
    """Jugador con subasta aún activa"""
    jugador = Jugador.objects.create(
        nombre='Jugador Subasta Activa',
        posicion='DEF',
        valor=6000000,
        puntos_totales=25,
        equipo_real=equipo_real,
        equipo=equipo,
        en_venta=True,
        fecha_mercado=timezone.now() - timedelta(hours=23),  # Aún activa
        precio_venta=8000000
    )
    return jugador

@pytest.fixture
def multiple_jugadores_mercado(db, equipo_real):
    """Múltiples jugadores en el mercado para testing"""
    jugadores = []
    for i in range(5):
        jugador = Jugador.objects.create(
            nombre=f'Jugador Mercado {i+1}',
            posicion=['POR', 'DEF', 'DEF', 'DEL', 'DEL'][i],
            valor=5000000 + i * 1000000,
            puntos_totales=10 + i * 5,
            equipo_real=equipo_real,
            equipo=None,
            en_venta=True,
            fecha_mercado=timezone.now()
        )
        jugadores.append(jugador)
    return jugadores

@pytest.fixture
def equipo_con_multiple_jugadores(db, user, liga, jugadores_futbol_sala):
    """Equipo con múltiples jugadores para testing"""
    equipo = Equipo.objects.create(
        usuario=user,
        liga=liga,
        nombre='Equipo Completo',
        presupuesto=50000000
    )
    
    # Asignar todos los jugadores al equipo
    for jugador in jugadores_futbol_sala:
        jugador.equipo = equipo
        jugador.en_banquillo = False
        jugador.save()
    
    return equipo

@pytest.fixture
def jugador_mercado(db, equipo_real):
    """Jugador del mercado (sin equipo) en venta"""
    return Jugador.objects.create(
        nombre='Jugador Mercado',
        posicion='DEL',
        valor=5000000,
        puntos_totales=30,
        equipo_real=equipo_real,
        equipo=None,
        en_venta=True,
        fecha_mercado=timezone.now(),
        puja_actual=5000000,
        equipo_pujador=None
    )

@pytest.fixture
def jugador_usuario(db, equipo_real, equipo2):
    """Jugador de un usuario en venta"""
    return Jugador.objects.create(
        nombre='Jugador Usuario',
        posicion='MED',
        valor=7000000,
        puntos_totales=35,
        equipo_real=equipo_real,
        equipo=equipo2,  # Pertenece a otro usuario
        en_venta=True,
        fecha_mercado=timezone.now(),
        precio_venta=10000000,
        puja_actual=None,
        equipo_pujador=None
    )

# FIXTURES PARA NOTIFICACIONES

@pytest.fixture
def notificacion_publica(db):
    """Notificación pública"""
    return Notificacion.objects.create(
        titulo='Notificación Pública',
        mensaje='Esta es una notificación pública',
        tipo='publica',
        leida=False
    )

@pytest.fixture
def notificacion_privada(db, user):
    """Notificación privada para un usuario"""
    return Notificacion.objects.create(
        titulo='Notificación Privada',
        mensaje='Esta es una notificación privada',
        tipo='privada',
        destinatario=user,
        leida=False
    )

@pytest.fixture
def notificacion_leida(db, user):
    """Notificación ya leída"""
    return Notificacion.objects.create(
        titulo='Notificación Leída',
        mensaje='Esta notificación ya fue leída',
        tipo='privada',
        destinatario=user,
        leida=True
    )

@pytest.fixture
def notificacion_otro_usuario(db, user2):
    """Notificación para otro usuario"""
    return Notificacion.objects.create(
        titulo='Notificación Otro Usuario',
        mensaje='Esta notificación es para otro usuario',
        tipo='privada',
        destinatario=user2,
        leida=False
    )

@pytest.fixture
def multiple_notificaciones(db, user):
    """Múltiples notificaciones para testing"""
    notificaciones = []
    
    # 3 notificaciones públicas
    for i in range(3):
        notificaciones.append(Notificacion.objects.create(
            titulo=f'Notificación Pública {i+1}',
            mensaje=f'Mensaje público {i+1}',
            tipo='publica',
            leida=False
        ))
    
    # 2 notificaciones privadas
    for i in range(2):
        notificaciones.append(Notificacion.objects.create(
            titulo=f'Notificación Privada {i+1}',
            mensaje=f'Mensaje privado {i+1}',
            tipo='privada',
            destinatario=user,
            leida=False
        ))
    
    # 1 notificación leída
    notificaciones.append(Notificacion.objects.create(
        titulo='Notificación Leída',
        mensaje='Esta ya fue leída',
        tipo='privada',
        destinatario=user,
        leida=True
    ))
    
    return notificaciones

# Añadir estos fixtures al conftest.py existente

@pytest.fixture
def jugadores_libres_mercado(db, equipo_real):
    """Jugadores libres para el mercado rotatorio"""
    jugadores = []
    posiciones = ['POR', 'DEF', 'DEF', 'MED', 'MED', 'DEL', 'DEL', 'DEL']
    
    for i, pos in enumerate(posiciones):
        jugador = Jugador.objects.create(
            nombre=f'Jugador Libre {i+1}',
            posicion=pos,
            valor=3000000 + i * 500000,
            puntos_totales=20 + i * 5,
            equipo_real=equipo_real,
            equipo=None,
            en_venta=False,
            fecha_mercado=None
        )
        jugadores.append(jugador)
    
    return jugadores

@pytest.fixture
def jugador_libre_en_mercado_activo(db, equipo_real):
    """Jugador libre activo en el mercado"""
    jugador = Jugador.objects.create(
        nombre='Jugador Libre Activo',
        posicion='DEL',
        valor=5000000,
        puntos_totales=35,
        equipo_real=equipo_real,
        equipo=None,
        en_venta=True,
        fecha_mercado=timezone.now() - timedelta(hours=12),  # 12 horas en mercado
        puja_actual=5500000,
        equipo_pujador=None
    )
    return jugador

@pytest.fixture
def jugador_libre_en_mercado_expirado(db, equipo_real):
    """Jugador libre expirado en el mercado"""
    jugador = Jugador.objects.create(
        nombre='Jugador Libre Expirado',
        posicion='DEF',
        valor=4000000,
        puntos_totales=25,
        equipo_real=equipo_real,
        equipo=None,
        en_venta=True,
        fecha_mercado=timezone.now() - timedelta(hours=25),  # 25 horas (expirado)
        puja_actual=4500000,
        equipo_pujador=None
    )
    return jugador

@pytest.fixture
def jugador_usuario_en_venta(db, equipo2, equipo_real):
    """Jugador de usuario en venta"""
    jugador = Jugador.objects.create(
        nombre='Jugador Usuario Venta',
        posicion='MED',
        valor=7000000,
        puntos_totales=40,
        equipo_real=equipo_real,
        equipo=equipo2,
        en_venta=True,
        fecha_mercado=timezone.now() - timedelta(hours=6),
        precio_venta=10000000,
        puja_actual=8500000,
        equipo_pujador=None
    )
    return jugador

@pytest.fixture
def jugador_usuario_en_venta_24h(db, equipo2, equipo_real):
    """Jugador de usuario en venta por más de 24 horas (para ofertas automáticas)"""
    jugador = Jugador.objects.create(
        nombre='Jugador Usuario 24h',
        posicion='DEL',
        valor=8000000,
        puntos_totales=45,
        equipo_real=equipo_real,
        equipo=equipo2,
        en_venta=True,
        fecha_mercado=timezone.now() - timedelta(hours=25),
        precio_venta=12000000,
        puja_actual=9000000,
        equipo_pujador=None
    )
    return jugador

@pytest.fixture
def oferta_automatica(db, equipo, jugador_usuario_en_venta_24h):
    """Oferta automática generada por el sistema"""
    return Oferta.objects.create(
        jugador=jugador_usuario_en_venta_24h,
        equipo_ofertante=equipo,
        equipo_receptor=jugador_usuario_en_venta_24h.equipo,
        monto=9500000,
        estado='pendiente'
    )

@pytest.fixture
def puntuacion_jugador_mercado(db, jugador_libre_en_mercado_activo, jornada):
    """Puntuación para un jugador del mercado"""
    return Puntuacion.objects.create(
        jugador=jugador_libre_en_mercado_activo,
        jornada=jornada,
        puntos=8,
        goles=1
    )

@pytest.fixture
def multiple_puntuaciones_mercado(db, jugadores_libres_mercado, jornada, jornada2):
    """Múltiples puntuaciones para jugadores del mercado"""
    puntuaciones = []
    for i, jugador in enumerate(jugadores_libres_mercado):
        # Puntuación en jornada 1
        puntuaciones.append(Puntuacion.objects.create(
            jugador=jugador,
            jornada=jornada,
            puntos=5 + i,
            goles=1 if jugador.posicion == 'DEL' else 0
        ))
        # Puntuación en jornada 2
        puntuaciones.append(Puntuacion.objects.create(
            jugador=jugador,
            jornada=jornada2,
            puntos=3 + i,
            goles=0
        ))
    return puntuaciones

# Añadir estos fixtures al conftest.py existente

@pytest.fixture
def equipo_completo_con_jugadores(db, user, liga, jugadores_futbol_sala):
    """Equipo completo con 8 jugadores (5 titulares, 3 banquillo)"""
    equipo = Equipo.objects.create(
        usuario=user,
        liga=liga,
        nombre='Equipo Completo Test',
        presupuesto=50000000
    )
    
    # Asignar 5 jugadores como titulares y 3 en banquillo
    for i, jugador in enumerate(jugadores_futbol_sala):
        jugador.equipo = equipo
        jugador.en_banquillo = (i >= 5)  # Primeros 5 titulares, últimos 3 en banquillo
        jugador.save()
    
    return equipo

@pytest.fixture
def equipo_con_jugadores_posiciones(db, user, liga):
    """Equipo con jugadores específicos para probar alineaciones"""
    equipo = Equipo.objects.create(
        usuario=user,
        liga=liga,
        nombre='Equipo Posiciones Test',
        presupuesto=50000000
    )
    
    # Crear jugadores específicos
    porteros = [
        Jugador.objects.create(
            nombre='Portero Titular',
            posicion='POR',
            valor=8000000,
            puntos_totales=30,
            equipo_real=EquipoReal.objects.create(nombre='Real Madrid'),
            equipo=equipo,
            en_banquillo=False
        ),
        Jugador.objects.create(
            nombre='Portero Suplente',
            posicion='POR',
            valor=5000000,
            puntos_totales=15,
            equipo_real=EquipoReal.objects.create(nombre='Barcelona'),
            equipo=equipo,
            en_banquillo=True
        )
    ]
    
    defensas = [
        Jugador.objects.create(
            nombre='Defensa 1 Titular',
            posicion='DEF',
            valor=6000000,
            puntos_totales=25,
            equipo_real=EquipoReal.objects.create(nombre='Atlético'),
            equipo=equipo,
            en_banquillo=False
        ),
        Jugador.objects.create(
            nombre='Defensa 2 Titular',
            posicion='DEF',
            valor=5500000,
            puntos_totales=22,
            equipo_real=EquipoReal.objects.create(nombre='Sevilla'),
            equipo=equipo,
            en_banquillo=False
        ),
        Jugador.objects.create(
            nombre='Defensa Suplente',
            posicion='DEF',
            valor=4000000,
            puntos_totales=18,
            equipo_real=EquipoReal.objects.create(nombre='Valencia'),
            equipo=equipo,
            en_banquillo=True
        )
    ]
    
    delanteros = [
        Jugador.objects.create(
            nombre='Delantero 1 Titular',
            posicion='DEL',
            valor=9000000,
            puntos_totales=35,
            equipo_real=EquipoReal.objects.create(nombre='Villarreal'),
            equipo=equipo,
            en_banquillo=False
        ),
        Jugador.objects.create(
            nombre='Delantero 2 Titular',
            posicion='DEL',
            valor=8500000,
            puntos_totales=32,
            equipo_real=EquipoReal.objects.create(nombre='Betis'),
            equipo=equipo,
            en_banquillo=False
        ),
        Jugador.objects.create(
            nombre='Delantero Suplente',
            posicion='DEL',
            valor=7000000,
            puntos_totales=28,
            equipo_real=EquipoReal.objects.create(nombre='Athletic'),
            equipo=equipo,
            en_banquillo=True
        )
    ]
    
    return equipo

@pytest.fixture
def jugador_en_venta_con_pujas(db, equipo, equipo2, equipo_real):
    """Jugador en venta con pujas activas"""
    jugador = Jugador.objects.create(
        nombre='Jugador con Pujas',
        posicion='DEL',
        valor=10000000,
        puntos_totales=50,
        equipo_real=equipo_real,
        equipo=equipo,
        en_venta=True,
        fecha_mercado=timezone.now(),
        precio_venta=15000000
    )
    
    # Crear pujas activas
    Puja.objects.create(
        jugador=jugador,
        equipo=equipo2,
        monto=12000000,
        activa=True
    )
    
    return jugador

@pytest.fixture
def mock_crear_notificacion(monkeypatch):
    """Mock para la función crear_notificacion"""
    mock = MagicMock()
    monkeypatch.setattr('apps.fantasy.views.equipo_views.crear_notificacion', mock)
    return mock

# Añadir estos fixtures al conftest.py existente

@pytest.fixture
def equipos_clasificacion(db, liga, user, user2):
    """Múltiples equipos para pruebas de clasificación"""
    equipo1 = Equipo.objects.create(
        usuario=user,
        liga=liga,
        nombre='Equipo A',
        presupuesto=50000000
    )
    
    equipo2 = Equipo.objects.create(
        usuario=user2,
        liga=liga,
        nombre='Equipo B',
        presupuesto=60000000
    )
    
    # Crear jugadores con diferentes puntuaciones para cada equipo
    # Equipo A - menos puntos
    jugadores_equipo_a = [
        Jugador.objects.create(
            nombre=f'Jugador A{i}',
            posicion='DEL',
            valor=5000000,
            puntos_totales=10 + i,  # 11, 12, 13 puntos
            equipo_real=EquipoReal.objects.create(nombre=f'Real A{i}'),
            equipo=equipo1
        ) for i in range(3)
    ]
    
    # Equipo B - más puntos
    jugadores_equipo_b = [
        Jugador.objects.create(
            nombre=f'Jugador B{i}',
            posicion='DEL',
            valor=6000000,
            puntos_totales=20 + i,  # 21, 22, 23 puntos
            equipo_real=EquipoReal.objects.create(nombre=f'Real B{i}'),
            equipo=equipo2
        ) for i in range(3)
    ]
    
    return [equipo1, equipo2]

@pytest.fixture
def jugadores_suficientes_registro(db, equipo_real):
    """7 jugadores libres para pruebas de registro exitoso"""
    jugadores = []
    
    # 1 portero
    jugadores.append(Jugador.objects.create(
        nombre='Portero Registro',
        posicion='POR',
        valor=8000000,
        puntos_totales=25,
        equipo_real=equipo_real
    ))
    
    # 3 defensas
    for i in range(3):
        jugadores.append(Jugador.objects.create(
            nombre=f'Defensa Registro {i+1}',
            posicion='DEF',
            valor=5000000 + i * 1000000,
            puntos_totales=15 + i * 5,
            equipo_real=equipo_real
        ))
    
    # 3 delanteros
    for i in range(3):
        jugadores.append(Jugador.objects.create(
            nombre=f'Delantero Registro {i+1}',
            posicion='DEL',
            valor=7000000 + i * 1000000,
            puntos_totales=20 + i * 5,
            equipo_real=equipo_real
        ))
    
    return jugadores

@pytest.fixture
def jugadores_insuficientes_registro(db, equipo_real):
    """Solo 2 jugadores libres (insuficientes para registro)"""
    jugadores = []
    
    # Solo 2 jugadores
    jugadores.append(Jugador.objects.create(
        nombre='Portero Insuficiente',
        posicion='POR',
        valor=8000000,
        puntos_totales=25,
        equipo_real=equipo_real
    ))
    
    jugadores.append(Jugador.objects.create(
        nombre='Defensa Insuficiente',
        posicion='DEF',
        valor=5000000,
        puntos_totales=15,
        equipo_real=equipo_real
    ))
    
    return jugadores

@pytest.fixture
def user_without_team(db):
    """Usuario sin equipo para pruebas específicas"""
    return User.objects.create_user(
        username='noteamuser',
        email='noteam@example.com',
        password='testpass123'
    )

@pytest.fixture
def jugador_con_puntuaciones_prefetched(db, equipo_real, jornada, jornada2):
    """Jugador con puntuaciones para probar prefetch en serializers"""
    jugador = Jugador.objects.create(
        nombre='Jugador Prefetch Test',
        posicion='DEL',
        valor=5000000,
        puntos_totales=30,
        equipo_real=equipo_real
    )
    
    # Crear puntuaciones
    Puntuacion.objects.create(jugador=jugador, jornada=jornada, puntos=8, goles=2)
    Puntuacion.objects.create(jugador=jugador, jornada=jornada2, puntos=6, goles=1)
    
    return jugador