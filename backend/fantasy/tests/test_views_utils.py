"""
Tests para las vistas utilitarias (utils_views)
"""
import pytest
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from fantasy.models import Notificacion, Equipo, Jugador, Liga, Oferta, Puja


@pytest.mark.django_db
class TestNotificacionFunctions:
    """Tests para las funciones de notificaciones"""

    def test_crear_notificacion_distribucion_dinero(self):
        """Crear notificación pública de distribución de dinero"""
        notificacion = crear_notificacion_distribucion_dinero(5000000)
        
        assert notificacion.tipo == 'publica'
        assert notificacion.categoria == 'distribucion_dinero'
        assert notificacion.titulo == 'Distribución de dinero'
        assert '5000000' in notificacion.mensaje
        assert notificacion.destinatario is None

    def test_crear_notificacion_distribucion_dinero_con_jornada(self, jornada):
        """Crear notificación de distribución de dinero con jornada"""
        notificacion = crear_notificacion_distribucion_dinero(7500000, jornada)
        
        assert str(jornada.numero) in notificacion.mensaje
        assert notificacion.tipo == 'publica'

    def test_crear_notificacion_traspaso(self, jugador_portero, equipo, equipo2):
        """Crear notificación pública de traspaso"""
        notificacion = crear_notificacion_traspaso(jugador_portero, equipo, equipo2)
        
        assert notificacion.tipo == 'publica'
        assert notificacion.categoria == 'traspaso'
        assert jugador_portero.nombre in notificacion.titulo
        assert equipo.nombre in notificacion.mensaje
        assert equipo2.nombre in notificacion.mensaje

    def test_crear_notificacion_oferta_rechazada(self, jugador_portero, equipo):
        """Crear notificación privada de oferta rechazada"""
        notificacion = crear_notificacion_oferta_rechazada(jugador_portero, equipo)
        
        assert notificacion.tipo == 'privada'
        assert notificacion.categoria == 'oferta_rechazada'
        assert notificacion.destinatario == equipo.usuario
        assert jugador_portero.nombre in notificacion.mensaje

    def test_crear_notificacion_publica(self):
        """Crear notificación pública genérica"""
        notificacion = crear_notificacion_publica(
            categoria='traspaso',
            titulo='Test Pública',
            mensaje='Mensaje de prueba'
        )
        
        assert notificacion.tipo == 'publica'
        assert notificacion.categoria == 'traspaso'
        assert notificacion.titulo == 'Test Pública'
        assert notificacion.mensaje == 'Mensaje de prueba'
        assert notificacion.destinatario is None

    def test_crear_notificacion_publica_con_objeto_relacionado(self, equipo):
        """Crear notificación pública con objeto relacionado"""
        notificacion = crear_notificacion_publica(
            categoria='traspaso',
            titulo='Test con Objeto',
            mensaje='Mensaje con objeto',
            objeto_relacionado=equipo
        )
        
        assert notificacion.objeto_relacionado == equipo

    def test_crear_notificacion_privada(self, user):
        """Crear notificación privada"""
        notificacion = crear_notificacion_privada(
            destinatario=user,
            categoria='oferta_rechazada',
            titulo='Test Privada',
            mensaje='Mensaje privado'
        )
        
        assert notificacion.tipo == 'privada'
        assert notificacion.destinatario == user
        assert notificacion.titulo == 'Test Privada'

    def test_crear_notificacion_oferta_editada(self, jugador_portero, equipo):
        """Crear notificación de oferta editada"""
        notificacion = crear_notificacion_oferta_editada(
            jugador=jugador_portero,
            ofertante=equipo,
            monto_anterior=10000000,
            monto_nuevo=12000000
        )
        
        assert notificacion.tipo == 'privada'
        assert notificacion.categoria == 'oferta_editada'
        assert str(10000000) in notificacion.mensaje
        assert str(12000000) in notificacion.mensaje
        assert jugador_portero.nombre in notificacion.mensaje

    def test_crear_notificacion_oferta_retirada(self, jugador_portero, equipo):
        """Crear notificación de oferta retirada"""
        notificacion = crear_notificacion_oferta_retirada(
            jugador=jugador_portero,
            ofertante=equipo,
            monto=15000000
        )
        
        assert notificacion.tipo == 'privada'
        assert notificacion.categoria == 'oferta_retirada'
        assert str(15000000) in notificacion.mensaje
        assert jugador_portero.nombre in notificacion.mensaje
        assert 'devuelto' in notificacion.mensaje.lower()

@pytest.mark.django_db
class TestDatosInicialesView:
    """Tests para datos_iniciales"""

    def test_datos_iniciales_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('datos_iniciales')
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_datos_iniciales_usuario_normal_con_equipo(self, authenticated_client, equipo_con_jugadores):
        """Usuario normal con equipo existente debe recibir datos completos"""
        url = reverse('datos_iniciales')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'usuario' in response.data
        assert 'equipo' in response.data
        assert 'jugadores' in response.data
        assert 'mercado' in response.data
        assert 'clasificacion' in response.data
        assert 'ligaActual' in response.data
        
        # Verificar datos del usuario
        assert response.data['usuario']['username'] == 'testuser'
        assert response.data['es_admin'] is False
        
        # Verificar datos del equipo
        assert response.data['equipo']['nombre'] == 'Equipo Test'
        assert response.data['equipo']['presupuesto'] == 50000000
        
        # Verificar jugadores del equipo
        assert len(response.data['jugadores']) == 3
        
        # Verificar estructura de liga
        assert 'id' in response.data['ligaActual']
        assert 'nombre' in response.data['ligaActual']
        assert 'jornada_actual' in response.data['ligaActual']

    def test_datos_iniciales_usuario_normal_sin_equipo(self, authenticated_client, liga, jugadores_libres_para_registro):
        """Usuario sin equipo debe tener equipo creado automáticamente"""
        # Asegurar que el usuario no tiene equipo
        Equipo.objects.filter(usuario=authenticated_client.handler._force_user).delete()
        
        url = reverse('datos_iniciales')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['equipo'] is not None
        assert 'Equipo de testuser' in response.data['equipo']['nombre']
        
        # Verificar que se creó el equipo
        equipo_creado = Equipo.objects.filter(usuario=authenticated_client.handler._force_user).first()
        assert equipo_creado is not None

    def test_datos_iniciales_usuario_admin(self, admin_client):
        """Usuario admin debe recibir datos de administración"""
        url = reverse('datos_iniciales')
        response = admin_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['es_admin'] is True
        assert 'jugadores' in response.data
        assert 'equipos_reales' in response.data
        assert response.data['usuario']['is_superuser'] is True

    def test_datos_iniciales_mercado_vacio(self, authenticated_client, equipo):
        """Mercado debe estar vacío si no hay jugadores libres"""
        # Eliminar todos los jugadores libres
        Jugador.objects.filter(equipo__isnull=True).delete()
        
        url = reverse('datos_iniciales')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['mercado']) == 0

    def test_datos_iniciales_mercado_con_jugadores(self, authenticated_client, equipo, jugador_libre):
        """Mercado debe incluir jugadores libres"""
        url = reverse('datos_iniciales')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['mercado']) >= 1
        
        # Verificar que el jugador libre está en el mercado
        jugadores_mercado = [j['id'] for j in response.data['mercado']]
        assert jugador_libre.id in jugadores_mercado

    def test_datos_iniciales_clasificacion(self, authenticated_client, liga, equipo, equipo2):
        """Clasificación debe incluir todos los equipos de la liga"""
        url = reverse('datos_iniciales')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['clasificacion']) == 2  # equipo + equipo2
        
        # Verificar estructura de clasificación
        for equipo_clasif in response.data['clasificacion']:
            assert 'equipo_id' in equipo_clasif
            assert 'nombre' in equipo_clasif
            assert 'usuario' in equipo_clasif
            assert 'puntos_totales' in equipo_clasif
            assert 'presupuesto' in equipo_clasif
            assert 'posicion' in equipo_clasif

    def test_datos_iniciales_error_creacion_equipo(self, authenticated_client, mocker):
        """Manejo de error al crear equipo automáticamente"""
        # Mock para simular error al crear equipo
        mocker.patch('fantasy.models.Equipo.objects.create', side_effect=Exception("Error de base de datos"))
        
        # Asegurar que no hay equipo
        Equipo.objects.filter(usuario=authenticated_client.handler._force_user).delete()
        
        url = reverse('datos_iniciales')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert 'error' in response.data

@pytest.mark.django_db
class TestCurrentUserView:
    """Tests para current_user"""

    def test_current_user_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('current_user')
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_current_user_con_equipo(self, authenticated_client, equipo):
        """Usuario con equipo debe recibir datos del equipo"""
        url = reverse('current_user')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
        assert response.data['equipo']['id'] == equipo.id
        assert response.data['equipo']['nombre'] == equipo.nombre

    def test_current_user_sin_equipo(self, authenticated_client):
        """Usuario sin equipo debe recibir equipo como None"""
        # Eliminar equipo del usuario
        Equipo.objects.filter(usuario=authenticated_client.handler._force_user).delete()
        
        url = reverse('current_user')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
        assert response.data['equipo'] is None

    def test_current_user_datos_completos(self, authenticated_client, equipo):
        """Debe incluir todos los datos del usuario"""
        url = reverse('current_user')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'id' in response.data
        assert 'username' in response.data
        assert 'email' in response.data
        assert 'first_name' in response.data
        assert 'last_name' in response.data
        assert 'is_staff' in response.data
        assert 'is_superuser' in response.data
        assert 'equipo' in response.data

@pytest.mark.django_db
class TestFinalizarSubastasView:
    """Tests para finalizar_subastas"""

    def test_finalizar_subastas_sin_autenticacion(self, api_client):
        """Acceso sin autenticación debe fallar"""
        url = reverse('finalizar_subastas')
        response = api_client.post(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_finalizar_subastas_sin_permisos_admin(self, authenticated_client):
        """Usuario normal no puede ejecutar finalizar_subastas"""
        url = reverse('finalizar_subastas')
        response = authenticated_client.post(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'error' in response.data
        assert 'Solo administradores' in response.data['error']

    def test_finalizar_subastas_admin_sin_subastas(self, admin_client):
        """Admin ejecutando sin subastas expiradas"""
        url = reverse('finalizar_subastas')
        response = admin_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert '0 procesadas' in response.data['message']
        assert len(response.data['resultados']) == 0

    def test_finalizar_subastas_con_subastas_expiradas(self, admin_client, jugador_en_mercado):
        """Admin ejecutando con subastas expiradas"""
        # Hacer que la subasta esté expirada (hace más de 24 horas)
        jugador_en_mercado.fecha_mercado = timezone.now() - timedelta(hours=25)
        jugador_en_mercado.save()
        
        url = reverse('finalizar_subastas')
        response = admin_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert '1 procesadas' in response.data['message']
        assert len(response.data['resultados']) == 1
        assert jugador_en_mercado.nombre in response.data['resultados'][0]['jugador']

    def test_finalizar_subastas_con_puja_ganadora(self, admin_client, jugador_libre_en_mercado, puja_activa):
        """Finalizar subasta con puja ganadora en jugador libre"""
        # Configurar jugador con puja actual
        jugador = jugador_libre_en_mercado
        jugador.puja_actual = puja_activa.monto
        jugador.equipo_pujador = puja_activa.equipo
        jugador.fecha_mercado = timezone.now() - timedelta(hours=25)
        jugador.save()
        
        url = reverse('finalizar_subastas')
        response = admin_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verificar que el jugador fue transferido
        jugador.refresh_from_db()
        assert jugador.equipo == puja_activa.equipo
        assert jugador.en_venta is False
        assert jugador.fecha_mercado is None

    def test_finalizar_subastas_con_error(self, admin_client, jugador_en_mercado, mocker):
        """Manejo de errores durante finalización de subastas"""
        # Mock para simular error en finalizar_subasta
        mocker.patch('fantasy.models.Jugador.finalizar_subasta', side_effect=Exception("Error de transacción"))
        
        jugador_en_mercado.fecha_mercado = timezone.now() - timedelta(hours=25)
        jugador_en_mercado.save()
        
        url = reverse('finalizar_subastas')
        response = admin_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'error' in response.data['resultados'][0]
        assert 'Error de transacción' in response.data['resultados'][0]['error']

    def test_finalizar_subastas_solo_subastas_expiradas(self, admin_client, jugador_en_mercado, jugador_libre_en_mercado):
        """Solo deben procesarse subastas expiradas"""
        # Un jugador expirado y otro no
        jugador_en_mercado.fecha_mercado = timezone.now() - timedelta(hours=25)  # Expirado
        jugador_en_mercado.save()
        
        jugador_libre_en_mercado.fecha_mercado = timezone.now() - timedelta(hours=23)  # No expirado
        jugador_libre_en_mercado.save()
        
        url = reverse('finalizar_subastas')
        response = admin_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert '1 procesadas' in response.data['message']  # Solo 1 expirado