from django.http import JsonResponse
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..models import Notificacion
from ..serializers import NotificacionSerializer

class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notificacion.objects.select_related('destinatario')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_notificaciones(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'No autenticado'}, status=401)
    
    # Notificaciones públicas + privadas del usuario
    notificaciones = Notificacion.objects.filter(
        Q(tipo='publica') | Q(destinatario=request.user)
    ).order_by('-fecha_creacion')
    
    serializer = NotificacionSerializer(notificaciones, many=True)
    return JsonResponse({'notificaciones': serializer.data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contar_no_leidas(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'No autenticado'}, status=401)
    
    count = Notificacion.objects.filter(
        Q(tipo='publica') | Q(destinatario=request.user),
        leida=False
    ).count()
    
    return JsonResponse({'cantidad_no_leidas': count})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marcar_todas_leidas(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'No autenticado'}, status=401)
    
    actualizadas = Notificacion.objects.filter(
        Q(tipo='publica') | Q(destinatario=request.user),
        leida=False
    ).update(leida=True)
    
    return JsonResponse({
        'mensaje': f'{actualizadas} notificaciones marcadas como leídas',
        'cantidad_actualizadas': actualizadas
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marcar_como_leida(request, notificacion_id):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'No autenticado'}, status=401)
    
    try:
        notificacion = Notificacion.objects.get(
            Q(id=notificacion_id) & (Q(tipo='publica') | Q(destinatario=request.user))
        )
        notificacion.leida = True
        notificacion.save()
        
        return JsonResponse({
            'mensaje': 'Notificación marcada como leída',
            'notificacion_id': notificacion_id
        })
    except Notificacion.DoesNotExist:
        return JsonResponse(
            {'error': 'Notificación no encontrada'}, 
            status=404
        )

