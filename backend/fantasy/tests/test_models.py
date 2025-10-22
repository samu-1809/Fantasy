"""
Tests para los modelos de Fantasy
"""
import pytest
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from fantasy.models import (
    EquipoReal, Liga, Jugador, Equipo, Jornada, Puntuacion, 
    AlineacionCongelada, Partido, Notificacion, Oferta, Puja
)


@pytest.mark.django_db
class TestEquipoRealModel:
    """Tests para el modelo EquipoReal"""

    def test_create_equipo_real(self):
        """Crear un equipo real"""
        equipo_real = EquipoReal.objects.create(nombre='Real Madrid')
        assert equipo_real.id is not None
        assert equipo_real.nombre == 'Real Madrid'

    def test_nombre_unico(self):
        """El nombre debe ser único"""
        EquipoReal.objects.create(nombre='Barcelona')
        with pytest.raises(IntegrityError):
            EquipoReal.objects.create(nombre='Barcelona')

    def test_str_representation(self):
        """__str__ devuelve el nombre"""
        equipo_real = EquipoReal.objects.create(nombre='Atlético Madrid')
        assert str(equipo_real) == 'Atlético Madrid'


@pytest.mark.django_db
class TestLigaModel:
    """Tests para el modelo Liga"""

    def test_create_liga(self):
        """Crear una liga con valores por defecto"""
        liga = Liga.objects.create(
            nombre='Liga Test',
            codigo='TEST123'
        )
        assert liga.id is not None
        assert liga.nombre == 'Liga Test'
        assert liga.codigo == 'TEST123'
        assert liga.jornada_actual == 1  # Valor por defecto

    def test_codigo_unico(self):
        """El código de liga debe ser único"""
        Liga.objects.create(nombre='Liga 1', codigo='UNICO123')
        with pytest.raises(IntegrityError):
            Liga.objects.create(nombre='Liga 2', codigo='UNICO123')

    def test_str_representation(self):
        """__str__ devuelve el nombre de la liga"""
        liga = Liga.objects.create(nombre='Liga Test', codigo='TEST123')
        assert str(liga) == 'Liga Test'


@pytest.mark.django_db
class TestJugadorModel:
    """Tests para el modelo Jugador"""

    def test_create_jugador(self, equipo_real):
        """Crear un jugador básico"""
        jugador = Jugador.objects.create(
            nombre='Lionel Messi',
            posicion=Jugador.DELANTERO,
            valor=15000000,
            equipo_real=equipo_real
        )
        assert jugador.id is not None
        assert jugador.nombre == 'Lionel Messi'
        assert jugador.posicion == 'DEL'
        assert jugador.valor == 15000000
        assert jugador.puntos_totales == 0
        assert jugador.goles == 0

    def test_posiciones_validas(self, equipo_real):
        """Todas las posiciones deben ser válidas"""
        posiciones = ['POR', 'DEF', 'DEL']
        for pos in posiciones:
            jugador = Jugador.objects.create(
                nombre=f'Jugador {pos}',
                posicion=pos,
                equipo_real=equipo_real
            )
            assert jugador.posicion == pos

    def test_posicion_display(self, equipo_real):
        """posicion_display debe devolver el nombre completo de la posición"""
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='POR',
            equipo_real=equipo_real
        )
        assert jugador.posicion_display == 'Portero'

    def test_en_mercado_property(self, equipo_real):
        """Propiedad en_mercado debe funcionar correctamente"""
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='DEL',
            equipo_real=equipo_real
        )
        
        # Inicialmente no está en mercado
        assert jugador.en_mercado is False
        
        # Poner en mercado
        jugador.poner_en_mercado()
        assert jugador.en_mercado is True
        
        # Simular expiración
        jugador.fecha_mercado = timezone.now() - timedelta(hours=25)
        jugador.save()
        assert jugador.en_mercado is False

    def test_expiracion_mercado_property(self, equipo_real):
        """Propiedad expiracion_mercado debe calcular correctamente"""
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='DEL',
            equipo_real=equipo_real
        )
        
        # Sin fecha de mercado
        assert jugador.expiracion_mercado is None
        
        # Con fecha de mercado
        now = timezone.now()
        jugador.fecha_mercado = now
        jugador.save()
        expected_expiration = now + timedelta(hours=24)
        assert jugador.expiracion_mercado.replace(microsecond=0) == expected_expiration.replace(microsecond=0)

    def test_poner_en_mercado(self, equipo_real):
        """Método poner_en_mercado debe funcionar correctamente"""
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='DEL',
            equipo_real=equipo_real
        )
        
        jugador.poner_en_mercado(precio=10000000)
        
        assert jugador.en_venta is True
        assert jugador.fecha_mercado is not None
        assert jugador.precio_venta == 10000000

    def test_quitar_del_mercado(self, equipo_real):
        """Método quitar_del_mercado debe funcionar correctamente"""
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='DEL',
            equipo_real=equipo_real,
            en_venta=True,
            fecha_mercado=timezone.now(),
            precio_venta=10000000,
            puja_actual=12000000
        )
        
        jugador.quitar_del_mercado()
        
        assert jugador.en_venta is False
        assert jugador.fecha_mercado is None
        assert jugador.precio_venta is None
        assert jugador.puja_actual is None
        assert jugador.equipo_pujador is None

    def test_realizar_puja_jugador_libre(self, equipo_real, equipo):
        """Realizar puja en jugador libre"""
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='DEL',
            equipo_real=equipo_real,
            en_venta=True,
            fecha_mercado=timezone.now()
        )
        
        puja = jugador.realizar_puja(equipo, 10000000)
        
        assert puja is not None
        assert jugador.puja_actual == 10000000
        assert jugador.equipo_pujador == equipo

    def test_realizar_puja_jugador_con_equipo(self, equipo_real, equipo, user2, liga):
        """Realizar puja en jugador que tiene equipo"""
        equipo2 = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo 2',
            presupuesto=50000000
        )
        
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='DEL',
            equipo_real=equipo_real,
            equipo=equipo2,  # Tiene equipo
            en_venta=True,
            fecha_mercado=timezone.now()
        )
        
        puja = jugador.realizar_puja(equipo, 10000000)
        
        assert puja is not None
        # Debería crear una oferta automáticamente
        assert Oferta.objects.filter(jugador=jugador, equipo_ofertante=equipo).exists()

    def test_finalizar_subasta_jugador_libre(self, equipo_real, equipo):
        """Finalizar subasta de jugador libre"""
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='DEL',
            equipo_real=equipo_real,
            en_venta=True,
            fecha_mercado=timezone.now(),
            puja_actual=10000000,
            equipo_pujador=equipo
        )
        
        resultado = jugador.finalizar_subasta()
        
        assert resultado['tipo'] == 'transferencia'
        assert jugador.equipo == equipo
        assert jugador.en_venta is False

    def test_finalizar_subasta_jugador_con_equipo(self, equipo_real, equipo, user2, liga):
        """Finalizar subasta de jugador con equipo"""
        equipo2 = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo 2',
            presupuesto=50000000
        )
        
        jugador = Jugador.objects.create(
            nombre='Test Player',
            posicion='DEL',
            equipo_real=equipo_real,
            equipo=equipo2,
            en_venta=True,
            fecha_mercado=timezone.now(),
            puja_actual=10000000,
            equipo_pujador=equipo
        )
        
        resultado = jugador.finalizar_subasta()
        
        assert resultado['tipo'] == 'oferta'
        assert Oferta.objects.filter(
            jugador=jugador, 
            equipo_ofertante=equipo,
            equipo_receptor=equipo2
        ).exists()


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
        assert equipo.presupuesto == 50000000
        assert equipo.puntos_totales == 0

    def test_str_representation(self, equipo):
        """__str__ incluye nombre y username"""
        result = str(equipo)
        assert equipo.nombre in result
        assert equipo.usuario.username in result

    def test_equipo_puede_tener_jugadores(self, equipo, jugador_portero, jugador_defensa):
        """Equipo puede tener múltiples jugadores"""
        equipo.jugadores.add(jugador_portero, jugador_defensa)
        assert equipo.jugadores.count() == 2
        assert jugador_portero in equipo.jugadores.all()
        assert jugador_defensa in equipo.jugadores.all()


@pytest.mark.django_db
class TestJornadaModel:
    """Tests para el modelo Jornada"""

    def test_create_jornada(self):
        """Crear una jornada"""
        jornada = Jornada.objects.create(numero=1)
        assert jornada.id is not None
        assert jornada.numero == 1
        assert jornada.fecha is not None

    def test_numero_unico(self):
        """El número de jornada debe ser único"""
        Jornada.objects.create(numero=1)
        with pytest.raises(IntegrityError):
            Jornada.objects.create(numero=1)

    def test_ordering(self):
        """Las jornadas deben ordenarse por número"""
        Jornada.objects.create(numero=3)
        Jornada.objects.create(numero=1)
        Jornada.objects.create(numero=2)
        
        jornadas = Jornada.objects.all()
        assert jornadas[0].numero == 1
        assert jornadas[1].numero == 2
        assert jornadas[2].numero == 3

    def test_str_representation(self):
        """__str__ incluye número de jornada"""
        jornada = Jornada.objects.create(numero=5)
        assert str(jornada) == 'Jornada 5'


@pytest.mark.django_db
class TestPuntuacionModel:
    """Tests para el modelo Puntuacion"""

    def test_create_puntuacion(self, jugador_portero, jornada):
        """Crear una puntuación"""
        puntuacion = Puntuacion.objects.create(
            jugador=jugador_portero,
            jornada=jornada,
            puntos=8,
            goles=0
        )
        assert puntuacion.id is not None
        assert puntuacion.puntos == 8
        assert puntuacion.goles == 0

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
        assert str(jornada.numero) in result
        assert '8' in result


@pytest.mark.django_db
class TestAlineacionCongeladaModel:
    """Tests para el modelo AlineacionCongelada"""

    def test_create_alineacion_congelada(self, equipo, jornada):
        """Crear una alineación congelada básica"""
        alineacion = AlineacionCongelada.objects.create(
            equipo=equipo,
            jornada=jornada,
            tiene_posiciones_completas=True,
            puntos_obtenidos=0,
            dinero_ganado=0
        )
        assert alineacion.id is not None
        assert alineacion.equipo == equipo
        assert alineacion.jornada == jornada
        assert alineacion.tiene_posiciones_completas is True

    def test_unique_together_equipo_jornada(self, equipo, jornada):
        """No puede haber dos alineaciones para el mismo equipo y jornada"""
        AlineacionCongelada.objects.create(equipo=equipo, jornada=jornada)
        with pytest.raises(IntegrityError):
            AlineacionCongelada.objects.create(equipo=equipo, jornada=jornada)

    def test_jugadores_titulares_relationship(self, alineacion_congelada, jugadores_futbol_sala):
        """Debe poder tener jugadores titulares"""
        # Asignar 5 jugadores (formación fútbol sala)
        for jugador in jugadores_futbol_sala[:5]:
            alineacion_congelada.jugadores_titulares.add(jugador)
        
        assert alineacion_congelada.jugadores_titulares.count() == 5

    def test_posiciones_faltantes_default(self, equipo, jornada):
        """posiciones_faltantes por defecto es lista vacía"""
        alineacion = AlineacionCongelada.objects.create(equipo=equipo, jornada=jornada)
        assert alineacion.posiciones_faltantes == []

    def test_fecha_congelacion_auto_now(self, equipo, jornada):
        """fecha_congelacion se establece automáticamente"""
        alineacion = AlineacionCongelada.objects.create(equipo=equipo, jornada=jornada)
        assert alineacion.fecha_congelacion is not None
        # Debe ser una fecha reciente (dentro de los últimos segundos)
        assert (timezone.now() - alineacion.fecha_congelacion).total_seconds() < 10

    def test_str_representation(self, equipo, jornada):
        """__str__ incluye equipo y jornada"""
        alineacion = AlineacionCongelada.objects.create(equipo=equipo, jornada=jornada)
        result = str(alineacion)
        assert equipo.nombre in result
        assert str(jornada.numero) in result

    def test_meta_ordering(self, equipo, jornada):
        """Debe ordenar por jornada y equipo"""
        jornada2 = Jornada.objects.create(numero=2)
        
        alineacion1 = AlineacionCongelada.objects.create(equipo=equipo, jornada=jornada2)
        alineacion2 = AlineacionCongelada.objects.create(
            equipo=equipo, 
            jornada=jornada
        )
        
        # Forzar diferentes equipos para probar ordenamiento
        from django.contrib.auth.models import User
        user2 = User.objects.create_user('user2', 'user2@test.com', 'pass')
        equipo2 = Equipo.objects.create(usuario=user2, liga=equipo.liga, nombre='A Team')
        
        alineacion3 = AlineacionCongelada.objects.create(equipo=equipo2, jornada=jornada)
        
        alineaciones = AlineacionCongelada.objects.all()
        # Deberían ordenarse por jornada (1, 2) y luego por nombre de equipo


@pytest.mark.django_db
class TestPartidoModel:
    """Tests para el modelo Partido"""

    def test_create_partido(self, jornada, equipo_real):
        """Crear un partido"""
        partido = Partido.objects.create(
            jornada=jornada,
            equipo_local=equipo_real,
            equipo_visitante=equipo_real,
            fecha=timezone.now(),
            goles_local=2,
            goles_visitante=1,
            jugado=True
        )
        assert partido.id is not None
        assert partido.equipo_local == equipo_real
        assert partido.equipo_visitante == equipo_real
        assert partido.goles_local == 2
        assert partido.goles_visitante == 1
        assert partido.jugado is True

    def test_resultado_property(self, jornada, equipo_real):
        """Propiedad resultado debe funcionar correctamente"""
        partido = Partido.objects.create(
            jornada=jornada,
            equipo_local=equipo_real,
            equipo_visitante=equipo_real,
            fecha=timezone.now()
        )
        
        # Partido no jugado
        assert partido.resultado == "Pendiente"
        
        # Partido jugado
        partido.goles_local = 3
        partido.goles_visitante = 1
        partido.jugado = True
        partido.save()
        
        assert partido.resultado == "3 - 1"

    def test_str_representation(self, jornada, equipo_real):
        """__str__ incluye equipos y jornada"""
        partido = Partido.objects.create(
            jornada=jornada,
            equipo_local=equipo_real,
            equipo_visitante=equipo_real,
            fecha=timezone.now()
        )
        result = str(partido)
        assert equipo_real.nombre in result
        assert str(jornada.numero) in result


@pytest.mark.django_db
class TestNotificacionModel:
    """Tests para el modelo Notificacion"""

    def test_create_notificacion_publica(self):
        """Crear notificación pública"""
        notificacion = Notificacion.objects.create(
            tipo='publica',
            categoria='distribucion_dinero',
            titulo='Distribución de dinero',
            mensaje='Se ha distribuido el dinero de la jornada'
        )
        assert notificacion.id is not None
        assert notificacion.tipo == 'publica'
        assert notificacion.categoria == 'distribucion_dinero'
        assert notificacion.destinatario is None

    def test_create_notificacion_privada(self, user):
        """Crear notificación privada"""
        notificacion = Notificacion.objects.create(
            tipo='privada',
            categoria='traspaso',
            titulo='Oferta recibida',
            mensaje='Has recibido una oferta por tu jugador',
            destinatario=user
        )
        assert notificacion.destinatario == user

    def test_ordering(self):
        """Las notificaciones deben ordenarse por fecha descendente"""
        Notificacion.objects.create(
            tipo='publica',
            categoria='distribucion_dinero',
            titulo='Notificación 1',
            mensaje='Mensaje 1'
        )
        Notificacion.objects.create(
            tipo='publica',
            categoria='distribucion_dinero',
            titulo='Notificación 2',
            mensaje='Mensaje 2'
        )
        
        notificaciones = Notificacion.objects.all()
        assert notificaciones[0].titulo == 'Notificación 2'
        assert notificaciones[1].titulo == 'Notificación 1'

    def test_str_representation(self):
        """__str__ incluye tipo y título"""
        notificacion = Notificacion.objects.create(
            tipo='publica',
            categoria='distribucion_dinero',
            titulo='Test Notificación',
            mensaje='Mensaje de prueba'
        )
        result = str(notificacion)
        assert 'publica' in result
        assert 'Test Notificación' in result


@pytest.mark.django_db
class TestOfertaModel:
    """Tests para el modelo Oferta"""

    def test_create_oferta(self, jugador_portero, equipo, user2, liga):
        """Crear una oferta"""
        equipo_receptor = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo Receptor',
            presupuesto=50000000
        )
        
        jugador_portero.equipo = equipo_receptor
        jugador_portero.save()
        
        oferta = Oferta.objects.create(
            jugador=jugador_portero,
            equipo_ofertante=equipo,
            equipo_receptor=equipo_receptor,
            monto=10000000,
            estado='pendiente'
        )
        
        assert oferta.id is not None
        assert oferta.jugador == jugador_portero
        assert oferta.equipo_ofertante == equipo
        assert oferta.equipo_receptor == equipo_receptor
        assert oferta.monto == 10000000
        assert oferta.estado == 'pendiente'

    def test_aceptar_oferta(self, jugador_portero, equipo, user2, liga):
        """Aceptar una oferta debe transferir jugador y dinero"""
        equipo_receptor = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo Receptor',
            presupuesto=50000000
        )
        
        presupuesto_inicial_ofertante = equipo.presupuesto
        presupuesto_inicial_receptor = equipo_receptor.presupuesto
        
        jugador_portero.equipo = equipo_receptor
        jugador_portero.save()
        
        oferta = Oferta.objects.create(
            jugador=jugador_portero,
            equipo_ofertante=equipo,
            equipo_receptor=equipo_receptor,
            monto=10000000,
            estado='pendiente'
        )
        
        resultado = oferta.aceptar()
        
        assert resultado is True
        assert oferta.estado == 'aceptada'
        assert oferta.fecha_respuesta is not None
        
        # Verificar transferencia de jugador
        jugador_portero.refresh_from_db()
        assert jugador_portero.equipo == equipo
        assert jugador_portero.en_venta is False
        assert jugador_portero.precio_venta is None
        
        # Verificar transferencia de dinero
        equipo.refresh_from_db()
        equipo_receptor.refresh_from_db()
        assert equipo.presupuesto == presupuesto_inicial_ofertante - 10000000
        assert equipo_receptor.presupuesto == presupuesto_inicial_receptor + 10000000

    def test_rechazar_oferta(self, jugador_portero, equipo, user2, liga):
        """Rechazar una oferta"""
        equipo_receptor = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo Receptor',
            presupuesto=50000000
        )
        
        jugador_portero.equipo = equipo_receptor
        jugador_portero.save()
        
        oferta = Oferta.objects.create(
            jugador=jugador_portero,
            equipo_ofertante=equipo,
            equipo_receptor=equipo_receptor,
            monto=10000000,
            estado='pendiente'
        )
        
        resultado = oferta.rechazar()
        
        assert resultado is True
        assert oferta.estado == 'rechazada'
        assert oferta.fecha_respuesta is not None

    def test_str_representation(self, jugador_portero, equipo, user2, liga):
        """__str__ incluye equipos, jugador y monto"""
        equipo_receptor = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo Receptor',
            presupuesto=50000000
        )
        
        jugador_portero.equipo = equipo_receptor
        jugador_portero.save()
        
        oferta = Oferta.objects.create(
            jugador=jugador_portero,
            equipo_ofertante=equipo,
            equipo_receptor=equipo_receptor,
            monto=10000000
        )
        
        result = str(oferta)
        assert equipo.nombre in result
        assert jugador_portero.nombre in result
        assert '10000000' in result


@pytest.mark.django_db
class TestPujaModel:
    """Tests para el modelo Puja"""

    def test_create_puja(self, jugador_portero, equipo):
        """Crear una puja"""
        puja = Puja.objects.create(
            jugador=jugador_portero,
            equipo=equipo,
            monto=10000000
        )
        
        assert puja.id is not None
        assert puja.jugador == jugador_portero
        assert puja.equipo == equipo
        assert puja.monto == 10000000
        assert puja.es_ganadora is False
        assert puja.activa is True

    def test_ordering(self, jugador_portero, equipo):
        """Las pujas deben ordenarse por monto descendente"""
        Puja.objects.create(jugador=jugador_portero, equipo=equipo, monto=5000000)
        Puja.objects.create(jugador=jugador_portero, equipo=equipo, monto=10000000)
        Puja.objects.create(jugador=jugador_portero, equipo=equipo, monto=8000000)
        
        pujas = Puja.objects.all()
        assert pujas[0].monto == 10000000
        assert pujas[1].monto == 8000000
        assert pujas[2].monto == 5000000

    def test_str_representation(self, jugador_portero, equipo):
        """__str__ incluye equipo, monto y jugador"""
        puja = Puja.objects.create(
            jugador=jugador_portero,
            equipo=equipo,
            monto=10000000
        )
        
        result = str(puja)
        assert equipo.nombre in result
        assert jugador_portero.nombre in result
        assert '10000000' in result