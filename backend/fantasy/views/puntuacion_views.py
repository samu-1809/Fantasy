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
def alineacion_congelada_detalle(request, equipo_id, jornada_id):
    """Obtiene la alineación congelada de un equipo en una jornada específica"""
    try:
        # Verificar que el usuario es dueño del equipo o es admin
        equipo = Equipo.objects.get(id=equipo_id)
        if equipo.usuario != request.user and not request.user.is_staff:
            return Response(
                {"error": "No tienes permiso para ver esta alineación"},
                status=403
            )
            
        alineacion = AlineacionCongelada.objects.get(
            equipo_id=equipo_id,
            jornada_id=jornada_id
        )
        
        # Serializer para AlineacionCongelada
        from .serializers import AlineacionCongeladaSerializer
        serializer = AlineacionCongeladaSerializer(alineacion)
        return Response(serializer.data)
        
    except Equipo.DoesNotExist:
        return Response(
            {"error": "Equipo no encontrado"},
            status=404
        )
    except AlineacionCongelada.DoesNotExist:
        return Response(
            {"error": "Alineación congelada no encontrada"},
            status=404
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def forzar_congelacion(request):
    """Fuerza la congelación de la alineación actual (para testing)"""
    equipo_id = request.data.get('equipo_id')
    jornada_id = request.data.get('jornada_id')
    
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        jornada = Jornada.objects.get(id=jornada_id)
        
        # Obtener jugadores titulares actuales
        jugadores_titulares = equipo.jugadores.filter(en_banquillo=False)
        
        # Verificar formación mínima
        por_count = jugadores_titulares.filter(posicion='POR').count()
        def_count = jugadores_titulares.filter(posicion='DEF').count()
        del_count = jugadores_titulares.filter(posicion='DEL').count()
        
        tiene_posiciones_completas = (por_count >= 1 and def_count >= 2 and del_count >= 2)
        posiciones_faltantes = []
        
        if por_count < 1:
            posiciones_faltantes.append('POR')
        if def_count < 2:
            posiciones_faltantes.append('DEF')
        if del_count < 2:
            posiciones_faltantes.append('DEL')
        
        # Crear o actualizar alineación congelada
        alineacion, created = AlineacionCongelada.objects.get_or_create(
            equipo=equipo,
            jornada=jornada,
            defaults={
                'tiene_posiciones_completas': tiene_posiciones_completas,
                'posiciones_faltantes': posiciones_faltantes
            }
        )
        
        # Actualizar jugadores
        alineacion.jugadores_titulares.set(jugadores_titulares)
        
        # Calcular puntos si ya hay puntuaciones
        puntos_totales = 0
        for jugador in jugadores_titulares:
            try:
                puntuacion = Puntuacion.objects.get(jugador=jugador, jornada=jornada)
                puntos_totales += puntuacion.puntos
            except Puntuacion.DoesNotExist:
                pass
        
        alineacion.puntos_obtenidos = puntos_totales
        alineacion.dinero_ganado = puntos_totales * 100000
        alineacion.save()
        
        from .serializers import AlineacionCongeladaSerializer
        serializer = AlineacionCongeladaSerializer(alineacion)
        
        return Response({
            'message': 'Alineación congelada forzada correctamente',
            'alineacion': serializer.data,
            'created': created
        })
        
    except Equipo.DoesNotExist:
        return Response(
            {"error": "Equipo no encontrado o no pertenece al usuario"},
            status=404
        )
    except Jornada.DoesNotExist:
        return Response(
            {"error": "Jornada no encontrada"},
            status=404
        )