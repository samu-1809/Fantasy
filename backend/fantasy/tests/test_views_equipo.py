import pytest
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch, MagicMock
from fantasy.models import Equipo, Jugador, Puja

@pytest.mark.django_db
class TestPlantillaEquipo:
    """Tests para la vista plantilla_equipo"""

    def test_plantilla_equipo_existente(self, authenticated_client, equipo_completo_con_jugadores):
        """Obtener plantilla de equipo existente"""
        url = reverse('plantilla_equipo', args=[equipo_completo_con_jugadores.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'equipo' in response.data
        assert 'jugadores' in response.data
        assert 'alineacion' in response.data
        
        # Verificar que la alineación tiene la estructura correcta
        alineacion = response.data['alineacion']
        assert 'portero_titular' in alineacion
        assert 'defensas_titulares' in alineacion
        assert 'delanteros_titulares' in alineacion
        assert 'banquillo' in alineacion

    def test_plantilla_equipo_no_existente(self, authenticated_client):
        """Intento de obtener plantilla de equipo que no existe"""
        url = reverse('plantilla_equipo', args=[999])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data

    def test_plantilla_equipo_ajeno(self, authenticated_client, equipo2):
        """Intento de obtener plantilla de equipo ajeno"""
        url = reverse('plantilla_equipo', args=[equipo2.id])
        response = authenticated_client.get(url)

        # Debería fallar porque el equipo no pertenece al usuario autenticado
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_plantilla_equipo_vacio(self, authenticated_client, equipo):
        """Obtener plantilla de equipo sin jugadores"""
        url = reverse('plantilla_equipo', args=[equipo.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['jugadores']) == 0
        # La alineación debe estar vacía pero con la estructura
        alineacion = response.data['alineacion']
        assert alineacion['portero_titular'] is None
        assert len(alineacion['defensas_titulares']) == 0
        assert len(alineacion['delanteros_titulares']) == 0
        assert len(alineacion['banquillo']) == 0

    def test_calcular_alineacion_backend(self, equipo_con_jugadores_posiciones):
        """Prueba unitaria de la función calcular_alineacion_backend"""
        from fantasy.views.equipo_views import calcular_alineacion_backend
        
        jugadores = equipo_con_jugadores_posiciones.jugadores.all()
        alineacion = calcular_alineacion_backend(jugadores)
        
        # Debería haber 1 portero titular, 2 defensas titulares, 2 delanteros titulares y 3 en banquillo
        assert alineacion['portero_titular'] is not None
        assert len(alineacion['defensas_titulares']) == 2
        assert len(alineacion['delanteros_titulares']) == 2
        assert len(alineacion['banquillo']) == 3

        # Verificar que los titulares no están en el banquillo
        titulares_ids = set()
        if alineacion['portero_titular']:
            titulares_ids.add(alineacion['portero_titular']['id'])
        for defensor in alineacion['defensas_titulares']:
            titulares_ids.add(defensor['id'])
        for delantero in alineacion['delanteros_titulares']:
            titulares_ids.add(delantero['id'])
        
        for jugador_banquillo in alineacion['banquillo']:
            assert jugador_banquillo['id'] not in titulares_ids

@pytest.mark.django_db
class TestMiEquipo:
    """Tests para la vista mi_equipo"""

    def test_mi_equipo_existente(self, authenticated_client, equipo):
        """Obtener el equipo del usuario autenticado"""
        url = reverse('mi_equipo')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == equipo.id
        assert response.data['nombre'] == equipo.nombre

    def test_mi_equipo_no_existente(self, authenticated_client, user2):
        """Usuario sin equipo debe recibir error 404"""
        # Autenticar como user2 que no tiene equipo
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user2)
        
        url = reverse('mi_equipo')
        response = client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data

@pytest.mark.django_db
class TestPonerEnVenta:
    """Tests para la vista poner_en_venta"""

    def test_poner_en_venta_exitoso(self, authenticated_client, equipo, jugador_delantero):
        """Poner jugador en venta exitosamente"""
        # Asignar jugador al equipo
        jugador_delantero.equipo = equipo
        jugador_delantero.save()

        url = reverse('poner_en_venta', args=[equipo.id, jugador_delantero.id])
        data = {'precio_venta': 15000000}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert 'precio_venta' in response.data
        assert response.data['precio_venta'] == 15000000

        # Verificar que el jugador está en venta
        jugador_delantero.refresh_from_db()
        assert jugador_delantero.en_venta is True
        assert jugador_delantero.precio_venta == 15000000

    def test_poner_en_venta_sin_precio(self, authenticated_client, equipo, jugador_delantero):
        """Poner jugador en venta sin precio, usa valor por defecto"""
        jugador_delantero.equipo = equipo
        jugador_delantero.save()

        url = reverse('poner_en_venta', args=[equipo.id, jugador_delantero.id])
        response = authenticated_client.post(url, {})

        assert response.status_code == status.HTTP_200_OK
        # Debería usar el valor del jugador como precio_venta por defecto
        assert response.data['precio_venta'] == jugador_delantero.valor

    def test_poner_en_venta_jugador_ajeno(self, authenticated_client, equipo2, jugador_delantero):
        """Intento de poner en venta jugador de otro equipo"""
        jugador_delantero.equipo = equipo2
        jugador_delantero.save()

        url = reverse('poner_en_venta', args=[equipo2.id, jugador_delantero.id])
        response = authenticated_client.post(url, {})

        # No debería permitir porque el equipo no pertenece al usuario
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_poner_en_venta_equipo_ajeno(self, authenticated_client, equipo2, jugador_delantero):
        """Intento de poner en venta en equipo ajeno"""
        jugador_delantero.equipo = equipo
        jugador_delantero.save()

        url = reverse('poner_en_venta', args=[equipo2.id, jugador_delantero.id])
        response = authenticated_client.post(url, {})

        # No debería permitir porque el equipo no pertenece al usuario
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_poner_en_venta_jugador_no_existente(self, authenticated_client, equipo):
        """Intento de poner en venta jugador que no existe"""
        url = reverse('poner_en_venta', args=[equipo.id, 999])
        response = authenticated_client.post(url, {})

        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
class TestQuitarDelMercado:
    """Tests para la vista quitar_del_mercado"""

    def test_quitar_del_mercado_exitoso(self, authenticated_client, jugador_en_venta_con_pujas, mock_crear_notificacion):
        """Quitar jugador del mercado exitosamente"""
        equipo = jugador_en_venta_con_pujas.equipo
        url = reverse('quitar_del_mercado', args=[equipo.id, jugador_en_venta_con_pujas.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data

        # Verificar que el jugador ya no está en venta
        jugador_en_venta_con_pujas.refresh_from_db()
        assert jugador_en_venta_con_pujas.en_venta is False
        assert jugador_en_venta_con_pujas.precio_venta is None

        # Verificar que las pujas se marcaron como inactivas
        pujas = Puja.objects.filter(jugador=jugador_en_venta_con_pujas, activa=True)
        assert pujas.count() == 0

        # Verificar que se llamó a crear_notificacion para cada puja
        assert mock_crear_notificacion.call_count == 1

    def test_quitar_del_mercado_sin_pujas(self, authenticated_client, equipo, jugador_usuario_en_venta):
        """Quitar jugador del mercado que no tiene pujas"""
        url = reverse('quitar_del_mercado', args=[equipo.id, jugador_usuario_en_venta.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK

        # Verificar que el jugador ya no está en venta
        jugador_usuario_en_venta.refresh_from_db()
        assert jugador_usuario_en_venta.en_venta is False

    def test_quitar_del_mercado_jugador_no_en_venta(self, authenticated_client, equipo, jugador_delantero):
        """Intento de quitar del mercado a jugador que no está en venta"""
        jugador_delantero.equipo = equipo
        jugador_delantero.save()

        url = reverse('quitar_del_mercado', args=[equipo.id, jugador_delantero.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_quitar_del_mercado_jugador_ajeno(self, authenticated_client, equipo2, jugador_usuario_en_venta):
        """Intento de quitar del mercado a jugador de otro equipo"""
        url = reverse('quitar_del_mercado', args=[equipo2.id, jugador_usuario_en_venta.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_quitar_del_mercado_equipo_ajeno(self, authenticated_client, equipo2, jugador_usuario_en_venta):
        """Intento de quitar del mercado usando equipo ajeno"""
        # jugador_usuario_en_venta pertenece a equipo2, pero el usuario autenticado es de equipo
        url = reverse('quitar_del_mercado', args=[equipo2.id, jugador_usuario_en_venta.id])
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
class TestIntercambiarJugadores:
    """Tests para la vista intercambiar_jugadores"""

    def test_intercambiar_jugadores_exitoso(self, authenticated_client, equipo_completo_con_jugadores):
        """Intercambiar dos jugadores de misma posición exitosamente"""
        jugadores = equipo_completo_con_jugadores.jugadores.all()
        # Elegir dos defensas
        defensas = [j for j in jugadores if j.posicion == 'DEF']
        jugador1 = defensas[0]
        jugador2 = defensas[1]

        # Guardar estados iniciales
        estado1_ini = jugador1.en_banquillo
        estado2_ini = jugador2.en_banquillo

        url = reverse('intercambiar_jugadores', args=[equipo_completo_con_jugadores.id])
        data = {
            'jugador_origen_id': jugador1.id,
            'jugador_destino_id': jugador2.id
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data

        # Verificar que se intercambiaron los estados
        jugador1.refresh_from_db()
        jugador2.refresh_from_db()
        assert jugador1.en_banquillo == estado2_ini
        assert jugador2.en_banquillo == estado1_ini

    def test_intercambiar_jugadores_diferente_posicion(self, authenticated_client, equipo_completo_con_jugadores):
        """Intento de intercambiar jugadores de diferente posición"""
        jugadores = equipo_completo_con_jugadores.jugadores.all()
        portero = next(j for j in jugadores if j.posicion == 'POR')
        defensa = next(j for j in jugadores if j.posicion == 'DEF')

        url = reverse('intercambiar_jugadores', args=[equipo_completo_con_jugadores.id])
        data = {
            'jugador_origen_id': portero.id,
            'jugador_destino_id': defensa.id
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_intercambiar_jugadores_equipo_ajeno(self, authenticated_client, equipo2):
        """Intento de intercambiar jugadores en equipo ajeno"""
        url = reverse('intercambiar_jugadores', args=[equipo2.id])
        data = {
            'jugador_origen_id': 1,
            'jugador_destino_id': 2
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_intercambiar_jugadores_no_existentes(self, authenticated_client, equipo):
        """Intento de intercambiar jugadores que no existen"""
        url = reverse('intercambiar_jugadores', args=[equipo.id])
        data = {
            'jugador_origen_id': 999,
            'jugador_destino_id': 998
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_intercambiar_jugadores_sin_ids(self, authenticated_client, equipo):
        """Intento de intercambiar sin proporcionar IDs"""
        url = reverse('intercambiar_jugadores', args=[equipo.id])
        data = {}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

@pytest.mark.django_db
class TestActualizarEstadosBanquillo:
    """Tests para la vista actualizar_estados_banquillo"""

    def test_actualizar_estados_banquillo_exitoso(self, authenticated_client, equipo_completo_con_jugadores):
        """Actualizar estados de banquillo exitosamente"""
        jugadores = equipo_completo_con_jugadores.jugadores.all()
        estados = []
        for jugador in jugadores:
            estados.append({
                'jugador_id': jugador.id,
                'en_banquillo': not jugador.en_banquillo  # Invertir el estado
            })

        url = reverse('actualizar_estados_banquillo', args=[equipo_completo_con_jugadores.id])
        data = {'estados': estados}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cambios_realizados'] == len(jugadores)

        # Verificar que los estados se actualizaron
        for estado in estados:
            jugador = Jugador.objects.get(id=estado['jugador_id'])
            assert jugador.en_banquillo == estado['en_banquillo']

    def test_actualizar_estados_banquillo_parcial(self, authenticated_client, equipo_completo_con_jugadores):
        """Actualizar solo algunos estados"""
        jugadores = equipo_completo_con_jugadores.jugadores.all()[:2]
        estados = []
        for jugador in jugadores:
            estados.append({
                'jugador_id': jugador.id,
                'en_banquillo': not jugador.en_banquillo
            })

        url = reverse('actualizar_estados_banquillo', args=[equipo_completo_con_jugadores.id])
        data = {'estados': estados}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cambios_realizados'] == len(jugadores)

    def test_actualizar_estados_banquillo_equipo_ajeno(self, authenticated_client, equipo2):
        """Intento de actualizar estados en equipo ajeno"""
        url = reverse('actualizar_estados_banquillo', args=[equipo2.id])
        data = {'estados': []}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_actualizar_estados_banquillo_jugador_ajeno(self, authenticated_client, equipo, equipo2, jugador_delantero):
        """Intento de actualizar estado de jugador de otro equipo"""
        jugador_delantero.equipo = equipo2
        jugador_delantero.save()

        url = reverse('actualizar_estados_banquillo', args=[equipo.id])
        data = {
            'estados': [{
                'jugador_id': jugador_delantero.id,
                'en_banquillo': True
            }]
        }
        response = authenticated_client.post(url, data)

        # Debería fallar porque el jugador no pertenece al equipo
        assert response.status_code == status.HTTP_200_OK
        # Pero el cambio no se realiza y se cuenta como error
        assert response.data['errores'] == 1

    def test_actualizar_estados_banquillo_sin_estados(self, authenticated_client, equipo):
        """Actualizar sin enviar estados"""
        url = reverse('actualizar_estados_banquillo', args=[equipo.id])
        data = {}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['cambios_realizados'] == 0

@pytest.mark.django_db
class TestMoverAAlineacion:
    """Tests para la vista mover_a_alineacion"""

    def test_mover_a_alineacion_exitoso(self, authenticated_client, equipo_completo_con_jugadores):
        """Mover jugador del banquillo a la alineación exitosamente"""
        # Encontrar un jugador en el banquillo
        jugador_banquillo = next((j for j in equipo_completo_con_jugadores.jugadores.all() if j.en_banquillo), None)
        assert jugador_banquillo is not None

        url = reverse('mover_a_alineacion', args=[equipo_completo_con_jugadores.id])
        data = {
            'jugador_id': jugador_banquillo.id,
            'posicion': jugador_banquillo.posicion
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True

        # Verificar que el jugador ya no está en el banquillo
        jugador_banquillo.refresh_from_db()
        assert jugador_banquillo.en_banquillo is False

    def test_mover_a_alineacion_jugador_ya_titular(self, authenticated_client, equipo_completo_con_jugadores):
        """Intento de mover jugador que ya es titular"""
        # Encontrar un jugador titular
        jugador_titular = next((j for j in equipo_completo_con_jugadores.jugadores.all() if not j.en_banquillo), None)
        assert jugador_titular is not None

        url = reverse('mover_a_alineacion', args=[equipo_completo_con_jugadores.id])
        data = {
            'jugador_id': jugador_titular.id,
            'posicion': jugador_titular.posicion
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_mover_a_alineacion_posicion_incorrecta(self, authenticated_client, equipo_completo_con_jugadores):
        """Intento de mover jugador a posición incorrecta"""
        jugador_banquillo = next((j for j in equipo_completo_con_jugadores.jugadores.all() if j.en_banquillo), None)
        assert jugador_banquillo is not None

        url = reverse('mover_a_alineacion', args=[equipo_completo_con_jugadores.id])
        data = {
            'jugador_id': jugador_banquillo.id,
            'posicion': 'POSICION_INCORRECTA'
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_mover_a_alineacion_equipo_ajeno(self, authenticated_client, equipo2):
        """Intento de mover jugador en equipo ajeno"""
        url = reverse('mover_a_alineacion', args=[equipo2.id])
        data = {
            'jugador_id': 1,
            'posicion': 'DEL'
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mover_a_alineacion_jugador_no_existente(self, authenticated_client, equipo):
        """Intento de mover jugador que no existe"""
        url = reverse('mover_a_alineacion', args=[equipo.id])
        data = {
            'jugador_id': 999,
            'posicion': 'DEL'
        }
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
class TestGuardarAlineacion:
    """Tests para la vista guardar_alineacion"""

    def test_guardar_alineacion_exitoso(self, authenticated_client, equipo_completo_con_jugadores):
        """Guardar alineación exitosamente"""
        jugadores = equipo_completo_con_jugadores.jugadores.all()
        nuevos_estados = []
        for jugador in jugadores:
            nuevos_estados.append({
                'jugador_id': jugador.id,
                'en_banquillo': not jugador.en_banquillo  # Invertir estado
            })

        url = reverse('guardar_alineacion', args=[equipo_completo_con_jugadores.id])
        data = {'jugadores': nuevos_estados}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data

        # Verificar que los estados se actualizaron
        for estado in nuevos_estados:
            jugador = Jugador.objects.get(id=estado['jugador_id'])
            assert jugador.en_banquillo == estado['en_banquillo']

    def test_guardar_alineacion_equipo_ajeno(self, authenticated_client, equipo2):
        """Intento de guardar alineación en equipo ajeno"""
        url = reverse('guardar_alineacion', args=[equipo2.id])
        data = {'jugadores': []}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_guardar_alineacion_jugador_ajeno(self, authenticated_client, equipo, equipo2, jugador_delantero):
        """Intento de guardar alineación con jugador de otro equipo"""
        jugador_delantero.equipo = equipo2
        jugador_delantero.save()

        url = reverse('guardar_alineacion', args=[equipo.id])
        data = {
            'jugadores': [{
                'jugador_id': jugador_delantero.id,
                'en_banquillo': True
            }]
        }
        response = authenticated_client.post(url, data)

        # Debería fallar porque el jugador no pertenece al equipo
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_guardar_alineacion_sin_jugadores(self, authenticated_client, equipo):
        """Guardar alineación sin datos de jugadores"""
        url = reverse('guardar_alineacion', args=[equipo.id])
        data = {}
        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data