from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from ..models import Jugador, Jornada, Puntuacion, EquipoReal, Partido
from ..serializers import PuntuacionJornadaSerializer, EquipoRealSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def puntuaciones_jugador(request, jugador_id):
    try:
        jugador = Jugador.objects.get(id=jugador_id)
        puntuaciones = Puntuacion.objects.filter(jugador=jugador).select_related('jornada')
        serializer = PuntuacionJornadaSerializer(puntuaciones, many=True)
        return Response(serializer.data)
    except Jugador.DoesNotExist:
        return Response(
            {"error": "Jugador no encontrado"}, 
            status=404
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def actualizar_puntuacion_jugador(request):
    jugador_id = request.data.get('jugador_id')
    jornada_id = request.data.get('jornada_id')
    puntos = request.data.get('puntos')
    
    try:
        jugador = Jugador.objects.get(id=jugador_id)
        jornada = Jornada.objects.get(id=jornada_id)
        
        puntuacion, created = Puntuacion.objects.update_or_create(
            jugador=jugador,
            jornada=jornada,
            defaults={'puntos': puntos}
        )
        
        jugador.puntos_totales = Puntuacion.objects.filter(jugador=jugador).aggregate(
            total=Sum('puntos')
        )['total'] or 0
        
        jugador.valor = 5000000 + (jugador.puntos_totales * 100000)
        jugador.save()
        
        return Response({
            'message': 'Puntuación actualizada correctamente',
            'puntuacion': PuntuacionJornadaSerializer(puntuacion).data,
            'jugador': {
                'puntos_totales': jugador.puntos_totales,
                'valor': jugador.valor
            }
        })
        
    except (Jugador.DoesNotExist, Jornada.DoesNotExist) as e:
        return Response(
            {"error": str(e)}, 
            status=404
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_puntuacion_jugador(request):
    jugador_id = request.data.get('jugador_id')
    jornada_id = request.data.get('jornada_id')
    puntos = request.data.get('puntos', 0)
    
    try:
        jugador = Jugador.objects.get(id=jugador_id)
        jornada = Jornada.objects.get(id=jornada_id)
        
        if Puntuacion.objects.filter(jugador=jugador, jornada=jornada).exists():
            return Response(
                {"error": "Ya existe una puntuación para este jugador en esta jornada"},
                status=400
            )
        
        puntuacion = Puntuacion.objects.create(
            jugador=jugador,
            jornada=jornada,
            puntos=puntos
        )
        
        total_puntos = Puntuacion.objects.filter(jugador=jugador).aggregate(
            total=Sum('puntos')
        )['total'] or 0
        
        jugador.puntos_totales = total_puntos
        jugador.valor = max(5000000, 5000000 + (total_puntos * 100000))
        jugador.save()
        
        return Response({
            'message': 'Puntuación creada correctamente',
            'puntuacion': PuntuacionJornadaSerializer(puntuacion).data
        })
        
    except (Jugador.DoesNotExist, Jornada.DoesNotExist) as e:
        return Response(
            {"error": str(e)}, 
            status=404
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def equipos_disponibles_jornada(request, jornada_id):
    try:
        jornada = Jornada.objects.get(id=jornada_id)
        
        partidos_jornada = Partido.objects.filter(jornada=jornada)
        
        equipos_ocupados_ids = set()
        for partido in partidos_jornada:
            if partido.equipo_local:
                equipos_ocupados_ids.add(partido.equipo_local.id)
            if partido.equipo_visitante:
                equipos_ocupados_ids.add(partido.equipo_visitante.id)
        
        equipos_disponibles = EquipoReal.objects.exclude(id__in=equipos_ocupados_ids)
        
        serializer = EquipoRealSerializer(equipos_disponibles, many=True)
        return Response(serializer.data)
        
    except Jornada.DoesNotExist:
        return Response(
            {'error': 'Jornada no encontrada'}, 
            status=404
        )