from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, LoginSerializer
from django.db.models import Prefetch
from django.utils import timezone

from django.db.models import Q
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, Alineacion
from .serializers import (
    LigaSerializer, JugadorSerializer, EquipoSerializer, AlineacionSerializer,
    JornadaSerializer, PuntuacionSerializer, EquipoRealSerializer, PartidoSerializer, FicharJugadorSerializer, VenderJugadorSerializer
)
import random

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        print("📥 Datos recibidos:", request.data)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        print(f"👤 Usuario creado: {user.username}")

        # Crear equipo para el nuevo usuario
        liga = Liga.objects.first()
        print(f"🏆 Liga encontrada: {liga}")
        
        equipo = None
        if liga:
            print("🎯 Creando equipo...")
            equipo = Equipo.objects.create(
                usuario=user,
                liga=liga,
                nombre=f"{user.username}",
                presupuesto=50000000
            )
            print(f"✅ Equipo creado: {equipo.nombre}")

            # ASIGNACIÓN AUTOMÁTICA DE JUGADORES INICIALES
            print("🔄 Asignando jugadores iniciales...")
            jugadores_disponibles = Jugador.objects.exclude(
                equipo__liga=liga
            ).order_by('?')

            print(f"🎯 Jugadores disponibles: {jugadores_disponibles.count()}")

            asignaciones = {
                'POR': 1,
                'DEF': 2,
                'DEL': 2
            }

            for posicion, cantidad in asignaciones.items():
                print(f"🎯 Buscando {cantidad} {posicion}...")
                jugadores = jugadores_disponibles.filter(posicion=posicion)[:cantidad]
                print(f"🎯 Encontrados: {jugadores.count()}")
                
                for jugador in jugadores:
                    if equipo.presupuesto >= jugador.valor:
                        print(f"➕ Fichando {jugador.nombre} ({jugador.posicion}) por {jugador.valor}")
                        jugador.equipo = equipo
                        jugador.en_banquillo = False
                        jugador.fecha_fichaje = timezone.now()
                        jugador.save()
                        equipo.presupuesto -= jugador.valor
                        print(f"💰 Presupuesto restante: {equipo.presupuesto}")

            equipo.save()
            print("✅ Jugadores asignados correctamente")
        else:
            print("❌ No se encontró ninguna liga")

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
            Prefetch('jugadores', queryset=Jugador.objects.select_related('equipo_real'))  # ← Mejorado
        )
    
    @action(detail=False, methods=['get'])
    def mi_equipo(self, request):
        """Obtener el equipo del usuario actual"""
        try:
            equipo = Equipo.objects.get(usuario=request.user)
            serializer = self.get_serializer(equipo)
            return Response(serializer.data)
        except Equipo.DoesNotExist:
            return Response(
                {'error': 'No tienes un equipo creado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def determinar_si_va_al_banquillo(self, equipo, jugador, en_banquillo_param):
        """
        Determina si un jugador debe ir al banquillo automáticamente
        """
        # Si el frontend ya especificó, usar ese valor
        if en_banquillo_param is not None:
            return en_banquillo_param
        
        # Si no, determinar automáticamente basado en espacios disponibles
        jugadores_en_campo = Jugador.objects.filter(equipo=equipo, en_banquillo=False)
        
        contar_posiciones = {
            'POR': jugadores_en_campo.filter(posicion='POR').count(),
            'DEF': jugadores_en_campo.filter(posicion='DEF').count(),
            'DEL': jugadores_en_campo.filter(posicion='DEL').count(),
        }
        
        limites = {'POR': 1, 'DEF': 2, 'DEL': 2}
        
        # Si hay espacio en su posición, va al campo (False)
        # Si no hay espacio, va al banquillo (True)
        return contar_posiciones[jugador.posicion] >= limites[jugador.posicion]

    def puede_vender_jugador(self, equipo, jugador):
        """
        Verifica si se puede vender un jugador sin dejar posiciones vacías
        """
        jugadores_en_campo = Jugador.objects.filter(equipo=equipo, en_banquillo=False)
        
        contar_posiciones = {
            'POR': jugadores_en_campo.filter(posicion='POR').count(),
            'DEF': jugadores_en_campo.filter(posicion='DEF').count(),
            'DEL': jugadores_en_campo.filter(posicion='DEL').count(),
        }
        
        limites = {'POR': 1, 'DEF': 2, 'DEL': 2}
        
        # Si al vender este jugador quedaría menos del mínimo requerido, no se puede vender
        return contar_posiciones[jugador.posicion] > limites[jugador.posicion]

    def actualizar_estadisticas_equipo(self, equipo):
        """
        Actualiza las estadísticas del equipo cuando se fichan/venden jugadores
        """
        jugadores_equipo = Jugador.objects.filter(equipo=equipo)
        
        equipo.puntos_totales = sum(j.puntos_totales for j in jugadores_equipo)
        equipo.valor_total = sum(j.valor for j in jugadores_equipo)
        
        equipo.save()

    @action(detail=True, methods=['post'])
    def fichar_jugador(self, request, pk=None):
        """Fichar un jugador al equipo"""
        equipo = self.get_object()
        serializer = FicharJugadorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        jugador_id = serializer.validated_data['jugador_id']
        en_banquillo_param = serializer.validated_data.get('en_banquillo')
        try:
            jugador = Jugador.objects.get(id=jugador_id, equipo__isnull=True)
        except Jugador.DoesNotExist:
            return Response(
                {'error': 'Jugador no disponible o no encontrado'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar presupuesto
        if equipo.presupuesto < jugador.valor:
            return Response(
                {'error': 'Presupuesto insuficiente'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determinar si va al banquillo
        en_banquillo = self.determinar_si_va_al_banquillo(equipo, jugador, en_banquillo_param)
        
        # Realizar el fichaje
        equipo.presupuesto -= jugador.valor
        jugador.equipo = equipo
        jugador.en_banquillo = en_banquillo
        jugador.fecha_fichaje = timezone.now()
        
        equipo.save()
        jugador.save()
        
        # Actualizar estadísticas del equipo
        self.actualizar_estadisticas_equipo(equipo)
        
        mensaje = f'{jugador.nombre} fichado para el {"banquillo" if en_banquillo else "campo"}'
        return Response({
            'message': mensaje, 
            'en_banquillo': en_banquillo,
            'nuevo_presupuesto': equipo.presupuesto
        })

    @action(detail=True, methods=['post'])
    def vender_jugador(self, request, pk=None):
        """Vender un jugador del equipo"""
        equipo = self.get_object()
        serializer = VenderJugadorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        jugador_id = serializer.validated_data['jugador_id']
        try:
            jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
        except Jugador.DoesNotExist:
            return Response(
                {'error': 'Jugador no encontrado en tu equipo'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que no se quede ninguna posición vacía
        if not self.puede_vender_jugador(equipo, jugador):
            posicion_display = {
                'POR': 'portero',
                'DEF': 'defensa', 
                'DEL': 'delantero'
            }
            return Response({
                'error': f'No puedes vender este {posicion_display[jugador.posicion]}, dejarías una posición vacía'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Realizar la venta (75% del valor)
        valor_venta = int(jugador.valor * 0.75)
        equipo.presupuesto += valor_venta
        
        # Liberar jugador
        jugador.equipo = None
        jugador.en_banquillo = True
        jugador.fecha_fichaje = None
        
        equipo.save()
        jugador.save()
        
        # Actualizar estadísticas
        self.actualizar_estadisticas_equipo(equipo)
        
        return Response({
            'message': f'Jugador vendido por {valor_venta}', 
            'valor_venta': valor_venta,
            'nuevo_presupuesto': equipo.presupuesto
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

        # Obtener IDs de jugadores fichados en una sola query
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

        # Prefetch jugadores y select_related usuario
        equipos = Equipo.objects.filter(
            liga=liga
        ).select_related('usuario').prefetch_related('jugadores')

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

    def get_queryset(self):
        """Optimiza queries con prefetch_related"""
        return Jornada.objects.prefetch_related('partidos')

    @action(detail=True, methods=['get'])
    def partidos(self, request, pk=None):
        """Endpoint para obtener partidos de una jornada específica"""
        jornada = self.get_object()
        partidos = jornada.partidos.select_related('equipo_local', 'equipo_visitante')
        serializer = PartidoSerializer(partidos, many=True)
        return Response(serializer.data)

class PartidoViewSet(viewsets.ModelViewSet):
    queryset = Partido.objects.all()
    serializer_class = PartidoSerializer

    def get_queryset(self):
        """Optimiza queries para partidos"""
        return Partido.objects.select_related('equipo_local', 'equipo_visitante', 'jornada')

class EquipoRealViewSet(viewsets.ModelViewSet):
    queryset = EquipoReal.objects.all()
    serializer_class = EquipoRealSerializer

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

class AlineacionViewSet(viewsets.ModelViewSet):
    queryset = Alineacion.objects.all()
    serializer_class = AlineacionSerializer
    
    @action(detail=True, methods=['post'])
    def asignar_titular(self, request, pk=None):
        alineacion = self.get_object()
        jugador_id = request.data.get('jugador_id')
        posicion = request.data.get('posicion')  # 'POR', 'DEF1', 'DEF2', 'DEL1', 'DEL2'
        
        try:
            jugador = Jugador.objects.get(id=jugador_id)
        except Jugador.DoesNotExist:
            return Response({'error': 'Jugador no encontrado'}, status=404)
        
        # Verificar que el jugador pertenece al equipo
        if jugador not in alineacion.equipo.jugadores.all():
            return Response({'error': 'El jugador no pertenece a tu equipo'}, status=400)
        
        # Verificar posición correcta
        if posicion == 'POR' and jugador.posicion != 'POR':
            return Response({'error': 'Solo puedes asignar porteros a la posición de portero'}, status=400)
        elif posicion in ['DEF1', 'DEF2'] and jugador.posicion != 'DEF':
            return Response({'error': 'Solo puedes asignar defensas a la posición de defensa'}, status=400)
        elif posicion in ['DEL1', 'DEL2'] and jugador.posicion != 'DEL':
            return Response({'error': 'Solo puedes asignar delanteros a la posición de delantero'}, status=400)
        
        # Asignar a la posición correspondiente
        if posicion == 'POR':
            alineacion.portero_titular = jugador
        elif posicion == 'DEF1':
            alineacion.defensa1_titular = jugador
        elif posicion == 'DEF2':
            alineacion.defensa2_titular = jugador
        elif posicion == 'DEL1':
            alineacion.delantero1_titular = jugador
        elif posicion == 'DEL2':
            alineacion.delantero2_titular = jugador
        
        alineacion.save()
        return Response({'message': 'Jugador asignado como titular'})
    @action(detail=True, methods=['post'])
    def cambiar_jugador(self, request, pk=None):
        alineacion = self.get_object()
        jugador_sale_id = request.data.get('jugador_sale_id')  # ID del jugador que sale
        jugador_entra_id = request.data.get('jugador_entra_id')  # ID del jugador que entra
        
        try:
            jugador_sale = Jugador.objects.get(id=jugador_sale_id)
            jugador_entra = Jugador.objects.get(id=jugador_entra_id)
        except Jugador.DoesNotExist:
            return Response({'error': 'Jugador no encontrado'}, status=404)
        
        # Verificar que ambos jugadores pertenecen al equipo
        if (jugador_sale not in alineacion.equipo.jugadores.all() or 
            jugador_entra not in alineacion.equipo.jugadores.all()):
            return Response({'error': 'Los jugadores deben pertenecer al equipo'}, status=400)
        
        # Verificar que son de la misma posición
        if jugador_sale.posicion != jugador_entra.posicion:
            return Response({'error': 'Solo puedes cambiar jugadores de la misma posición'}, status=400)
        
        # Buscar en qué posición está el jugador que sale
        posicion_sale = None
        if alineacion.portero_titular == jugador_sale:
            posicion_sale = 'POR'
        elif alineacion.defensa1_titular == jugador_sale:
            posicion_sale = 'DEF1'
        elif alineacion.defensa2_titular == jugador_sale:
            posicion_sale = 'DEF2'
        elif alineacion.delantero1_titular == jugador_sale:
            posicion_sale = 'DEL1'
        elif alineacion.delantero2_titular == jugador_sale:
            posicion_sale = 'DEL2'
        
        if not posicion_sale:
            return Response({'error': 'El jugador no está en la alineación titular'}, status=400)
        
        # Verificar que el jugador que entra está en el banquillo
        if jugador_entra not in alineacion.banquillo.all():
            return Response({'error': 'El jugador que entra debe estar en el banquillo'}, status=400)
        
        # Realizar el cambio
        if posicion_sale == 'POR':
            alineacion.portero_titular = jugador_entra
        elif posicion_sale == 'DEF1':
            alineacion.defensa1_titular = jugador_entra
        elif posicion_sale == 'DEF2':
            alineacion.defensa2_titular = jugador_entra
        elif posicion_sale == 'DEL1':
            alineacion.delantero1_titular = jugador_entra
        elif posicion_sale == 'DEL2':
            alineacion.delantero2_titular = jugador_entra
        
        # Mover el jugador que sale al banquillo y quitar el que entra
        alineacion.banquillo.remove(jugador_entra)
        alineacion.banquillo.add(jugador_sale)
        
        alineacion.save()
        
        return Response({
            'message': f'Cambio realizado: {jugador_sale.nombre} ↔ {jugador_entra.nombre}',
            'alineacion': AlineacionSerializer(alineacion).data
        })
    @action(detail=True, methods=['post'])
    def quitar_titular(self, request, pk=None):
        alineacion = self.get_object()
        posicion = request.data.get('posicion')
        
        if posicion == 'POR':
            alineacion.portero_titular = None
        elif posicion == 'DEF1':
            alineacion.defensa1_titular = None
        elif posicion == 'DEF2':
            alineacion.defensa2_titular = None
        elif posicion == 'DEL1':
            alineacion.delantero1_titular = None
        elif posicion == 'DEL2':
            alineacion.delantero2_titular = None
        
        alineacion.save()
        return Response({'message': 'Jugador quitado de la alineación titular'})