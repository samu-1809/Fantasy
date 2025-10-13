from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from ..models import Notificacion, TransaccionEconomica, TipoNotificacion
from ..serializers import NotificacionSerializer, TransaccionEconomicaSerializer

class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Notificacion.objects.filter(usuario=self.request.user).select_related('tipo')
        return Notificacion.objects.none()

    @action(detail=False, methods=['get'])
    def mis_notificaciones(self, request):
        print("📨 Obteniendo notificaciones del usuario")
        try:
            notificaciones = self.get_queryset()
            serializer = self.get_serializer(notificaciones, many=True)
            return Response({
                'notificaciones': serializer.data
            })
        except Exception as e:
            print(f"❌ Error obteniendo notificaciones: {str(e)}")
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        print(f"🔄 Marcando notificación {pk} como leída")
        try:
            notificacion = self.get_object()
            notificacion.es_leida = True
            notificacion.save()
            
            print(f"✅ Notificación {pk} marcada como leída")
            return Response({'mensaje': 'Notificación marcada como leída'})
            
        except Notificacion.DoesNotExist:
            print("❌ Notificación no encontrada")
            return Response(
                {'error': 'Notificación no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"❌ Error marcando notificación como leída: {str(e)}")
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TransaccionEconomicaViewSet(viewsets.ModelViewSet):
    serializer_class = TransaccionEconomicaSerializer

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return TransaccionEconomica.objects.filter(usuario=self.request.user)
        return TransaccionEconomica.objects.none()

    @action(detail=False, methods=['get'])
    def mis_transacciones(self, request):
        print("💰 Obteniendo transacciones del usuario")
        try:
            transacciones = self.get_queryset()
            serializer = self.get_serializer(transacciones, many=True)
            return Response({
                'transacciones': serializer.data
            })
        except Exception as e:
            print(f"❌ Error obteniendo transacciones: {str(e)}")
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

def crear_notificacion(usuario, tipo_codigo, titulo, mensaje, datos_extra=None, es_publica=False):
    try:
        tipo = TipoNotificacion.objects.get(codigo=tipo_codigo)
        notificacion = Notificacion.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            datos_extra=datos_extra or {}
        )
        return notificacion
    except TipoNotificacion.DoesNotExist:
        print(f"Tipo de notificación no encontrado: {tipo_codigo}")
        return None

def crear_notificacion_publica(tipo_codigo, titulo, mensaje, datos_extra=None):
    """Crear notificación para todos los usuarios"""
    try:
        from django.contrib.auth.models import User
        from .models import TipoNotificacion, Notificacion
        
        # Obtener el tipo de notificación
        tipo = TipoNotificacion.objects.get(codigo=tipo_codigo)
        
        # Obtener todos los usuarios
        usuarios = User.objects.all()
        
        notificaciones_creadas = 0
        for usuario in usuarios:
            Notificacion.objects.create(
                usuario=usuario,
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                datos_extra=datos_extra or {}
            )
            notificaciones_creadas += 1
        
        print(f"✅ Notificación pública creada para {notificaciones_creadas} usuarios: {titulo}")
        return notificaciones_creadas
        
    except Exception as e:
        print(f"❌ Error creando notificación pública: {str(e)}")
        return 0

def crear_transaccion(usuario, tipo, monto, descripcion):
    return TransaccionEconomica.objects.create(
        usuario=usuario,
        tipo=tipo,
        monto=monto,
        descripcion=descripcion
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mis_notificaciones(request):
    print("📨 Obteniendo notificaciones del usuario")
    try:
        notificaciones = Notificacion.objects.filter(usuario=request.user).select_related('tipo')
        serializer = NotificacionSerializer(notificaciones, many=True)
        return Response({
            'notificaciones': serializer.data
        })
    except Exception as e:
        print(f"❌ Error obteniendo notificaciones: {str(e)}")
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marcar_notificacion_leida(request, notificacion_id):
    print(f"🔄 Marcando notificación {notificacion_id} como leída")
    try:
        notificacion = Notificacion.objects.get(id=notificacion_id, usuario=request.user)
        notificacion.es_leida = True
        notificacion.save()
        
        print(f"✅ Notificación {notificacion_id} marcada como leída")
        return Response({'mensaje': 'Notificación marcada como leída'})
        
    except Notificacion.DoesNotExist:
        print("❌ Notificación no encontrada")
        return Response(
            {'error': 'Notificación no encontrada'}, 
            status=404
        )
    except Exception as e:
        print(f"❌ Error marcando notificación como leída: {str(e)}")
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mis_transacciones(request):
    print("💰 Obteniendo transacciones del usuario")
    try:
        transacciones = TransaccionEconomica.objects.filter(usuario=request.user)
        serializer = TransaccionEconomicaSerializer(transacciones, many=True)
        return Response({
            'transacciones': serializer.data
        })
    except Exception as e:
        print(f"❌ Error obteniendo transacciones: {str(e)}")
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )