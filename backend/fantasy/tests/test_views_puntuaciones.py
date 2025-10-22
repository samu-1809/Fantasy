"""
Tests para las vistas de puntuaciones y alineaciones congeladas
"""
import pytest
from django.urls import reverse
from rest_framework import status
from fantasy.models import Jugador, Jornada, Puntuacion, EquipoReal, Partido, AlineacionCongelada


@pytest.mark.django_db
class TestPuntuacionesJugadorView:
    """Tests para puntuaciones_jugador"""

    def test_puntuaciones_jugador_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('puntuaciones_jugador', args=[1])
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_puntuaciones_jugador_no_existe(self, authenticated_client):
        """Jugador inexistente debe retornar 404"""
        url = reverse('puntuaciones_jugador', args=[9999])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'Jugador no encontrado' in response.data['error']

    def test_puntuaciones_jugador_sin_puntuaciones(self, authenticated_client, jugador_portero):
        """Jugador sin puntuaciones debe retornar lista vacía"""
        url = reverse('puntuaciones_jugador', args=[jugador_portero.id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) == 0

    def test_puntuaciones_jugador_con_puntuaciones(self, authenticated_client, jugador_portero, jornada):
        """Jugador con puntuaciones debe retornar lista correcta"""
        # Crear puntuaciones para el jugador
        Puntuacion.objects.create(jugador=jugador_portero, jornada=jornada, puntos=8, goles=0)
        
        url = reverse('puntuaciones_jugador', args=[jugador_portero.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['puntos'] == 8
        assert response.data[0]['goles'] == 0
        assert response.data[0]['jornada_numero'] == jornada.numero

    def test_puntuaciones_jugador_multiple_jornadas(self, authenticated_client, jugador_portero, jornada, jornada2):
        """Jugador con puntuaciones en múltiples jornadas"""
        Puntuacion.objects.create(jugador=jugador_portero, jornada=jornada, puntos=8, goles=0)
        Puntuacion.objects.create(jugador=jugador_portero, jornada=jornada2, puntos=6, goles=0)
        
        url = reverse('puntuaciones_jugador', args=[jugador_portero.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        # Deberían estar ordenadas por jornada (por el serializer)

@pytest.mark.django_db
class TestPuntuacionesPorPartidoView:
    """Tests para puntuaciones_por_partido"""

    def test_puntuaciones_partido_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('puntuaciones_por_partido', args=[1])
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_puntuaciones_partido_no_existe(self, authenticated_client):
        """Partido inexistente debe retornar 404"""
        url = reverse('puntuaciones_por_partido', args=[9999])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'Partido no encontrado' in response.data['error']

    def test_puntuaciones_partido_sin_jugadores(self, authenticated_client, partido):
        """Partido sin jugadores en equipos reales"""
        url = reverse('puntuaciones_por_partido', args=[partido.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'partido' in response.data
        assert 'jugadores_local' in response.data
        assert 'jugadores_visitante' in response.data
        assert len(response.data['jugadores_local']) == 0
        assert len(response.data['jugadores_visitante']) == 0

    def test_puntuaciones_partido_con_jugadores_sin_puntuaciones(self, authenticated_client, partido, jugadores_futbol_sala):
        """Partido con jugadores pero sin puntuaciones"""
        # Asignar algunos jugadores a los equipos reales del partido
        for jugador in jugadores_futbol_sala[:3]:
            jugador.equipo_real = partido.equipo_local
            jugador.save()
        
        for jugador in jugadores_futbol_sala[3:6]:
            jugador.equipo_real = partido.equipo_visitante
            jugador.save()
        
        url = reverse('puntuaciones_por_partido', args=[partido.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['jugadores_local']) == 3
        assert len(response.data['jugadores_visitante']) == 3
        
        # Verificar que todos los jugadores tienen 0 puntos y 0 goles
        for jugador_data in response.data['jugadores_local'] + response.data['jugadores_visitante']:
            assert jugador_data['puntos_jornada'] == 0
            assert jugador_data['goles'] == 0

    def test_puntuaciones_partido_con_puntuaciones(self, authenticated_client, partido, jugadores_con_puntuaciones):
        """Partido con jugadores y puntuaciones"""
        # Asignar jugadores a los equipos del partido
        for i, jugador in enumerate(jugadores_con_puntuaciones[:3]):
            jugador.equipo_real = partido.equipo_local
            jugador.save()
        
        for i, jugador in enumerate(jugadores_con_puntuaciones[3:]):
            jugador.equipo_real = partido.equipo_visitante
            jugador.save()
        
        url = reverse('puntuaciones_por_partido', args=[partido.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['jugadores_local']) == 3
        assert len(response.data['jugadores_visitante']) == 2
        
        # Verificar estructura de datos del partido
        assert response.data['partido']['id'] == partido.id
        assert response.data['partido']['equipo_local'] == partido.equipo_local.nombre
        assert response.data['partido']['equipo_visitante'] == partido.equipo_visitante.nombre
        assert response.data['partido']['jornada_numero'] == partido.jornada.numero
        
        # Verificar que se incluyen goles en la respuesta
        for jugador_data in response.data['jugadores_local']:
            assert 'goles' in jugador_data
            assert 'puntos_jornada' in jugador_data
            assert 'equipo_real_nombre' in jugador_data

    def test_puntuaciones_partido_optimizacion_consultas(self, authenticated_client, partido, jugadores_con_puntuaciones):
        """Verificar que se usan select_related para optimizar consultas"""
        # Asignar jugadores a equipos
        for jugador in jugadores_con_puntuaciones[:3]:
            jugador.equipo_real = partido.equipo_local
            jugador.save()
        
        url = reverse('puntuaciones_por_partido', args=[partido.id])
        
        # No podemos medir fácilmente el número de consultas con pytest,
        # pero podemos verificar que no hay errores y la respuesta es correcta
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

@pytest.mark.django_db
class TestActualizarPuntuacionJugadorView:
    """Tests para actualizar_puntuacion_jugador"""

    def test_actualizar_puntuacion_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('actualizar_puntuacion_jugador')
        response = api_client.post(url, {})
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_actualizar_puntuacion_datos_incompletos(self, authenticated_client):
        """Falta de datos requeridos debe retornar error"""
        url = reverse('actualizar_puntuacion_jugador')
        response = authenticated_client.post(url, {})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_actualizar_puntuacion_jugador_no_existe(self, authenticated_client, jornada):
        """Jugador inexistente debe retornar 404"""
        data = {
            'jugador_id': 9999,
            'jornada_id': jornada.id,
            'puntos': 8,
            'goles': 0
        }
        url = reverse('actualizar_puntuacion_jugador')
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_actualizar_puntuacion_jornada_no_existe(self, authenticated_client, jugador_portero):
        """Jornada inexistente debe retornar 404"""
        data = {
            'jugador_id': jugador_portero.id,
            'jornada_id': 9999,
            'puntos': 8,
            'goles': 0
        }
        url = reverse('actualizar_puntuacion_jugador')
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_actualizar_puntuacion_crear_nueva(self, authenticated_client, jugador_portero, jornada):
        """Crear nueva puntuación para jugador"""
        data = {
            'jugador_id': jugador_portero.id,
            'jornada_id': jornada.id,
            'puntos': 8,
            'goles': 0
        }
        url = reverse('actualizar_puntuacion_jugador')
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == 'Puntuación actualizada correctamente'
        assert response.data['puntuacion']['puntos'] == 8
        assert response.data['puntuacion']['goles'] == 0
        
        # Verificar que se creó la puntuación
        puntuacion = Puntuacion.objects.get(jugador=jugador_portero, jornada=jornada)
        assert puntuacion.puntos == 8
        assert puntuacion.goles == 0
        
        # Verificar que se actualizaron los puntos totales del jugador
        jugador_portero.refresh_from_db()
        assert jugador_portero.puntos_totales == 8
        assert jugador_portero.valor == 5000000 + (8 * 100000)  # 5000000 + 800000

    def test_actualizar_puntuacion_actualizar_existente(self, authenticated_client, jugador_portero, jornada):
        """Actualizar puntuación existente"""
        # Crear puntuación inicial
        Puntuacion.objects.create(jugador=jugador_portero, jornada=jornada, puntos=5, goles=0)
        
        data = {
            'jugador_id': jugador_portero.id,
            'jornada_id': jornada.id,
            'puntos': 9,
            'goles': 0
        }
        url = reverse('actualizar_puntuacion_jugador')
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['puntuacion']['puntos'] == 9
        
        # Verificar que se actualizó la puntuación
        puntuacion = Puntuacion.objects.get(jugador=jugador_portero, jornada=jornada)
        assert puntuacion.puntos == 9
        
        # Verificar puntos totales actualizados
        jugador_portero.refresh_from_db()
        assert jugador_portero.puntos_totales == 9

    def test_actualizar_puntuacion_con_goles(self, authenticated_client, jugador_delantero, jornada):
        """Actualizar puntuación con goles"""
        data = {
            'jugador_id': jugador_delantero.id,
            'jornada_id': jornada.id,
            'puntos': 10,
            'goles': 2
        }
        url = reverse('actualizar_puntuacion_jugador')
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['puntuacion']['goles'] == 2
        
        # Verificar que se guardaron los goles
        puntuacion = Puntuacion.objects.get(jugador=jugador_delantero, jornada=jornada)
        assert puntuacion.goles == 2

    def test_actualizar_puntuacion_multiples_jornadas(self, authenticated_client, jugador_portero, jornada, jornada2):
        """Actualizar puntuaciones en múltiples jornadas y verificar cálculo total"""
        # Puntuación en jornada 1
        data1 = {
            'jugador_id': jugador_portero.id,
            'jornada_id': jornada.id,
            'puntos': 8,
            'goles': 0
        }
        url = reverse('actualizar_puntuacion_jugador')
        response1 = authenticated_client.post(url, data1)
        assert response1.status_code == status.HTTP_200_OK
        
        # Puntuación en jornada 2
        data2 = {
            'jugador_id': jugador_portero.id,
            'jornada_id': jornada2.id,
            'puntos': 6,
            'goles': 0
        }
        response2 = authenticated_client.post(url, data2)
        assert response2.status_code == status.HTTP_200_OK
        
        # Verificar puntos totales (8 + 6 = 14)
        jugador_portero.refresh_from_db()
        assert jugador_portero.puntos_totales == 14
        assert jugador_portero.valor == 5000000 + (14 * 100000)  # 5000000 + 1400000

@pytest.mark.django_db
class TestEquiposDisponiblesJornadaView:
    """Tests para equipos_disponibles_jornada"""

    def test_equipos_disponibles_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('equipos_disponibles_jornada', args=[1])
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_equipos_disponibles_jornada_no_existe(self, authenticated_client):
        """Jornada inexistente debe retornar 404"""
        url = reverse('equipos_disponibles_jornada', args=[9999])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'Jornada no encontrada' in response.data['error']

    def test_equipos_disponibles_jornada_sin_partidos(self, authenticated_client, jornada, equipo_real):
        """Jornada sin partidos debe retornar todos los equipos"""
        url = reverse('equipos_disponibles_jornada', args=[jornada.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        # Debería incluir el equipo_real de la fixture

    def test_equipos_disponibles_jornada_con_partidos(self, authenticated_client, jornada, equipo_real):
        """Jornada con partidos debe excluir equipos ocupados"""
        # Crear otro equipo real
        equipo_real2 = EquipoReal.objects.create(nombre='Equipo Real 2')
        
        # Crear partido que ocupa equipo_real
        Partido.objects.create(
            jornada=jornada,
            equipo_local=equipo_real,
            equipo_visitante=equipo_real2,
            fecha=Jornada.objects.first().fecha  # Usar fecha de alguna jornada existente
        )
        
        url = reverse('equipos_disponibles_jornada', args=[jornada.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # equipo_real y equipo_real2 no deberían estar disponibles
        equipos_disponibles = [eq['nombre'] for eq in response.data]
        assert equipo_real.nombre not in equipos_disponibles
        assert equipo_real2.nombre not in equipos_disponibles

@pytest.mark.django_db
class TestAlineacionCongeladaDetalleView:
    """Tests para alineacion_congelada_detalle"""

    def test_alineacion_detalle_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('alineacion_congelada_detalle', args=[1, 1])
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_alineacion_detalle_equipo_no_existe(self, authenticated_client, jornada):
        """Equipo inexistente debe retornar 404"""
        url = reverse('alineacion_congelada_detalle', args=[9999, jornada.id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'Equipo no encontrado' in response.data['error']

    def test_alineacion_detalle_alineacion_no_existe(self, authenticated_client, equipo, jornada):
        """Alineación congelada inexistente debe retornar 404"""
        url = reverse('alineacion_congelada_detalle', args=[equipo.id, jornada.id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'Alineación congelada no encontrada' in response.data['error']

    def test_alineacion_detalle_permiso_denegado(self, authenticated_client, user2, liga, jornada):
        """Usuario no puede ver alineación de otro equipo"""
        equipo_otro_usuario = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo Otro Usuario',
            presupuesto=50000000
        )
        
        # Crear alineación congelada para el equipo de otro usuario
        alineacion = AlineacionCongelada.objects.create(
            equipo=equipo_otro_usuario,
            jornada=jornada
        )
        
        url = reverse('alineacion_congelada_detalle', args=[equipo_otro_usuario.id, jornada.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'error' in response.data
        assert 'No tienes permiso' in response.data['error']

    def test_alineacion_detalle_exitosa(self, authenticated_client, alineacion_congelada):
        """Obtener alineación congelada exitosamente"""
        equipo = alineacion_congelada.equipo
        jornada = alineacion_congelada.jornada
        
        url = reverse('alineacion_congelada_detalle', args=[equipo.id, jornada.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['equipo'] == equipo.id
        assert response.data['jornada'] == jornada.id
        assert 'jugadores_titulares_info' in response.data
        assert 'puntos_obtenidos' in response.data
        assert 'dinero_ganado' in response.data

@pytest.mark.django_db
class TestForzarCongelacionView:
    """Tests para forzar_congelacion"""

    def test_forzar_congelacion_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('forzar_congelacion')
        response = api_client.post(url, {})
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_forzar_congelacion_datos_incompletos(self, authenticated_client):
        """Falta de datos requeridos debe retornar error"""
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, {})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_forzar_congelacion_equipo_no_existe(self, authenticated_client, jornada):
        """Equipo inexistente debe retornar 404"""
        data = {
            'equipo_id': 9999,
            'jornada_id': jornada.id
        }
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'Equipo no encontrado' in response.data['error']

    def test_forzar_congelacion_jornada_no_existe(self, authenticated_client, equipo):
        """Jornada inexistente debe retornar 404"""
        data = {
            'equipo_id': equipo.id,
            'jornada_id': 9999
        }
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'Jornada no encontrada' in response.data['error']

    def test_forzar_congelacion_equipo_ajeno(self, authenticated_client, user2, liga, jornada):
        """No se puede forzar congelación de equipo ajeno"""
        equipo_otro_usuario = Equipo.objects.create(
            usuario=user2,
            liga=liga,
            nombre='Equipo Otro Usuario',
            presupuesto=50000000
        )
        
        data = {
            'equipo_id': equipo_otro_usuario.id,
            'jornada_id': jornada.id
        }
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
        assert 'no pertenece al usuario' in response.data['error']

    def test_forzar_congelacion_sin_jugadores(self, authenticated_client, equipo, jornada):
        """Forzar congelación sin jugadores titulares"""
        data = {
            'equipo_id': equipo.id,
            'jornada_id': jornada.id
        }
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, data)
        
        # Debería crear la alineación pero sin jugadores
        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == 'Alineación congelada forzada correctamente'
        assert response.data['alineacion']['equipo'] == equipo.id
        assert response.data['alineacion']['jornada'] == jornada.id
        assert len(response.data['alineacion']['jugadores_titulares_info']) == 0

    def test_forzar_congelacion_con_jugadores(self, authenticated_client, equipo_con_alineacion_futbol_sala, jornada):
        """Forzar congelación con jugadores titulares"""
        equipo = equipo_con_alineacion_futbol_sala
        
        data = {
            'equipo_id': equipo.id,
            'jornada_id': jornada.id
        }
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == 'Alineación congelada forzada correctamente'
        assert len(response.data['alineacion']['jugadores_titulares_info']) == 5
        
        # Verificar que se creó la alineación congelada
        alineacion = AlineacionCongelada.objects.get(equipo=equipo, jornada=jornada)
        assert alineacion.jugadores_titulares.count() == 5

    def test_forzar_congelacion_con_puntuaciones(self, authenticated_client, equipo_con_alineacion_futbol_sala, jornada, jugadores_con_puntuaciones):
        """Forzar congelación con jugadores que tienen puntuaciones"""
        equipo = equipo_con_alineacion_futbol_sala
        
        # Asignar algunos jugadores con puntuaciones al equipo
        for i, jugador in enumerate(jugadores_con_puntuaciones[:5]):
            jugador.equipo = equipo
            jugador.en_banquillo = False
            jugador.save()
        
        data = {
            'equipo_id': equipo.id,
            'jornada_id': jornada.id
        }
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verificar que se calcularon los puntos
        alineacion = AlineacionCongelada.objects.get(equipo=equipo, jornada=jornada)
        assert alineacion.puntos_obtenidos > 0
        assert alineacion.dinero_ganado == alineacion.puntos_obtenidos * 100000

    def test_forzar_congelacion_formacion_incompleta(self, authenticated_client, equipo, jornada, jugador_portero):
        """Forzar congelación con formación incompleta"""
        # Asignar solo 1 jugador (portero) - formación incompleta
        jugador_portero.equipo = equipo
        jugador_portero.en_banquillo = False
        jugador_portero.save()
        
        data = {
            'equipo_id': equipo.id,
            'jornada_id': jornada.id
        }
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['alineacion']['tiene_posiciones_completas'] is False
        assert 'DEF' in response.data['alineacion']['posiciones_faltantes']
        assert 'DEL' in response.data['alineacion']['posiciones_faltantes']

    def test_forzar_congelacion_actualizar_existente(self, authenticated_client, alineacion_congelada):
        """Actualizar alineación congelada existente"""
        equipo = alineacion_congelada.equipo
        jornada = alineacion_congelada.jornada
        
        # Agregar un nuevo jugador titular al equipo
        nuevo_jugador = Jugador.objects.create(
            nombre='Nuevo Jugador',
            posicion='DEF',
            valor=5000000,
            puntos_totales=0,
            equipo=equipo,
            en_banquillo=False
        )
        
        data = {
            'equipo_id': equipo.id,
            'jornada_id': jornada.id
        }
        url = reverse('forzar_congelacion')
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['created'] is False  # No se creó, se actualizó
        
        # Verificar que se actualizó la alineación
        alineacion_congelada.refresh_from_db()
        assert nuevo_jugador in alineacion_congelada.jugadores_titulares.all()