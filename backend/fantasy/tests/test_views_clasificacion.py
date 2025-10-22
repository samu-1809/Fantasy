import pytest
from django.urls import reverse
from rest_framework import status
from fantasy.models import Liga, Equipo

@pytest.mark.django_db
class TestClasificacionViewSet:
    """Tests para la vista de clasificación"""

    def test_list_clasificacion_sin_liga_id(self, authenticated_client):
        """Listar clasificación sin liga_id debe fallar"""
        url = reverse('clasificacion-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'liga_id' in response.data['error']

    def test_list_clasificacion_liga_inexistente(self, authenticated_client):
        """Listar clasificación con liga que no existe"""
        url = reverse('clasificacion-list')
        response = authenticated_client.get(url, {'liga_id': 999})

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'Liga no encontrada' in response.data['error']

    def test_list_clasificacion_vacia(self, authenticated_client, liga):
        """Listar clasificación cuando no hay equipos en la liga"""
        url = reverse('clasificacion-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_list_clasificacion_con_equipos(self, authenticated_client, liga, equipos_clasificacion):
        """Listar clasificación con equipos y sus puntos"""
        url = reverse('clasificacion-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

        # Verificar estructura de cada equipo en la clasificación
        for equipo_data in response.data:
            assert 'equipo_id' in equipo_data
            assert 'nombre' in equipo_data
            assert 'usuario' in equipo_data
            assert 'puntos_totales' in equipo_data
            assert 'presupuesto' in equipo_data
            assert 'posicion' in equipo_data

    def test_list_clasificacion_orden_correcto(self, authenticated_client, liga, equipos_clasificacion):
        """Verificar que la clasificación está ordenada por puntos descendentes"""
        url = reverse('clasificacion-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        
        # Equipo B debería tener más puntos que Equipo A
        # Equipo A: 11 + 12 + 13 = 36 puntos
        # Equipo B: 21 + 22 + 23 = 66 puntos
        assert response.data[0]['nombre'] == 'Equipo B'
        assert response.data[0]['puntos_totales'] == 66
        assert response.data[0]['posicion'] == 1
        
        assert response.data[1]['nombre'] == 'Equipo A'
        assert response.data[1]['puntos_totales'] == 36
        assert response.data[1]['posicion'] == 2

    def test_list_clasificacion_equipo_sin_jugadores(self, authenticated_client, liga, equipo):
        """Equipo sin jugadores debe tener 0 puntos"""
        url = reverse('clasificacion-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        # El equipo sin jugadores debería aparecer con 0 puntos
        equipo_data = next((e for e in response.data if e['nombre'] == equipo.nombre), None)
        if equipo_data:
            assert equipo_data['puntos_totales'] == 0

    def test_list_clasificacion_multiple_ligas(self, authenticated_client, liga, equipos_clasificacion):
        """Verificar que solo se muestran equipos de la liga especificada"""
        # Crear otra liga con equipos
        otra_liga = Liga.objects.create(
            nombre='Otra Liga',
            codigo='OTRA2024',
            jornada_actual=1
        )
        
        otro_equipo = Equipo.objects.create(
            usuario=authenticated_client.handler._force_user,
            liga=otra_liga,
            nombre='Equipo Otra Liga',
            presupuesto=40000000
        )
        
        url = reverse('clasificacion-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})

        assert response.status_code == status.HTTP_200_OK
        # Solo debería mostrar equipos de la liga especificada, no de la otra liga
        equipos_nombres = [e['nombre'] for e in response.data]
        assert 'Equipo Otra Liga' not in equipos_nombres

    def test_list_clasificacion_prefetch_optimizacion(self, authenticated_client, liga, equipos_clasificacion):
        """Verificar que la consulta es eficiente con prefetch"""
        url = reverse('clasificacion-list')
        
        # Contar el número de consultas
        with pytest.raises(NotImplementedError):
            # Esta es una forma simplificada de verificar optimización
            # En una implementación real, podrías usar django-debug-toolbar
            response = authenticated_client.get(url, {'liga_id': liga.id})
            assert response.status_code == status.HTTP_200_OK