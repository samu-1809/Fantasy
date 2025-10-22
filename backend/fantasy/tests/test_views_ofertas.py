import pytest
from django.urls import reverse
from rest_framework import status
from ..models import Oferta, Equipo, Jugador

@pytest.mark.django_db
class TestOfertasViews:
    """Tests para las vistas de ofertas"""

    def test_ofertas_recibidas(self, authenticated_client, equipo2, oferta_pendiente):
        """Obtener ofertas recibidas por un equipo"""
        # equipo2 es el receptor de la oferta
        url = reverse('ofertas_recibidas', args=[equipo2.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == oferta_pendiente.id
        assert response.data[0]['equipo_ofertante_nombre'] == oferta_pendiente.equipo_ofertante.nombre
        assert response.data[0]['monto'] == oferta_pendiente.monto

    def test_ofertas_recibidas_equipo_ajeno(self, authenticated_client, equipo):
        """Intento de ver ofertas recibidas de equipo ajeno"""
        url = reverse('ofertas_recibidas', args=[equipo.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_ofertas_realizadas(self, authenticated_client, equipo, oferta_pendiente):
        """Obtener ofertas realizadas por un equipo"""
        url = reverse('ofertas_realizadas', args=[equipo.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == oferta_pendiente.id
        assert response.data[0]['equipo_receptor_nombre'] == oferta_pendiente.equipo_receptor.nombre
        assert response.data[0]['monto'] == oferta_pendiente.monto

    def test_ofertas_realizadas_equipo_ajeno(self, authenticated_client, equipo2):
        """Intento de ver ofertas realizadas de equipo ajeno"""
        url = reverse('ofertas_realizadas', args=[equipo2.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_aceptar_oferta_exitosa(self, authenticated_client, equipo2, oferta_pendiente, mock_notificaciones):
        """Aceptar una oferta exitosamente"""
        # Autenticar como el dueño del equipo receptor (equipo2)
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=equipo2.usuario)

        url = reverse('aceptar_oferta', args=[oferta_pendiente.id])
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert 'vendido' in response.data['mensaje']

        # Verificar que la oferta se marcó como aceptada
        oferta_pendiente.refresh_from_db()
        assert oferta_pendiente.estado == 'aceptada'

        # Verificar que el jugador fue transferido
        jugador = oferta_pendiente.jugador
        jugador.refresh_from_db()
        assert jugador.equipo == oferta_pendiente.equipo_ofertante
        assert jugador.en_venta is False

        # Verificar transferencia de dinero
        equipo2.refresh_from_db()
        assert equipo2.presupuesto == 50000000 + oferta_pendiente.monto

        equipo_ofertante = oferta_pendiente.equipo_ofertante
        equipo_ofertante.refresh_from_db()
        assert equipo_ofertante.presupuesto == 50000000 - oferta_pendiente.monto

    def test_aceptar_oferta_rechaza_automaticamente_otras(self, authenticated_client, equipo2, multiple_ofertas_pendientes, mock_notificaciones):
        """Aceptar una oferta rechaza automáticamente las demás ofertas pendientes"""
        # Autenticar como el dueño del equipo receptor (equipo2)
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=equipo2.usuario)

        oferta_a_aceptar = multiple_ofertas_pendientes[0]
        url = reverse('aceptar_oferta', args=[oferta_a_aceptar.id])
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK

        # Verificar que la oferta aceptada está en estado 'aceptada'
        oferta_a_aceptar.refresh_from_db()
        assert oferta_a_aceptar.estado == 'aceptada'

        # Verificar que las otras ofertas están rechazadas
        for oferta in multiple_ofertas_pendientes[1:]:
            oferta.refresh_from_db()
            assert oferta.estado == 'rechazada'

        # Verificar que se devolvió el dinero a las ofertas rechazadas
        oferta_rechazada = multiple_ofertas_pendientes[1]
        equipo_rechazado = oferta_rechazada.equipo_ofertante
        equipo_rechazado.refresh_from_db()
        assert equipo_rechazado.presupuesto == 50000000  # Se devolvió el dinero

    def test_aceptar_oferta_no_autorizado(self, authenticated_client, oferta_pendiente):
        """Intento de aceptar oferta de otro usuario"""
        url = reverse('aceptar_oferta', args=[oferta_pendiente.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'permisos' in response.data['error']

    def test_aceptar_oferta_inexistente(self, authenticated_client):
        """Intento de aceptar oferta que no existe"""
        url = reverse('aceptar_oferta', args=[999])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_rechazar_oferta_exitosa(self, authenticated_client, equipo2, oferta_pendiente, mock_notificaciones):
        """Rechazar una oferta exitosamente"""
        # Autenticar como el dueño del equipo receptor (equipo2)
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=equipo2.usuario)

        url = reverse('rechazar_oferta', args=[oferta_pendiente.id])
        response = client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert 'rechazada' in response.data['mensaje']

        # Verificar que la oferta se marcó como rechazada
        oferta_pendiente.refresh_from_db()
        assert oferta_pendiente.estado == 'rechazada'

        # Verificar que se devolvió el dinero
        equipo_ofertante = oferta_pendiente.equipo_ofertante
        equipo_ofertante.refresh_from_db()
        assert equipo_ofertante.presupuesto == 50000000  # Dinero devuelto

    def test_rechazar_oferta_no_autorizado(self, authenticated_client, oferta_pendiente):
        """Intento de rechazar oferta de otro usuario"""
        url = reverse('rechazar_oferta', args=[oferta_pendiente.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'permisos' in response.data['error']

    def test_rechazar_oferta_inexistente(self, authenticated_client):
        """Intento de rechazar oferta que no existe"""
        url = reverse('rechazar_oferta', args=[999])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_crear_oferta_directa_exitosa(self, authenticated_client, equipo, jugador_usuario):
        """Crear oferta directa exitosa"""
        url = reverse('crear_oferta_directa')
        data = {
            'jugador_id': jugador_usuario.id,
            'monto': 11000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert 'enviada' in response.data['mensaje']

        # Verificar que se creó la oferta
        oferta = Oferta.objects.get(jugador=jugador_usuario, equipo_ofertante=equipo)
        assert oferta.monto == 11000000
        assert oferta.estado == 'pendiente'

        # Verificar que se bloqueó el dinero
        equipo.refresh_from_db()
        assert equipo.presupuesto == 50000000 - 11000000

    def test_crear_oferta_directa_datos_incompletos(self, authenticated_client):
        """Crear oferta directa sin datos completos"""
        url = reverse('crear_oferta_directa')
        data = {}  # Datos vacíos
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'requiere' in response.data['error']

    def test_crear_oferta_directa_jugador_libre(self, authenticated_client, equipo, jugador_mercado):
        """Intento de oferta directa por jugador libre (mercado)"""
        url = reverse('crear_oferta_directa')
        data = {
            'jugador_id': jugador_mercado.id,
            'monto': 6000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'libre' in response.data['error']

    def test_crear_oferta_directa_jugador_propio(self, authenticated_client, equipo, jugador_usuario):
        """Intento de oferta directa por jugador propio"""
        # Cambiar el jugador para que sea del equipo del usuario
        jugador_usuario.equipo = equipo
        jugador_usuario.save()

        url = reverse('crear_oferta_directa')
        data = {
            'jugador_id': jugador_usuario.id,
            'monto': 11000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'propio' in response.data['error']

    def test_crear_oferta_directa_presupuesto_insuficiente(self, authenticated_client, equipo, jugador_usuario):
        """Crear oferta directa con presupuesto insuficiente"""
        url = reverse('crear_oferta_directa')
        data = {
            'jugador_id': jugador_usuario.id,
            'monto': 60000000  # Más que el presupuesto
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Presupuesto insuficiente' in response.data['error']

    def test_crear_oferta_directa_jugador_no_existe(self, authenticated_client):
        """Crear oferta directa por jugador que no existe"""
        url = reverse('crear_oferta_directa')
        data = {
            'jugador_id': 999,
            'monto': 5000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_editar_oferta_exitosa(self, authenticated_client, oferta_pendiente, mock_notificaciones):
        """Editar oferta exitosamente"""
        url = reverse('editar_oferta', args=[oferta_pendiente.id])
        data = {
            'nuevo_monto': 10000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['nuevo_monto'] == 10000000

        # Verificar que se actualizó la oferta
        oferta_pendiente.refresh_from_db()
        assert oferta_pendiente.monto == 10000000

        # Verificar que se restó la diferencia del presupuesto
        equipo = oferta_pendiente.equipo_ofertante
        equipo.refresh_from_db()
        assert equipo.presupuesto == 50000000 - 1000000  # Diferencia: 10M - 9M = 1M

    def test_editar_oferta_sin_nuevo_monto(self, authenticated_client, oferta_pendiente):
        """Editar oferta sin nuevo monto"""
        url = reverse('editar_oferta', args=[oferta_pendiente.id])
        data = {}  # Sin nuevo_monto
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'requerido' in response.data['error']

    def test_editar_oferta_monto_menor(self, authenticated_client, oferta_pendiente):
        """Editar oferta con monto menor al actual"""
        url = reverse('editar_oferta', args=[oferta_pendiente.id])
        data = {
            'nuevo_monto': 8000000  # Menor que 9000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'mayor al monto actual' in response.data['error']

    def test_editar_oferta_presupuesto_insuficiente(self, authenticated_client, oferta_pendiente):
        """Editar oferta con diferencia mayor al presupuesto"""
        # Reducir presupuesto del equipo
        equipo = oferta_pendiente.equipo_ofertante
        equipo.presupuesto = 500000  # Solo 500k
        equipo.save()

        url = reverse('editar_oferta', args=[oferta_pendiente.id])
        data = {
            'nuevo_monto': 10000000  # Diferencia de 1M, pero presupuesto solo 500k
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Presupuesto insuficiente' in response.data['error']

    def test_editar_oferta_no_pendiente(self, authenticated_client, oferta_aceptada):
        """Editar oferta que no está pendiente"""
        url = reverse('editar_oferta', args=[oferta_aceptada.id])
        data = {
            'nuevo_monto': 10000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'pendientes' in response.data['error']

    def test_editar_oferta_ajena(self, authenticated_client, user2, oferta_pendiente):
        """Intento de editar oferta de otro usuario"""
        # Autenticar como otro usuario
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user2)

        url = reverse('editar_oferta', args=[oferta_pendiente.id])
        data = {
            'nuevo_monto': 10000000
        }
        response = client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retirar_oferta_exitosa(self, authenticated_client, oferta_pendiente, mock_notificaciones):
        """Retirar oferta exitosamente"""
        url = reverse('retirar_oferta', args=[oferta_pendiente.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert 'retirada' in response.data['message']

        # Verificar que la oferta se marcó como retirada
        oferta_pendiente.refresh_from_db()
        assert oferta_pendiente.estado == 'retirada'

        # Verificar que se devolvió el dinero
        equipo = oferta_pendiente.equipo_ofertante
        equipo.refresh_from_db()
        assert equipo.presupuesto == 50000000  # Dinero devuelto

    def test_retirar_oferta_inexistente(self, authenticated_client):
        """Intento de retirar oferta que no existe"""
        url = reverse('retirar_oferta', args=[999])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retirar_oferta_ajena(self, authenticated_client, user2, oferta_pendiente):
        """Intento de retirar oferta de otro usuario"""
        # Autenticar como otro usuario
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user2)

        url = reverse('retirar_oferta', args=[oferta_pendiente.id])
        response = client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retirar_oferta_no_pendiente(self, authenticated_client, oferta_aceptada):
        """Intento de retirar oferta que no está pendiente"""
        url = reverse('retirar_oferta', args=[oferta_aceptada.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND