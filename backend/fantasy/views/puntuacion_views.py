from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from ..models import Jugador, Jornada, Puntuacion, EquipoReal, Partido, AlineacionCongelada
from ..serializers import PuntuacionJornadaSerializer, EquipoRealSerializer, JugadorSerializer

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def puntuaciones_por_partido(request, partido_id):
    try:
        partido = Partido.objects.select_related(
            'equipo_local', 'equipo_visitante', 'jornada'
        ).get(id=partido_id)
        
        # Obtener jugadores de ambos equipos reales
        jugadores_local = Jugador.objects.filter(
            equipo_real=partido.equipo_local
        ).select_related('equipo_real')
        
        jugadores_visitante = Jugador.objects.filter(
            equipo_real=partido.equipo_visitante
        ).select_related('equipo_real')
        
        # Obtener puntuaciones para esta jornada
        puntuaciones_jornada = Puntuacion.objects.filter(
            jornada=partido.jornada,
            jugador__in=list(jugadores_local) + list(jugadores_visitante)
        ).select_related('jugador')
        
        # Crear diccionario de puntuaciones y goles por jugador
        puntuaciones_dict = {}
        goles_dict = {}
        for punt in puntuaciones_jornada:
            puntuaciones_dict[punt.jugador_id] = punt.puntos
            goles_dict[punt.jugador_id] = punt.goles  # 🆕 Guardar goles por jugador
        
        # Serializar datos
        def serializar_jugadores(jugadores_queryset):
            jugadores_data = []
            for jugador in jugadores_queryset:
                puntos_jornada = puntuaciones_dict.get(jugador.id, 0)
                goles_jornada = goles_dict.get(jugador.id, 0)  # 🆕 Obtener goles de esta jornada
                jugadores_data.append({
                    'id': jugador.id,
                    'nombre': jugador.nombre,
                    'posicion': jugador.posicion,
                    'posicion_display': jugador.posicion_display,
                    'valor': jugador.valor,
                    'puntos_totales': jugador.puntos_totales,
                    'puntos_jornada': puntos_jornada,
                    'goles': goles_jornada,  # 🆕 Añadir goles a la respuesta
                    'equipo_fantasy_nombre': jugador.equipo.nombre if jugador.equipo else 'Libre',
                    'en_venta': jugador.en_venta,
                    'equipo_real_nombre': jugador.equipo_real.nombre  # 🆕 Añadir nombre equipo real
                })
            return jugadores_data
        
        response_data = {
            'partido': {
                'id': partido.id,
                'equipo_local': partido.equipo_local.nombre,
                'equipo_visitante': partido.equipo_visitante.nombre,
                'goles_local': partido.goles_local,
                'goles_visitante': partido.goles_visitante,
                'fecha': partido.fecha,
                'jornada_numero': partido.jornada.numero,
                'jugado': partido.jugado
            },
            'jugadores_local': serializar_jugadores(jugadores_local),
            'jugadores_visitante': serializar_jugadores(jugadores_visitante)
        }
        
        return Response(response_data)
        
    except Partido.DoesNotExist:
        return Response(
            {"error": "Partido no encontrado"}, 
            status=404
        )
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=500
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def actualizar_puntuacion_jugador(request):
    jugador_id = request.data.get('jugador_id')
    jornada_id = request.data.get('jornada_id')
    puntos = request.data.get('puntos')
    goles = request.data.get('goles', 0)
    
    try:
        jugador = Jugador.objects.get(id=jugador_id)
        jornada = Jornada.objects.get(id=jornada_id)
        
        puntuacion, created = Puntuacion.objects.update_or_create(
            jugador=jugador,
            jornada=jornada,
            defaults={
                'puntos': puntos,
                'goles': goles
            }
            
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alineacion_congelada_jornada(request, equipo_id, jornada_id):
    """
    Obtiene la alineación congelada de un equipo para una jornada específica,
    incluyendo los puntos obtenidos por cada jugador titular.
    """
    try:
        jornada = Jornada.objects.get(id=jornada_id)

        # Verificar si la jornada tiene alineaciones congeladas
        if not jornada.alineaciones_congeladas:
            return Response({
                'congelada': False,
                'mensaje': f'La Jornada {jornada.numero} aún no ha iniciado. Las alineaciones se congelarán automáticamente.'
            })

        # Buscar alineación congelada
        try:
            alineacion = AlineacionCongelada.objects.prefetch_related(
                'jugadores_titulares'
            ).get(equipo_id=equipo_id, jornada=jornada)
        except AlineacionCongelada.DoesNotExist:
            return Response(
                {'error': f'No se encontró alineación congelada para este equipo en la Jornada {jornada.numero}'},
                status=404
            )

        # Obtener puntuaciones de los jugadores titulares
        titulares_con_puntos = []
        for jugador in alineacion.jugadores_titulares.all():
            try:
                puntuacion = Puntuacion.objects.get(
                    jugador=jugador,
                    jornada=jornada
                )
                puntos_jornada = puntuacion.puntos
                goles_jornada = puntuacion.goles
            except Puntuacion.DoesNotExist:
                puntos_jornada = 0
                goles_jornada = 0

            # Serializar jugador con puntos de la jornada
            jugador_data = JugadorSerializer(jugador).data
            jugador_data['puntos_jornada'] = puntos_jornada
            jugador_data['goles_jornada'] = goles_jornada
            titulares_con_puntos.append(jugador_data)

        response_data = {
            'congelada': True,
            'jornada': {
                'id': jornada.id,
                'numero': jornada.numero,
                'fecha_inicio': jornada.fecha_inicio,
                'fecha_congelacion': alineacion.fecha_congelacion
            },
            'alineacion': {
                'tiene_posiciones_completas': alineacion.tiene_posiciones_completas,
                'posiciones_faltantes': alineacion.posiciones_faltantes,
                'puntos_obtenidos': alineacion.puntos_obtenidos,
                'dinero_ganado': alineacion.dinero_ganado,
                'jugadores_titulares': titulares_con_puntos
            }
        }

        return Response(response_data)

    except Jornada.DoesNotExist:
        return Response(
            {'error': 'Jornada no encontrada'},
            status=404
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=500
        )