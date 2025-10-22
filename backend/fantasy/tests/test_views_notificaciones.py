import pytest
from django.urls import reverse
from rest_framework import status
from fantasy.models import Notificacion

@pytest.mark.django_db
class TestNotificacionesViews:
    """Tests para las vistas de notificaciones"""

    def test_listar_notificaciones(self, authenticated_client, multiple_notificaciones):
        """Listar todas las notificaciones del usuario (públicas + privadas)"""
        url = reverse('listar_notificaciones')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'notificaciones' in response.data
        
        # Debería ver 6 notificaciones: 3 públicas + 2 privadas no leídas + 1 privada leída
        assert len(response.data['notificaciones']) == 6
        
        # Verificar que están ordenadas por fecha descendente
        fechas = [n['fecha_creacion'] for n in response.data['notificaciones']]
        assert fechas == sorted(fechas, reverse=True)

    def test_listar_notificaciones_usuario_sin_notificaciones(self, authenticated_client):
        """Listar notificaciones cuando el usuario no tiene ninguna"""
        url = reverse('listar_notificaciones')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['notificaciones']) == 0

    def test_listar_notificaciones_sin_autenticar(self, api_client):
        """Intento de listar notificaciones sin autenticar"""
        url = reverse('listar_notificaciones')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'error' in response.data

    def test_contar_no_leidas(self, authenticated_client, multiple_notificaciones):
        """Contar notificaciones no leídas"""
        url = reverse('contar_no_leidas')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cantidad_no_leidas'] == 5  # 3 públicas + 2 privadas no leídas

    def test_contar_no_leidas_sin_notificaciones(self, authenticated_client):
        """Contar notificaciones no leídas cuando no hay ninguna"""
        url = reverse('contar_no_leidas')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cantidad_no_leidas'] == 0

    def test_contar_no_leidas_solo_publicas(self, authenticated_client, notificacion_publica):
        """Contar solo notificaciones públicas no leídas"""
        url = reverse('contar_no_leidas')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cantidad_no_leidas'] == 1

    def test_contar_no_leidas_solo_privadas(self, authenticated_client, notificacion_privada):
        """Contar solo notificaciones privadas no leídas"""
        url = reverse('contar_no_leidas')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cantidad_no_leidas'] == 1

    def test_contar_no_leidas_sin_autenticar(self, api_client):
        """Intento de contar no leídas sin autenticar"""
        url = reverse('contar_no_leidas')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_marcar_todas_leidas(self, authenticated_client, multiple_notificaciones):
        """Marcar todas las notificaciones como leídas"""
        url = reverse('marcar_todas_leidas')
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cantidad_actualizadas'] == 5  # 5 no leídas
        
        # Verificar que todas las notificaciones relevantes están marcadas como leídas
        notificaciones_no_leidas = Notificacion.objects.filter(
            leida=False
        ).filter(
            tipo='publica'
        ) | Notificacion.objects.filter(
            destinatario=authenticated_client.handler._force_user,
            leida=False
        )
        
        assert notificaciones_no_leidas.count() == 0

    def test_marcar_todas_leidas_sin_notificaciones(self, authenticated_client):
        """Marcar todas como leídas cuando no hay notificaciones"""
        url = reverse('marcar_todas_leidas')
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cantidad_actualizadas'] == 0

    def test_marcar_todas_leidas_sin_autenticar(self, api_client):
        """Intento de marcar todas como leídas sin autenticar"""
        url = reverse('marcar_todas_leidas')
        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_marcar_como_leida_exitosa(self, authenticated_client, notificacion_privada):
        """Marcar una notificación específica como leída"""
        url = reverse('marcar_como_leida', args=[notificacion_privada.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['mensaje'] == 'Notificación marcada como leída'
        
        # Verificar que la notificación está marcada como leída
        notificacion_privada.refresh_from_db()
        assert notificacion_privada.leida is True

    def test_marcar_como_leida_publica(self, authenticated_client, notificacion_publica):
        """Marcar una notificación pública como leída"""
        url = reverse('marcar_como_leida', args=[notificacion_publica.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        
        # Verificar que la notificación pública está marcada como leída
        notificacion_publica.refresh_from_db()
        assert notificacion_publica.leida is True

    def test_marcar_como_leida_inexistente(self, authenticated_client):
        """Intento de marcar notificación inexistente como leída"""
        url = reverse('marcar_como_leida', args=[999])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data

    def test_marcar_como_leida_ajena(self, authenticated_client, notificacion_otro_usuario):
        """Intento de marcar notificación de otro usuario como leída"""
        url = reverse('marcar_como_leida', args=[notificacion_otro_usuario.id])
        response = authenticated_client.post(url)

        # Debería fallar porque no es pública ni del usuario autenticado
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_marcar_como_leida_ya_leida(self, authenticated_client, notificacion_leida):
        """Marcar una notificación ya leída (no debería dar error)"""
        url = reverse('marcar_como_leida', args=[notificacion_leida.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        # La notificación debería seguir estando leída
        notificacion_leida.refresh_from_db()
        assert notificacion_leida.leida is True

    def test_marcar_como_leida_sin_autenticar(self, api_client, notificacion_publica):
        """Intento de marcar como leída sin autenticar"""
        url = reverse('marcar_como_leida', args=[notificacion_publica.id])
        response = api_client.post(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.django_db
class TestNotificacionViewSet:
    """Tests para el ViewSet de notificaciones"""

    def test_list_notificaciones_viewset(self, authenticated_client, multiple_notificaciones):
        """Listar notificaciones usando el ViewSet"""
        url = reverse('notificacion-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # El ViewSet debería mostrar las mismas notificaciones que la vista personalizada
        assert len(response.data) == 6

    def test_retrieve_notificacion_viewset(self, authenticated_client, notificacion_privada):
        """Obtener detalle de una notificación usando ViewSet"""
        url = reverse('notificacion-detail', args=[notificacion_privada.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == notificacion_privada.id
        assert response.data['titulo'] == notificacion_privada.titulo

    def test_retrieve_notificacion_ajena_viewset(self, authenticated_client, notificacion_otro_usuario):
        """Intento de obtener notificación de otro usuario usando ViewSet"""
        url = reverse('notificacion-detail', args=[notificacion_otro_usuario.id])
        response = authenticated_client.get(url)

        # El ViewSet debería filtrar por el queryset que solo incluye notificaciones del usuario
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_notificacion_viewset_no_permitido(self, authenticated_client):
        """Intento de crear notificación mediante ViewSet (no permitido)"""
        url = reverse('notificacion-list')
        data = {
            'titulo': 'Nueva Notificación',
            'mensaje': 'Mensaje de prueba',
            'tipo': 'privada'
        }
        response = authenticated_client.post(url, data)

        # Por defecto, ModelViewSet permite todas las acciones, pero depende de los permisos
        # En este caso, asumimos que no se permite crear desde la API
        assert response.status_code in [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]

    def test_update_notificacion_viewset_no_permitido(self, authenticated_client, notificacion_privada):
        """Intento de actualizar notificación mediante ViewSet (no permitido)"""
        url = reverse('notificacion-detail', args=[notificacion_privada.id])
        data = {
            'titulo': 'Título Actualizado',
            'leida': True
        }
        response = authenticated_client.put(url, data)

        # Asumimos que no se permite actualizar desde la API
        assert response.status_code in [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]

    def test_delete_notificacion_viewset_no_permitido(self, authenticated_client, notificacion_privada):
        """Intento de eliminar notificación mediante ViewSet (no permitido)"""
        url = reverse('notificacion-detail', args=[notificacion_privada.id])
        response = authenticated_client.delete(url)

        # Asumimos que no se permite eliminar desde la API
        assert response.status_code in [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]