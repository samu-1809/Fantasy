# ====================================================================================
# SISTEMA DE SUBASTAS Y OFERTAS
# ====================================================================================
# Este archivo contiene todos los endpoints para el sistema de mercado con subastas y ofertas
# Copiar estos endpoints al final de views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets, status
from django.db import transaction
from django.utils import timezone
from .models import Jugador, Equipo, Oferta, Puja
from .serializers import OfertaSerializer, PujaSerializer

# ====================================================================================
# ENDPOINT: PUJAR POR JUGADOR (Distingue entre puja y oferta)
# ====================================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pujar_jugador(request, equipo_id):
    """
    Endpoint unificado para pujar/ofertar por un jugador.
    - Si el jugador NO tiene equipo → Crea PUJA (subasta)
    - Si el jugador SÍ tiene equipo → Crea OFERTA (propuesta al dueño)
    """
    try:
        equipo = Equipo.objects.get(id=equipo_id)

        # Verificar que el equipo pertenece al usuario
        if equipo.usuario != request.user:
            return Response({'error': 'No tienes permisos para este equipo'}, status=403)

        jugador_id = request.data.get('jugador_id')
        monto = request.data.get('monto')

        if not jugador_id or not monto:
            return Response({'error': 'Faltan datos: jugador_id y monto son requeridos'}, status=400)

        try:
            jugador = Jugador.objects.get(id=jugador_id)
        except Jugador.DoesNotExist:
            return Response({'error': 'Jugador no encontrado'}, status=404)

        # Verificar presupuesto
        if equipo.presupuesto < monto:
            return Response({'error': 'Presupuesto insuficiente'}, status=400)

        # CASO 1: Jugador SIN equipo → PUJA (Subasta)
        if jugador.equipo is None:
            # Verificar que esté en el mercado
            if not jugador.en_mercado:
                return Response({'error': 'El jugador no está en el mercado'}, status=400)

            # Verificar que no ha expirado
            if jugador.expirado:
                return Response({'error': 'La subasta ha expirado'}, status=400)

            # Verificar que la puja sea mayor que la actual
            if monto <= (jugador.puja_actual or 0):
                return Response({
                    'error': f'La puja debe ser mayor a €{jugador.puja_actual or 0:,}'
                }, status=400)

            # Crear puja
            with transaction.atomic():
                puja = jugador.realizar_puja(equipo, monto)

            return Response({
                'success': True,
                'tipo': 'puja',
                'mensaje': f'Puja de €{monto:,} realizada por {jugador.nombre}',
                'puja_actual': jugador.puja_actual,
                'jugador': jugador.nombre
            })

        # CASO 2: Jugador CON equipo → OFERTA (Propuesta al dueño)
        else:
            # Verificar que el jugador esté en venta
            if not jugador.en_venta:
                return Response({'error': 'El jugador no está en venta'}, status=400)

            # Verificar que no sea su propio jugador
            if jugador.equipo == equipo:
                return Response({'error': 'No puedes hacer oferta por tu propio jugador'}, status=400)

            # Verificar que no tenga ya una oferta pendiente por este jugador
            oferta_existente = Oferta.objects.filter(
                jugador=jugador,
                equipo_ofertante=equipo,
                estado='pendiente'
            ).exists()

            if oferta_existente:
                return Response({
                    'error': 'Ya tienes una oferta pendiente por este jugador'
                }, status=400)

            # Crear oferta
            with transaction.atomic():
                oferta = Oferta.objects.create(
                    jugador=jugador,
                    equipo_ofertante=equipo,
                    equipo_receptor=jugador.equipo,
                    monto=monto,
                    estado='pendiente'
                )

            return Response({
                'success': True,
                'tipo': 'oferta',
                'mensaje': f'Oferta de €{monto:,} enviada a {jugador.equipo.nombre}',
                'oferta_id': oferta.id,
                'jugador': jugador.nombre,
                'equipo_receptor': jugador.equipo.nombre
            })

    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        return Response({'error': f'Error interno: {str(e)}'}, status=500)


# ====================================================================================
# ENDPOINT: OFERTAS RECIBIDAS
# ====================================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ofertas_recibidas(request, equipo_id):
    """
    Listar todas las ofertas pendientes recibidas por este equipo
    """
    try:
        equipo = Equipo.objects.get(id=equipo_id)

        # Verificar que el equipo pertenece al usuario
        if equipo.usuario != request.user:
            return Response({'error': 'No tienes permisos para este equipo'}, status=403)

        ofertas = Oferta.objects.filter(
            equipo_receptor=equipo,
            estado='pendiente'
        ).select_related('jugador', 'equipo_ofertante').order_by('-fecha_oferta')

        serializer = OfertaSerializer(ofertas, many=True)
        return Response(serializer.data)

    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)


# ====================================================================================
# ENDPOINT: OFERTAS REALIZADAS
# ====================================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ofertas_realizadas(request, equipo_id):
    """
    Listar todas las ofertas realizadas por este equipo (pendientes, aceptadas, rechazadas)
    """
    try:
        equipo = Equipo.objects.get(id=equipo_id)

        # Verificar que el equipo pertenece al usuario
        if equipo.usuario != request.user:
            return Response({'error': 'No tienes permisos para este equipo'}, status=403)

        ofertas = Oferta.objects.filter(
            equipo_ofertante=equipo
        ).select_related('jugador', 'equipo_receptor').order_by('-fecha_oferta')

        serializer = OfertaSerializer(ofertas, many=True)
        return Response(serializer.data)

    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)


# ====================================================================================
# ENDPOINT: ACEPTAR OFERTA
# ====================================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def aceptar_oferta(request, oferta_id):
    """
    Aceptar una oferta: transfiere el jugador y el dinero
    """
    try:
        oferta = Oferta.objects.select_related(
            'jugador', 'equipo_ofertante', 'equipo_receptor'
        ).get(id=oferta_id)

        # Verificar que la oferta es para el usuario
        if oferta.equipo_receptor.usuario != request.user:
            return Response({'error': 'No tienes permisos para aceptar esta oferta'}, status=403)

        # Verificar que la oferta está pendiente
        if oferta.estado != 'pendiente':
            return Response({'error': 'La oferta ya fue procesada'}, status=400)

        # Verificar que el equipo ofertante tiene presupuesto
        if oferta.equipo_ofertante.presupuesto < oferta.monto:
            return Response({
                'error': 'El equipo ofertante ya no tiene presupuesto suficiente'
            }, status=400)

        # Aceptar oferta (incluye transacciones atómicas)
        with transaction.atomic():
            if oferta.aceptar():
                return Response({
                    'success': True,
                    'mensaje': f'Oferta aceptada. {oferta.jugador.nombre} transferido a {oferta.equipo_ofertante.nombre}',
                    'monto': oferta.monto,
                    'jugador': oferta.jugador.nombre,
                    'nuevo_equipo': oferta.equipo_ofertante.nombre
                })
            else:
                return Response({'error': 'No se pudo aceptar la oferta'}, status=400)

    except Oferta.DoesNotExist:
        return Response({'error': 'Oferta no encontrada'}, status=404)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
    except Exception as e:
        return Response({'error': f'Error interno: {str(e)}'}, status=500)


# ====================================================================================
# ENDPOINT: RECHAZAR OFERTA
# ====================================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rechazar_oferta(request, oferta_id):
    """
    Rechazar una oferta: marca la oferta como rechazada
    """
    try:
        oferta = Oferta.objects.select_related('equipo_receptor').get(id=oferta_id)

        # Verificar que la oferta es para el usuario
        if oferta.equipo_receptor.usuario != request.user:
            return Response({'error': 'No tienes permisos para rechazar esta oferta'}, status=403)

        # Verificar que la oferta está pendiente
        if oferta.estado != 'pendiente':
            return Response({'error': 'La oferta ya fue procesada'}, status=400)

        with transaction.atomic():
            if oferta.rechazar():
                return Response({
                    'success': True,
                    'mensaje': 'Oferta rechazada'
                })
            else:
                return Response({'error': 'No se pudo rechazar la oferta'}, status=400)

    except Oferta.DoesNotExist:
        return Response({'error': 'Oferta no encontrada'}, status=404)


# ====================================================================================
# ENDPOINT: RETIRAR OFERTA
# ====================================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retirar_oferta(request, oferta_id):
    """
    Retirar una oferta pendiente (solo el ofertante puede hacerlo)
    """
    try:
        oferta = Oferta.objects.select_related('equipo_ofertante').get(id=oferta_id)

        # Verificar que la oferta pertenece al usuario
        if oferta.equipo_ofertante.usuario != request.user:
            return Response({'error': 'No tienes permisos para retirar esta oferta'}, status=403)

        # Verificar que la oferta está pendiente
        if oferta.estado != 'pendiente':
            return Response({'error': 'Solo puedes retirar ofertas pendientes'}, status=400)

        with transaction.atomic():
            if oferta.retirar():
                return Response({
                    'success': True,
                    'mensaje': 'Oferta retirada exitosamente'
                })
            else:
                return Response({'error': 'No se pudo retirar la oferta'}, status=400)

    except Oferta.DoesNotExist:
        return Response({'error': 'Oferta no encontrada'}, status=404)


# ====================================================================================
# VIEWSET: OFERTAS (CRUD completo)
# ====================================================================================

class OfertaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para administrar ofertas (principalmente para admin)
    """
    queryset = Oferta.objects.all()
    serializer_class = OfertaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Oferta.objects.all()

        # Usuarios normales solo ven ofertas relacionadas con sus equipos
        equipos_usuario = Equipo.objects.filter(usuario=user)
        return Oferta.objects.filter(
            Q(equipo_ofertante__in=equipos_usuario) |
            Q(equipo_receptor__in=equipos_usuario)
        )


# ====================================================================================
# VIEWSET: PUJAS (CRUD completo)
# ====================================================================================

class PujaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para administrar pujas (principalmente para admin y ver historial)
    """
    queryset = Puja.objects.all()
    serializer_class = PujaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Puja.objects.all()

        # Usuarios normales solo ven sus propias pujas
        equipos_usuario = Equipo.objects.filter(usuario=user)
        return Puja.objects.filter(equipo__in=equipos_usuario)
