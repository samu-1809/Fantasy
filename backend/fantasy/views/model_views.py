from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Sum, Case, When, IntegerField, F
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from ..models import Liga, Jugador, Equipo, Jornada, Partido, EquipoReal, Puntuacion
from ..serializers import (
    LigaSerializer, JugadorSerializer, EquipoSerializer, JornadaSerializer,
    PartidoSerializer, EquipoRealSerializer, PuntuacionSerializer
)

class LigaViewSet(viewsets.ModelViewSet):
    queryset = Liga.objects.all()
    serializer_class = LigaSerializer

class JugadorViewSet(viewsets.ModelViewSet):
    queryset = Jugador.objects.all()
    serializer_class = JugadorSerializer
    
    def get_queryset(self):
        queryset = Jugador.objects.all()
        posicion = self.request.query_params.get('posicion', None)
        equipo_id = self.request.query_params.get('equipo', None)
        
        if posicion:
            queryset = queryset.filter(posicion=posicion)
            
        if equipo_id:
            queryset = queryset.filter(equipo_id=equipo_id)
            
        return queryset

class EquipoViewSet(viewsets.ModelViewSet):
    queryset = Equipo.objects.all()
    serializer_class = EquipoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Equipo.objects.select_related('usuario', 'liga').prefetch_related('jugadores')
        
        if not self.request.user.is_staff and not self.request.user.is_superuser:
            print(f"🎯 Filtrando equipos para usuario: {self.request.user.username}")
            queryset = queryset.filter(usuario=self.request.user)
        else:
            usuario_id = self.request.query_params.get('usuario_id')
            usuario_param = self.request.query_params.get('usuario')
            
            if usuario_id:
                queryset = queryset.filter(usuario_id=usuario_id)
            elif usuario_param:
                queryset = queryset.filter(usuario_id=usuario_param)
        
        return queryset

class JornadaViewSet(viewsets.ModelViewSet):
    queryset = Jornada.objects.all()
    serializer_class = JornadaSerializer

    def get_queryset(self):
        """Optimiza queries con prefetch_related"""
        return Jornada.objects.prefetch_related('partidos')

    @action(detail=True, methods=['get'])
    def partidos(self, request, pk=None):
        """Endpoint para obtener partidos de una jornada específica"""
        try:
            jornada = self.get_object()
            partidos = jornada.partidos.select_related('equipo_local', 'equipo_visitante')
            serializer = PartidoSerializer(partidos, many=True)
            return Response(serializer.data)
        except Jornada.DoesNotExist:
            return Response(
                {"error": "Jornada no encontrada"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class PuntuacionViewSet(viewsets.ModelViewSet): 
    queryset = Puntuacion.objects.all()
    serializer_class = PuntuacionSerializer

    def get_queryset(self):
        return Puntuacion.objects.select_related('jugador', 'jornada')

    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'No autenticado'}, status=401)
        
        transacciones = TransaccionEconomica.objects.filter(usuario=request.user)
        transacciones_data = []
        
        for trans in transacciones:
            transacciones_data.append({
                'id': trans.id,
                'tipo': trans.tipo,
                'monto': trans.monto,
                'descripcion': trans.descripcion,
                'fecha': trans.fecha.isoformat(),
            })
        
        return JsonResponse({'transacciones': transacciones_data})

class PartidoViewSet(viewsets.ModelViewSet):
    queryset = Partido.objects.all()
    serializer_class = PartidoSerializer

    def get_queryset(self):
        return Partido.objects.select_related('equipo_local', 'equipo_visitante', 'jornada')

class EquipoRealViewSet(viewsets.ModelViewSet):
    queryset = EquipoReal.objects.all()
    serializer_class = EquipoRealSerializer

def plantilla_equipo_real(request, equipo_id):
    try:
        equipo = get_object_or_404(EquipoReal, id=equipo_id)
        jugadores = Jugador.objects.filter(equipo_real=equipo).select_related('equipo_real')
        
        # Serializar los datos
        jugadores_data = []
        for jugador in jugadores:
            jugadores_data.append({
                'id': jugador.id,
                'nombre': jugador.nombre,
                'posicion': jugador.posicion,
                'posicion_display': jugador.posicion_display,
                'valor': jugador.valor,
                'puntos_totales': jugador.puntos_totales,
                'en_venta': jugador.en_venta,
                'equipo_fantasy_nombre': jugador.equipo.nombre if jugador.equipo else None,
                'dorsal': getattr(jugador, 'dorsal', None),  # Si no existe dorsal, será None
            })
        
        return JsonResponse({
            'equipo': {
                'id': equipo.id,
                'nombre': equipo.nombre
            },
            'jugadores': jugadores_data
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

def clasificacion_equipos_reales(request):
    try:
        # Obtener todos los equipos reales
        equipos = EquipoReal.objects.all()
        clasificacion_data = []
        
        for equipo in equipos:
            # Partidos como local
            partidos_local = Partido.objects.filter(
                equipo_local=equipo,
                goles_local__isnull=False,
                goles_visitante__isnull=False
            )
            
            # Partidos como visitante
            partidos_visitante = Partido.objects.filter(
                equipo_visitante=equipo,
                goles_local__isnull=False,
                goles_visitante__isnull=False
            )
            
            # Calcular estadísticas
            partidos_jugados = partidos_local.count() + partidos_visitante.count()
            
            # Victorias como local
            victorias_local = partidos_local.filter(goles_local__gt=F('goles_visitante')).count()
            # Victorias como visitante
            victorias_visitante = partidos_visitante.filter(goles_visitante__gt=F('goles_local')).count()
            partidos_ganados = victorias_local + victorias_visitante
            
            # Empates como local
            empates_local = partidos_local.filter(goles_local=F('goles_visitante')).count()
            # Empates como visitante
            empates_visitante = partidos_visitante.filter(goles_visitante=F('goles_local')).count()
            partidos_empatados = empates_local + empates_visitante
            
            partidos_perdidos = partidos_jugados - partidos_ganados - partidos_empatados
            
            # Goles a favor
            goles_a_favor = sum([p.goles_local for p in partidos_local]) + sum([p.goles_visitante for p in partidos_visitante])
            
            # Goles en contra
            goles_en_contra = sum([p.goles_visitante for p in partidos_local]) + sum([p.goles_local for p in partidos_visitante])
            
            diferencia_goles = goles_a_favor - goles_en_contra
            
            # Puntos (3 por victoria, 1 por empate)
            puntos = (partidos_ganados * 3) + partidos_empatados
            
            clasificacion_data.append({
                'id': equipo.id,
                'equipo': {
                    'id': equipo.id,
                    'nombre': equipo.nombre
                },
                'puntos': puntos,
                'partidos_jugados': partidos_jugados,
                'partidos_ganados': partidos_ganados,
                'partidos_empatados': partidos_empatados,
                'partidos_perdidos': partidos_perdidos,
                'goles_a_favor': goles_a_favor,
                'goles_en_contra': goles_en_contra,
                'diferencia_goles': diferencia_goles
            })
        
        # Ordenar por puntos (descendente) y luego por diferencia de goles (descendente)
        clasificacion_ordenada = sorted(
            clasificacion_data, 
            key=lambda x: (x['puntos'], x['diferencia_goles']), 
            reverse=True
        )
        
        return JsonResponse(clasificacion_ordenada, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

def goleadores(request):
    try:
        # Obtener todos los jugadores con sus goles, ordenados por goles (descendente)
        jugadores = Jugador.objects.all().order_by('-goles')
        
        jugadores_data = []
        for jugador in jugadores:
            jugadores_data.append({
                'id': jugador.id,
                'nombre': jugador.nombre,
                'posicion': jugador.posicion,
                'posicion_display': jugador.posicion_display,
                'valor': jugador.valor,
                'puntos_totales': jugador.puntos_totales,
                'goles': jugador.goles,  # 🆕 Incluir goles
                'equipo_real_nombre': jugador.equipo_real.nombre if jugador.equipo_real else None,
                'equipo_fantasy_nombre': jugador.equipo.nombre if jugador.equipo else None,
            })
        
        return JsonResponse(jugadores_data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)