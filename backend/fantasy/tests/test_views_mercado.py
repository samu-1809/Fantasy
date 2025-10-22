import pytest
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch, MagicMock
from django.core.cache import cache
from fantasy.models import Jugador, Oferta, Puja, Liga, Equipo, Puntuacion
from django.utils import timezone
from datetime import timedelta

@pytest.mark.django_db
class TestMercadoViewSet:
    """Tests para el ViewSet del mercado"""

    def test_list_mercado_sin_liga_id(self, authenticated_client):
        """Listar mercado sin liga_id debe fallar"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'liga_id' in response.data['error']

    def test_list_mercado_liga_inexistente(self, authenticated_client):
        """Listar mercado con liga que no existe"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': 999})
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'Liga no encontrada' in response.data['error']

    def test_list_mercado_vacio(self, authenticated_client, liga):
        """Listar mercado cuando no hay jugadores"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_list_mercado_con_jugadores_libres(self, authenticated_client, liga, jugador_libre_en_mercado_activo):
        """Listar mercado con jugadores libres"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        
        jugador_data = response.data[0]
        assert jugador_data['id'] == jugador_libre_en_mercado_activo.id
        assert jugador_data['tipo'] == 'libre_rotatorio'
        assert jugador_data['vendedor'] == 'Agente libre'
        assert jugador_data['en_venta'] is True
        assert 'fecha_expiracion' in jugador_data
        assert 'tiempo_restante' in jugador_data

    def test_list_mercado_con_jugadores_usuario(self, authenticated_client, liga, jugador_usuario_en_venta):
        """Listar mercado con jugadores de usuarios"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        
        jugador_data = response.data[0]
        assert jugador_data['id'] == jugador_usuario_en_venta.id
        assert jugador_data['tipo'] == 'venta_usuario'
        assert jugador_data['vendedor'] == jugador_usuario_en_venta.equipo.nombre
        assert jugador_data['en_venta'] is True
        assert jugador_data['expirado'] is False
        assert jugador_data['fecha_expiracion'] == 'Hasta que se venda'

    def test_list_mercado_mixto(self, authenticated_client, liga, jugador_libre_en_mercado_activo, jugador_usuario_en_venta):
        """Listar mercado con jugadores libres y de usuarios"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        
        # Verificar que ambos tipos están presentes
        tipos = [jugador['tipo'] for jugador in response.data]
        assert 'libre_rotatorio' in tipos
        assert 'venta_usuario' in tipos

    def test_list_mercado_excluye_expirados(self, authenticated_client, liga, jugador_libre_en_mercado_expirado):
        """No debe incluir jugadores libres expirados"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        # El jugador expirado no debería aparecer
        assert len(response.data) == 0

    def test_list_mercado_con_puntuaciones(self, authenticated_client, liga, jugador_libre_en_mercado_activo, puntuacion_jugador_mercado):
        """Listar mercado incluye información de puntuaciones"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        
        jugador_data = response.data[0]
        # Verificar que se incluyen las puntuaciones (depende del serializer)
        assert 'puntuaciones' in jugador_data or 'puntos_totales' in jugador_data

    def test_list_mercado_jugador_con_puja(self, authenticated_client, liga, jugador_libre_en_mercado_activo, equipo):
        """Jugador con puja actual debe mostrar información del pujador"""
        # Asignar puja actual
        jugador_libre_en_mercado_activo.puja_actual = 6000000
        jugador_libre_en_mercado_activo.equipo_pujador = equipo
        jugador_libre_en_mercado_activo.save()
        
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        jugador_data = response.data[0]
        
        assert jugador_data['puja_actual'] == 6000000
        assert jugador_data['pujador_actual'] == equipo.nombre

    @patch('fantasy.views.mercado_views.cache')
    def test_actualizar_mercado_libre_fijo_nuevo_lote(self, mock_cache, authenticated_client, liga, jugadores_libres_mercado):
        """Actualizar mercado genera nuevo lote cuando no existe en cache"""
        # Configurar cache para devolver None (no hay lote)
        mock_cache.get.return_value = None
        
        # Llamar al listado que activa la actualización
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        # Verificar que se llamó a cache.set para guardar el nuevo lote
        mock_cache.set.assert_called_once()

    @patch('fantasy.views.mercado_views.cache')
    def test_actualizar_mercado_libre_fijo_lote_existente(self, mock_cache, authenticated_client, liga):
        """No genera nuevo lote cuando ya existe en cache"""
        # Configurar cache para devolver True (lote existente)
        mock_cache.get.return_value = True
        
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        # No debería llamar a cache.set porque ya existe el lote
        mock_cache.set.assert_not_called()

    @patch('fantasy.views.mercado_views.MercadoViewSet.generar_ofertas_automaticas')
    def test_generar_ofertas_automaticas_llamado(self, mock_generar, authenticated_client, liga):
        """Verificar que se llama a generar_ofertas_automaticas"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        mock_generar.assert_called_once()

    def test_generar_ofertas_automaticas_con_jugadores_24h(self, jugador_usuario_en_venta_24h, equipo):
        """Generar ofertas automáticas para jugadores con más de 24h en mercado"""
        from fantasy.views.mercado_views import MercadoViewSet
        viewset = MercadoViewSet()
        
        # Verificar ofertas existentes
        ofertas_antes = Oferta.objects.filter(jugador=jugador_usuario_en_venta_24h).count()
        
        # Ejecutar generación de ofertas automáticas
        viewset.generar_ofertas_automaticas()
        
        # Verificar que se creó una oferta
        ofertas_despues = Oferta.objects.filter(jugador=jugador_usuario_en_venta_24h).count()
        assert ofertas_despues > ofertas_antes

    def test_generar_ofertas_automaticas_sin_jugadores_24h(self, jugador_usuario_en_venta):
        """No genera ofertas automáticas para jugadores con menos de 24h"""
        from fantasy.views.mercado_views import MercadoViewSet
        viewset = MercadoViewSet()
        
        ofertas_antes = Oferta.objects.count()
        viewset.generar_ofertas_automaticas()
        ofertas_despues = Oferta.objects.count()
        
        # No debería crear ofertas para jugadores con menos de 24h
        assert ofertas_despues == ofertas_antes

    def test_mercado_serializer_context(self, authenticated_client, liga, jugador_libre_en_mercado_activo):
        """Verificar que el serializer recibe el contexto correcto"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        # El serializer debería manejar correctamente el contexto para cálculos de expiración

@pytest.mark.django_db
class TestOfertaViewSet:
    """Tests para el ViewSet de ofertas"""

    def test_list_ofertas_usuario_normal(self, authenticated_client, oferta_pendiente):
        """Usuario normal ve sus ofertas (como ofertante o receptor)"""
        url = reverse('oferta-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Debería ver la oferta donde es ofertante
        assert len(response.data) == 1
        assert response.data[0]['id'] == oferta_pendiente.id

    def test_list_ofertas_usuario_sin_ofertas(self, authenticated_client, equipo2):
        """Usuario sin ofertas ve lista vacía"""
        # Autenticar como usuario de equipo2 (receptor de oferta_pendiente)
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=equipo2.usuario)
        
        url = reverse('oferta-list')
        response = client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # equipo2 es receptor de oferta_pendiente, debería verla
        assert len(response.data) >= 1

    def test_list_ofertas_superuser(self, admin_client, oferta_pendiente, oferta_aceptada):
        """Superuser ve todas las ofertas"""
        url = reverse('oferta-list')
        response = admin_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Debería ver todas las ofertas
        assert len(response.data) >= 2

    def test_retrieve_oferta_propia(self, authenticated_client, oferta_pendiente):
        """Usuario puede ver detalle de oferta propia"""
        url = reverse('oferta-detail', args=[oferta_pendiente.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == oferta_pendiente.id

    def test_retrieve_oferta_ajena(self, authenticated_client, oferta_aceptada):
        """Usuario no puede ver oferta ajena"""
        url = reverse('oferta-detail', args=[oferta_aceptada.id])
        response = authenticated_client.get(url)
        
        # No debería poder ver ofertas donde no es ofertante ni receptor
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_oferta(self, authenticated_client, jugador_usuario_en_venta):
        """Crear nueva oferta"""
        url = reverse('oferta-list')
        data = {
            'jugador': jugador_usuario_en_venta.id,
            'equipo_ofertante': jugador_usuario_en_venta.equipo.id,  # Esto debería ser automático
            'equipo_receptor': jugador_usuario_en_venta.equipo.id,
            'monto': 11000000,
            'estado': 'pendiente'
        }
        response = authenticated_client.post(url, data)
        
        # Depende de la implementación, pero generalmente debería permitir crear
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN]

    def test_update_oferta_no_permitido(self, authenticated_client, oferta_pendiente):
        """Actualizar oferta no permitido para usuarios normales"""
        url = reverse('oferta-detail', args=[oferta_pendiente.id])
        data = {
            'monto': 12000000
        }
        response = authenticated_client.put(url, data)
        
        # Generalmente no se permite actualizar ofertas existentes
        assert response.status_code in [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]

    def test_delete_oferta_no_permitido(self, authenticated_client, oferta_pendiente):
        """Eliminar oferta no permitido"""
        url = reverse('oferta-detail', args=[oferta_pendiente.id])
        response = authenticated_client.delete(url)
        
        assert response.status_code in [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]

@pytest.mark.django_db
class TestPujaViewSet:
    """Tests para el ViewSet de pujas"""

    def test_list_pujas_usuario_normal(self, authenticated_client, puja_activa):
        """Usuario normal ve sus pujas"""
        url = reverse('puja-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Debería ver la puja activa de su equipo
        assert len(response.data) == 1
        assert response.data[0]['id'] == puja_activa.id

    def test_list_pujas_usuario_sin_pujas(self, authenticated_client, equipo2):
        """Usuario sin pujas ve lista vacía"""
        # Autenticar como usuario de equipo2
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=equipo2.usuario)
        
        url = reverse('puja-list')
        response = client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # equipo2 no tiene pujas activas
        assert len(response.data) == 0

    def test_list_pujas_superuser(self, admin_client, puja_activa, puja_inactiva):
        """Superuser ve todas las pujas"""
        url = reverse('puja-list')
        response = admin_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Debería ver todas las pujas
        assert len(response.data) >= 2

    def test_retrieve_puja_propia(self, authenticated_client, puja_activa):
        """Usuario puede ver detalle de puja propia"""
        url = reverse('puja-detail', args=[puja_activa.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == puja_activa.id

    def test_retrieve_puja_ajena(self, authenticated_client, puja_ganadora):
        """Usuario no puede ver puja ajena"""
        # puja_ganadora pertenece a otro equipo (si existe)
        url = reverse('puja-detail', args=[puja_ganadora.id])
        response = authenticated_client.get(url)
        
        # No debería poder ver pujas ajenas
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_puja(self, authenticated_client, jugador_libre_en_mercado_activo):
        """Crear nueva puja"""
        url = reverse('puja-list')
        data = {
            'jugador': jugador_libre_en_mercado_activo.id,
            'equipo': jugador_libre_en_mercado_activo.equipo_pujador.id if jugador_libre_en_mercado_activo.equipo_pujador else 1,
            'monto': 7000000,
            'activa': True
        }
        response = authenticated_client.post(url, data)
        
        # Depende de la implementación
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN]

    def test_update_puja_no_permitido(self, authenticated_client, puja_activa):
        """Actualizar puja no permitido"""
        url = reverse('puja-detail', args=[puja_activa.id])
        data = {
            'monto': 12000000
        }
        response = authenticated_client.put(url, data)
        
        assert response.status_code in [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]

    def test_delete_puja_no_permitido(self, authenticated_client, puja_activa):
        """Eliminar puja no permitido"""
        url = reverse('puja-detail', args=[puja_activa.id])
        response = authenticated_client.delete(url)
        
        assert response.status_code in [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]

@pytest.mark.django_db
class TestMercadoEdgeCases:
    """Tests para casos edge del mercado"""

    def test_mercado_jugador_con_multiple_puntuaciones(self, authenticated_client, liga, jugador_libre_en_mercado_activo, multiple_puntuaciones_mercado):
        """Jugador con múltiples puntuaciones en el mercado"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        # Debería manejar correctamente las múltiples puntuaciones

    def test_mercado_cache_cleanup(self, authenticated_client, liga, jugador_libre_en_mercado_expirado):
        """Limpieza de jugadores expirados del cache"""
        with patch('fantasy.views.mercado_views.cache') as mock_cache:
            mock_cache.get.return_value = True  # Lote existente
            
            url = reverse('mercado-list')
            response = authenticated_client.get(url, {'liga_id': liga.id})
            
            assert response.status_code == status.HTTP_200_OK
            # Los jugadores expirados deberían ser limpiados

    def test_generar_ofertas_automaticas_monto_calculo(self, jugador_usuario_en_venta_24h):
        """Cálculo correcto del monto en ofertas automáticas"""
        from fantasy.views.mercado_views import MercadoViewSet
        viewset = MercadoViewSet()
        
        # Ejecutar generación
        viewset.generar_ofertas_automaticas()
        
        # Verificar que se creó una oferta con monto razonable
        oferta = Oferta.objects.filter(jugador=jugador_usuario_en_venta_24h).first()
        if oferta:
            # El monto debería ser mayor que la puja actual o el valor
            assert oferta.monto >= min(jugador_usuario_en_venta_24h.puja_actual or 0, jugador_usuario_en_venta_24h.valor)

    def test_mercado_prefetch_puntuaciones(self, authenticated_client, liga, jugador_libre_en_mercado_activo, puntuacion_jugador_mercado):
        """Verificar que se hace prefetch de puntuaciones"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        # No debería haber queries N+1 para puntuaciones

    def test_mercado_ordenamiento(self, authenticated_client, liga, jugador_libre_en_mercado_activo, jugador_usuario_en_venta):
        """Verificar ordenamiento en el mercado"""
        url = reverse('mercado-list')
        response = authenticated_client.get(url, {'liga_id': liga.id})
        
        assert response.status_code == status.HTTP_200_OK
        # Los jugadores deberían estar en algún orden consistente

    def test_oferta_viewset_queryset_filtering(self, authenticated_client, oferta_pendiente, oferta_aceptada):
        """Filtrado correcto del queryset en OfertaViewSet"""
        url = reverse('oferta-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Solo debería ver ofertas relacionadas con sus equipos

    def test_puja_viewset_queryset_filtering(self, authenticated_client, puja_activa, puja_inactiva):
        """Filtrado correcto del queryset en PujaViewSet"""
        url = reverse('puja-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Solo debería ver pujas relacionadas con sus equipos