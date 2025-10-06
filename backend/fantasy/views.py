from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, LoginSerializer

from django.db.models import Q
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion
from .serializers import (
    LigaSerializer, JugadorSerializer, EquipoSerializer, 
    JornadaSerializer, PuntuacionSerializer
)
import random

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Crear equipo para el nuevo usuario
        liga = Liga.objects.first()  # Asignar a la primera liga por defecto
        equipo = None
        if liga:
            equipo = Equipo.objects.create(
                usuario=user,
                liga=liga,
                nombre=f"Equipo de {user.username}",
                presupuesto=liga.presupuesto_inicial
            )

            # 🆕 ASIGNACIÓN AUTOMÁTICA DE 7 JUGADORES INICIALES
            # Reglas: 1 POR, 2 DEF, 2 MED, 2 DEL
            jugadores_disponibles = Jugador.objects.exclude(
                equipo__liga=liga
            ).order_by('?')  # Aleatorio

            asignaciones = {
                'POR': 1,
                'DEF': 2,
                'MED': 2,
                'DEL': 2
            }

            for posicion, cantidad in asignaciones.items():
                jugadores = jugadores_disponibles.filter(posicion=posicion)[:cantidad]
                for jugador in jugadores:
                    if equipo.presupuesto >= jugador.valor:
                        equipo.jugadores.add(jugador)
                        equipo.presupuesto -= jugador.valor

            equipo.save()

        # 🆕 Generar tokens con httpOnly cookie
        refresh = RefreshToken.for_user(user)

        response = Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            },
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

        # Guardar refresh token en httpOnly cookie
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=False,  # True en producción
            samesite='Lax',
            max_age=7*24*60*60  # 7 días
        )

        return response

# Vista de Login
class LoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            refresh = RefreshToken.for_user(user)
            
            # Obtener equipo del usuario
            try:
                equipo = Equipo.objects.get(usuario=user)
                equipo_data = EquipoSerializer(equipo).data
            except Equipo.DoesNotExist:
                equipo_data = None
            
            return Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'is_staff': user.is_staff
                },
                'equipo': equipo_data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            })
        
        return Response(
            {'error': 'Credenciales inválidas'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

# Vista para obtener usuario actual
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user
    try:
        equipo = Equipo.objects.get(usuario=user)
        equipo_data = EquipoSerializer(equipo).data
    except Equipo.DoesNotExist:
        equipo_data = None
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'equipo': equipo_data
    })

class LigaViewSet(viewsets.ModelViewSet):
    queryset = Liga.objects.all()
    serializer_class = LigaSerializer

class JugadorViewSet(viewsets.ModelViewSet):
    queryset = Jugador.objects.all()
    serializer_class = JugadorSerializer
    
    def get_queryset(self):
        queryset = Jugador.objects.all()
        posicion = self.request.query_params.get('posicion', None)
        if posicion:
            queryset = queryset.filter(posicion=posicion)
        return queryset

class EquipoViewSet(viewsets.ModelViewSet):
    queryset = Equipo.objects.all()
    serializer_class = EquipoSerializer

    def get_queryset(self):
        """Optimiza queries con select_related y prefetch_related"""
        return Equipo.objects.select_related(
            'usuario',
            'liga'
        ).prefetch_related(
            'jugadores'
        )
    
    @action(detail=True, methods=['post'])
    def fichar_jugador(self, request, pk=None):
        """Fichar un jugador al equipo"""
        equipo = self.get_object()
        jugador_id = request.data.get('jugador_id')
        
        try:
            jugador = Jugador.objects.get(id=jugador_id)
        except Jugador.DoesNotExist:
            return Response(
                {'error': 'Jugador no encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que el jugador no esté en otro equipo de la misma liga
        if Equipo.objects.filter(liga=equipo.liga, jugadores=jugador).exists():
            return Response(
                {'error': 'El jugador ya está fichado en otro equipo'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar presupuesto
        if equipo.presupuesto < jugador.valor:
            return Response(
                {'error': 'Presupuesto insuficiente'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fichar jugador
        equipo.jugadores.add(jugador)
        equipo.presupuesto -= jugador.valor
        equipo.save()
        
        return Response({
            'message': 'Jugador fichado exitosamente',
            'equipo': EquipoSerializer(equipo).data
        })
    
    @action(detail=True, methods=['post'])
    def vender_jugador(self, request, pk=None):
        """Vender un jugador del equipo"""
        equipo = self.get_object()
        jugador_id = request.data.get('jugador_id')

        try:
            jugador = Jugador.objects.get(id=jugador_id)
        except Jugador.DoesNotExist:
            return Response(
                {'error': 'Jugador no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar que el jugador esté en el equipo
        if jugador not in equipo.jugadores.all():
            return Response(
                {'error': 'El jugador no está en tu equipo'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 🆕 VALIDACIONES DE PLANTILLA
        # Contar jugadores por posición (excluyendo el que vamos a vender)
        jugadores_actuales = equipo.jugadores.exclude(id=jugador_id)
        count_por_posicion = {
            'POR': jugadores_actuales.filter(posicion='POR').count(),
            'DEF': jugadores_actuales.filter(posicion='DEF').count(),
            'MED': jugadores_actuales.filter(posicion='MED').count(),
            'DEL': jugadores_actuales.filter(posicion='DEL').count(),
        }

        # Validar mínimos requeridos
        minimos = {'POR': 1, 'DEF': 2, 'MED': 2, 'DEL': 2}
        if count_por_posicion[jugador.posicion] < minimos[jugador.posicion]:
            return Response(
                {'error': f'No puedes vender este {jugador.posicion}. Mínimo requerido: {minimos[jugador.posicion]}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vender jugador
        equipo.jugadores.remove(jugador)
        equipo.presupuesto += jugador.valor
        equipo.save()

        return Response({
            'message': 'Jugador vendido exitosamente',
            'equipo': EquipoSerializer(equipo).data
        })

class MercadoViewSet(viewsets.ViewSet):
    """
    Endpoint para obtener jugadores disponibles en el mercado
    """
    def list(self, request):
        liga_id = request.query_params.get('liga_id')

        if not liga_id:
            return Response(
                {'error': 'Se requiere liga_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            liga = Liga.objects.get(id=liga_id)
        except Liga.DoesNotExist:
            return Response(
                {'error': 'Liga no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 🆕 OPTIMIZADO: Obtener IDs de jugadores fichados en una sola query
        jugadores_fichados_ids = Equipo.objects.filter(
            liga=liga
        ).values_list('jugadores', flat=True).distinct()

        # Jugadores disponibles (no fichados en esta liga)
        jugadores_disponibles = Jugador.objects.exclude(
            id__in=jugadores_fichados_ids
        )

        # Seleccionar 8 aleatorios (o menos si no hay suficientes)
        count = min(8, jugadores_disponibles.count())
        if count > 0:
            jugadores_mercado = random.sample(list(jugadores_disponibles), count)
        else:
            jugadores_mercado = []

        serializer = JugadorSerializer(jugadores_mercado, many=True)
        return Response(serializer.data)

class ClasificacionViewSet(viewsets.ViewSet):
    """
    Endpoint para obtener la clasificación de una liga
    """
    def list(self, request):
        liga_id = request.query_params.get('liga_id')

        if not liga_id:
            return Response(
                {'error': 'Se requiere liga_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            liga = Liga.objects.get(id=liga_id)
        except Liga.DoesNotExist:
            return Response(
                {'error': 'Liga no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 🆕 OPTIMIZADO: Prefetch jugadores y select_related usuario
        # Esto reduce las queries de 1 + N*2 a solo 2-3 queries totales
        equipos = Equipo.objects.filter(
            liga=liga
        ).select_related('usuario').prefetch_related('jugadores')

        clasificacion = []
        for equipo in equipos:
            # Los jugadores ya están en memoria, sin query adicional
            puntos_totales = sum(j.puntos_totales for j in equipo.jugadores.all())
            clasificacion.append({
                'equipo_id': equipo.id,
                'nombre': equipo.nombre,
                'usuario': equipo.usuario.username,
                'puntos_totales': puntos_totales,
                'presupuesto': equipo.presupuesto
            })

        # Ordenar por puntos (descendente)
        clasificacion.sort(key=lambda x: x['puntos_totales'], reverse=True)

        # Añadir posición
        for idx, item in enumerate(clasificacion, 1):
            item['posicion'] = idx

        return Response(clasificacion)

class JornadaViewSet(viewsets.ModelViewSet):
    queryset = Jornada.objects.all()
    serializer_class = JornadaSerializer

    def get_queryset(self):
        """Optimiza queries con select_related"""
        return Jornada.objects.select_related('liga')

class PuntuacionViewSet(viewsets.ModelViewSet):
    queryset = Puntuacion.objects.all()
    serializer_class = PuntuacionSerializer

    def get_queryset(self):
        """Optimiza queries con select_related"""
        return Puntuacion.objects.select_related('jugador', 'jornada')
    
    @action(detail=False, methods=['post'])
    def asignar_puntos(self, request):
        """
        Asignar puntos a jugadores y actualizar valores
        Formato: {'jornada_id': 1, 'puntos': [{'jugador_id': 1, 'puntos': 8}, ...]}
        """
        jornada_id = request.data.get('jornada_id')
        puntos_data = request.data.get('puntos', [])
        
        try:
            jornada = Jornada.objects.get(id=jornada_id)
        except Jornada.DoesNotExist:
            return Response(
                {'error': 'Jornada no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        resultados = []
        for item in puntos_data:
            jugador_id = item.get('jugador_id')
            puntos = item.get('puntos')
            
            try:
                jugador = Jugador.objects.get(id=jugador_id)
                
                # 🆕 FIX: Obtener puntos anteriores ANTES de update_or_create
                try:
                    puntuacion_anterior = Puntuacion.objects.get(jugador=jugador, jornada=jornada)
                    puntos_anteriores = puntuacion_anterior.puntos
                    es_actualizacion = True
                except Puntuacion.DoesNotExist:
                    puntos_anteriores = 0
                    es_actualizacion = False

                # Crear o actualizar puntuación
                puntuacion, created = Puntuacion.objects.update_or_create(
                    jugador=jugador,
                    jornada=jornada,
                    defaults={'puntos': puntos}
                )

                # Actualizar puntos totales y valor del jugador
                if es_actualizacion:
                    delta = puntos - puntos_anteriores
                    jugador.puntos_totales += delta
                    jugador.valor += (delta * 100000)
                else:
                    jugador.puntos_totales += puntos
                    jugador.valor += (puntos * 100000)

                jugador.save()
                
                resultados.append({
                    'jugador': jugador.nombre,
                    'puntos': puntos,
                    'nuevo_valor': jugador.valor,
                    'puntos_totales': jugador.puntos_totales
                })
                
            except Jugador.DoesNotExist:
                resultados.append({
                    'jugador_id': jugador_id,
                    'error': 'Jugador no encontrado'
                })
        
        return Response({
            'message': 'Puntos asignados exitosamente',
            'resultados': resultados
        })