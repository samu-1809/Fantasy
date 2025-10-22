import pytest
from django.urls import reverse
from rest_framework import status
from ..models import Puja, Oferta, Equipo, Jugador

@pytest.mark.django_db
class TestPujasViews:
    """Tests para las vistas de pujas"""

    def test_pujar_jugador_mercado_exitoso(self, authenticated_client, equipo, jugador_mercado):
        """Puja exitosa por un jugador del mercado"""
        url = reverse('pujar_jugador', args=[equipo.id])
        data = {
            'jugador_id': jugador_mercado.id,
            'monto_puja': 7000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['tipo'] == 'puja_mercado'
        assert response.data['nuevo_presupuesto'] == equipo.presupuesto - 7000000

        # Verificar que se creó la puja
        puja = Puja.objects.get(jugador=jugador_mercado, equipo=equipo)
        assert puja.monto == 7000000
        assert puja.activa is True

        # Verificar que se actualizó el jugador
        jugador_mercado.refresh_from_db()
        assert jugador_mercado.puja_actual == 7000000
        assert jugador_mercado.equipo_pujador == equipo

    def test_pujar_jugador_usuario_exitoso(self, authenticated_client, equipo, jugador_usuario):
        """Oferta exitosa por un jugador de otro usuario"""
        url = reverse('pujar_jugador', args=[equipo.id])
        data = {
            'jugador_id': jugador_usuario.id,
            'monto_puja': 11000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['tipo'] == 'oferta_usuario'

        # Verificar que se creó la oferta
        oferta = Oferta.objects.get(jugador=jugador_usuario, equipo_ofertante=equipo)
        assert oferta.monto == 11000000
        assert oferta.estado == 'pendiente'

        # Verificar que se restó el dinero
        equipo.refresh_from_db()
        assert equipo.presupuesto == 50000000 - 11000000

    def test_pujar_jugador_equipo_no_existe(self, authenticated_client):
        """Intento de pujar con equipo que no existe"""
        url = reverse('pujar_jugador', args=[999])
        data = {
            'jugador_id': 1,
            'monto_puja': 5000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'Equipo no encontrado' in response.data['error']

    def test_pujar_jugador_datos_incompletos(self, authenticated_client, equipo):
        """Puja sin jugador_id o monto_puja"""
        url = reverse('pujar_jugador', args=[equipo.id])
        data = {}  # Datos vacíos
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Datos incompletos' in response.data['error']

    def test_pujar_jugador_no_en_venta(self, authenticated_client, equipo, jugador_mercado):
        """Puja por jugador que no está en venta"""
        jugador_mercado.en_venta = False
        jugador_mercado.save()

        url = reverse('pujar_jugador', args=[equipo.id])
        data = {
            'jugador_id': jugador_mercado.id,
            'monto_puja': 7000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'no está en el mercado' in response.data['error']

    def test_pujar_jugador_expirado(self, authenticated_client, equipo, jugador_con_subasta_expirada):
        """Puja por jugador con subasta expirada"""
        url = reverse('pujar_jugador', args=[equipo.id])
        data = {
            'jugador_id': jugador_con_subasta_expirada.id,
            'monto_puja': 13000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'expirada' in response.data['error']

    def test_pujar_jugador_presupuesto_insuficiente(self, authenticated_client, equipo, jugador_mercado):
        """Puja con presupuesto insuficiente"""
        url = reverse('pujar_jugador', args=[equipo.id])
        data = {
            'jugador_id': jugador_mercado.id,
            'monto_puja': 60000000  # Más que el presupuesto
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Presupuesto insuficiente' in response.data['error']

    def test_pujar_jugador_propio(self, authenticated_client, equipo, jugador_usuario):
        """Intento de oferta por jugador propio"""
        # Cambiamos el jugador para que sea del equipo del usuario
        jugador_usuario.equipo = equipo
        jugador_usuario.save()

        url = reverse('pujar_jugador', args=[equipo.id])
        data = {
            'jugador_id': jugador_usuario.id,
            'monto_puja': 11000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'propios' in response.data['error']

    def test_pujar_jugador_mercado_monto_bajo(self, authenticated_client, equipo, jugador_mercado):
        """Puja por jugador del mercado con monto muy bajo"""
        url = reverse('pujar_jugador', args=[equipo.id])
        data = {
            'jugador_id': jugador_mercado.id,
            'monto_puja': 5000001  # Solo 1€ más que la puja actual
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'mayor' in response.data['error']

    def test_pujar_jugador_usuario_monto_bajo(self, authenticated_client, equipo, jugador_usuario):
        """Oferta por jugador de usuario con monto menor al precio de venta"""
        url = reverse('pujar_jugador', args=[equipo.id])
        data = {
            'jugador_id': jugador_usuario.id,
            'monto_puja': 9000000  # Menor que precio_venta (10000000)
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'mayor' in response.data['error']

    def test_pujas_realizadas_lista(self, authenticated_client, equipo, puja_activa):
        """Obtener listado de pujas realizadas por el equipo"""
        url = reverse('pujas_realizadas', args=[equipo.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['id'] == puja_activa.id
        assert response.data[0]['monto'] == puja_activa.monto
        assert response.data[0]['activa'] is True

    def test_pujas_realizadas_equipo_ajeno(self, authenticated_client, equipo2):
        """Intento de ver pujas de equipo ajeno"""
        url = reverse('pujas_realizadas', args=[equipo2.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retirar_puja_exitosa(self, authenticated_client, equipo, puja_activa, jugador_mercado):
        """Retirar una puja activa exitosamente"""
        url = reverse('retirar_puja', args=[puja_activa.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['nuevo_presupuesto'] == equipo.presupuesto + puja_activa.monto

        # Verificar que la puja se marcó como inactiva
        puja_activa.refresh_from_db()
        assert puja_activa.activa is False

    def test_retirar_puja_inexistente(self, authenticated_client):
        """Intento de retirar puja que no existe"""
        url = reverse('retirar_puja', args=[999])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retirar_puja_ajena(self, authenticated_client, user2, puja_activa):
        """Intento de retirar puja de otro usuario"""
        # Autenticar como otro usuario
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user2)

        url = reverse('retirar_puja', args=[puja_activa.id])
        response = client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retirar_puja_ya_retirada(self, authenticated_client, puja_inactiva):
        """Intento de retirar puja ya retirada"""
        url = reverse('retirar_puja', args=[puja_inactiva.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'ya fue retirada' in response.data['message']

    def test_retirar_puja_ganadora(self, authenticated_client, puja_activa):
        """Intento de retirar puja ganadora"""
        puja_activa.es_ganadora = True
        puja_activa.save()

        url = reverse('retirar_puja', args=[puja_activa.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'ganadora' in response.data['error']

    def test_editar_puja_exitosa(self, authenticated_client, puja_activa, equipo):
        """Editar puja exitosamente"""
        url = reverse('editar_puja', args=[puja_activa.id])
        data = {
            'nuevo_monto': 8000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['nuevo_monto'] == 8000000
        assert response.data['nuevo_presupuesto'] == equipo.presupuesto - 2000000  # 8000000 - 6000000

        # Verificar que se actualizó la puja
        puja_activa.refresh_from_db()
        assert puja_activa.monto == 8000000

    def test_editar_puja_sin_nuevo_monto(self, authenticated_client, puja_activa):
        """Editar puja sin nuevo monto"""
        url = reverse('editar_puja', args=[puja_activa.id])
        data = {}  # Sin nuevo_monto
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'requerido' in response.data['error']

    def test_editar_puja_monto_menor(self, authenticated_client, puja_activa):
        """Editar puja con monto menor a la actual"""
        url = reverse('editar_puja', args=[puja_activa.id])
        data = {
            'nuevo_monto': 5000000  # Menor que la puja actual de 6000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'mayor a la puja actual' in response.data['error']

    def test_editar_puja_presupuesto_insuficiente(self, authenticated_client, puja_activa, equipo):
        """Editar puja con diferencia mayor al presupuesto"""
        # Reducir presupuesto del equipo
        equipo.presupuesto = 1000000
        equipo.save()

        url = reverse('editar_puja', args=[puja_activa.id])
        data = {
            'nuevo_monto': 8000000  # Diferencia de 2000000, pero presupuesto solo 1000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Presupuesto insuficiente' in response.data['error']

    def test_editar_puja_jugador_no_venta(self, authenticated_client, puja_activa, jugador_mercado):
        """Editar puja de jugador que ya no está en venta"""
        jugador_mercado.en_venta = False
        jugador_mercado.save()

        url = reverse('editar_puja', args=[puja_activa.id])
        data = {
            'nuevo_monto': 8000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'ya no está en venta' in response.data['error']

    def test_editar_puja_retirada(self, authenticated_client, puja_inactiva):
        """Editar puja ya retirada"""
        url = reverse('editar_puja', args=[puja_inactiva.id])
        data = {
            'nuevo_monto': 8000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'retirada' in response.data['error']

    def test_editar_puja_ganadora(self, authenticated_client, puja_activa):
        """Editar puja ganadora"""
        puja_activa.es_ganadora = True
        puja_activa.save()

        url = reverse('editar_puja', args=[puja_activa.id])
        data = {
            'nuevo_monto': 8000000
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'ganadora' in response.data['error']