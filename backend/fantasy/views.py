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
        if liga:
            Equipo.objects.create(
                usuario=user,
                liga=liga,
                nombre=f"Equipo de {user.username}",
                presupuesto=liga.presupuesto_inicial
            )
        
        # Generar tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            },
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)

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
        
        # Obtener jugadores que NO están en ningún equipo de esta liga
        jugadores_fichados = Jugador.objects.filter(
            equipo__liga=liga
        ).values_list('id', flat=True)
        
        jugadores_disponibles = Jugador.objects.exclude(
            id__in=jugadores_fichados
        )
        
        # Seleccionar 8 aleatorios (o menos si no hay suficientes)
        count = min(8, jugadores_disponibles.count())
        jugadores_mercado = random.sample(list(jugadores_disponibles), count)
        
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
        
        # Obtener equipos de la liga ordenados por puntos totales
        equipos = Equipo.objects.filter(liga=liga)
        
        clasificacion = []
        for equipo in equipos:
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

class PuntuacionViewSet(viewsets.ModelViewSet):
    queryset = Puntuacion.objects.all()
    serializer_class = PuntuacionSerializer
    
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
                
                # Crear o actualizar puntuación
                puntuacion, created = Puntuacion.objects.update_or_create(
                    jugador=jugador,
                    jornada=jornada,
                    defaults={'puntos': puntos}
                )
                
                # Actualizar puntos totales y valor del jugador
                jugador.puntos_totales += puntos
                jugador.valor += (puntos * 100000)  # €0.1M por punto
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