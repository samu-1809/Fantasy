from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import RegisterSerializer, LoginSerializer
from django.db.models import Prefetch
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Q
import random
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, Alineacion
from .serializers import (
    LigaSerializer, JugadorSerializer, EquipoSerializer, AlineacionSerializer,
    JornadaSerializer, PuntuacionSerializer, EquipoRealSerializer, PartidoSerializer, FicharJugadorSerializer, VenderJugadorSerializer
)

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
                nombre=f"Equipo de {user.username}",
                presupuesto=150000000  # 150M inicial
            )
            print(f"✅ Equipo creado: {equipo.nombre}")

            # ASIGNACIÓN ALEATORIA - GARANTIZAR 1-3-3
            print("🔄 Asignando jugadores aleatorios (1 POR, 3 DEF, 3 DEL)...")
            
            presupuesto_maximo = 100000000  # 100M para jugadores
            presupuesto_actual = presupuesto_maximo
            jugadores_asignados = []
            
            # DEBUG: Contar disponibles
            for pos in ['POR', 'DEF', 'DEL']:
                count = Jugador.objects.filter(equipo__isnull=True, posicion=pos).count()
                print(f"🎯 {pos} disponibles: {count}")

            # 1. PORTERO - aleatorio que quepa en el presupuesto
            porteros = Jugador.objects.filter(
                equipo__isnull=True, 
                posicion='POR',
                valor__lte=presupuesto_actual  # Que quepa en el presupuesto
            ).order_by('?')  # ✅ ALEATORIO
            
            portero = porteros.first() if porteros.exists() else None
            
            if portero:
                jugadores_asignados.append(portero)
                presupuesto_actual -= portero.valor
                print(f"✅ PORTERO: {portero.nombre} - €{portero.valor:,}")
                print(f"💰 Presupuesto restante: €{presupuesto_actual:,}")
            else:
                print("❌ No hay porteros disponibles que quepan en el presupuesto")
                equipo.delete()
                return Response({"error": "No hay porteros disponibles"}, status=400)

            # 2. DEFENSAS - 3 aleatorias que quepan en el presupuesto
            defensas = Jugador.objects.filter(
                equipo__isnull=True, 
                posicion='DEF',
                valor__lte=presupuesto_actual  # Que quepan en el presupuesto
            ).order_by('?')[:3]  # ✅ ALEATORIO
            
            if len(defensas) == 3:
                for defensa in defensas:
                    jugadores_asignados.append(defensa)
                    presupuesto_actual -= defensa.valor
                print(f"✅ 3 DEFENSAS: €{sum(d.valor for d in defensas):,}")
                print(f"💰 Presupuesto restante: €{presupuesto_actual:,}")
            else:
                print(f"❌ Solo {len(defensas)} defensas disponibles (necesarias 3)")
                equipo.delete()
                return Response({"error": f"Solo {len(defensas)} defensas disponibles"}, status=400)

            # 3. DELANTEROS - 3 aleatorios que quepan en el presupuesto
            delanteros = Jugador.objects.filter(
                equipo__isnull=True, 
                posicion='DEL',
                valor__lte=presupuesto_actual  # Que quepan en el presupuesto
            ).order_by('?')[:3]  # ✅ ALEATORIO
            
            if len(delanteros) == 3:
                for delantero in delanteros:
                    jugadores_asignados.append(delantero)
                    presupuesto_actual -= delantero.valor
                print(f"✅ 3 DELANTEROS: €{sum(d.valor for d in delanteros):,}")
                print(f"💰 Presupuesto restante: €{presupuesto_actual:,}")
            else:
                print(f"❌ Solo {len(delanteros)} delanteros disponibles (necesarios 3)")
                equipo.delete()
                return Response({"error": f"Solo {len(delanteros)} delanteros disponibles"}, status=400)

            # VERIFICAR ASIGNACIÓN COMPLETA
            if len(jugadores_asignados) == 7:
                costo_total = sum(j.valor for j in jugadores_asignados)
                
                # 🆕 CORREGIDO: ASIGNAR EQUIPO A CADA JUGADOR
                for jugador in jugadores_asignados:
                    jugador.equipo = equipo  # 🎯 ESTA LÍNEA ES CLAVE
                    jugador.en_banquillo = True  # Todos al banquillo inicialmente
                    jugador.save()
                
                equipo.presupuesto = 150000000 - costo_total
                equipo.save()
                
                print(f"🎉 EQUIPO COMPLETO: 7 jugadores - €{costo_total:,}")
                print(f"💰 Presupuesto final: €{equipo.presupuesto:,}")
                
                # Mostrar resumen del equipo
                print("\n📊 RESUMEN DEL EQUIPO:")
                for jugador in jugadores_asignados:
                    print(f"   • {jugador.posicion}: {jugador.nombre} - €{jugador.valor:,} - Equipo: {jugador.equipo}")
                
                # Serializar respuesta - 🆕 CARGAR JUGADORES ACTUALIZADOS
                equipo.refresh_from_db()  # Recargar datos actualizados
                equipo_serializer = EquipoSerializer(equipo)
                
            else:
                print(f"❌ Asignación incompleta: {len(jugadores_asignados)}/7 jugadores")
                equipo.delete()
                return Response({"error": "Asignación incompleta de jugadores"}, status=400)

        else:
            print("❌ No se encontró liga")
            return Response({"error": "No se encontró liga"}, status=400)

        # Generar tokens
        refresh = RefreshToken.for_user(user)

        response_data = {
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            },
            'access': str(refresh.access_token),
            'equipo_creado': True,
            'jugadores_asignados': len(jugadores_asignados),
            'presupuesto_restante': equipo.presupuesto,
            'costo_equipo': costo_total,
            'equipo': equipo_serializer.data
        }

        response = Response(response_data, status=status.HTTP_201_CREATED)

        # Cookie
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=7*24*60*60
        )

        return response

class LoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        print(f"🔐 Login attempt: {username}")
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            refresh = RefreshToken.for_user(user)
            
            # Obtener equipo del usuario
            try:
                equipo = Equipo.objects.get(usuario=user)
                equipo_data = EquipoSerializer(equipo).data
                print(f"✅ Equipo encontrado: {equipo.nombre}")
            except Equipo.DoesNotExist:
                equipo_data = None
                print("❌ No se encontró equipo")
            
            # 🎯 VERIFICAR QUÉ SE ESTÁ ENVIANDO
            response_data = {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser
                },
                'equipo': equipo_data,
                'access': str(refresh.access_token),
            }
            
            print(f"📤 Enviando respuesta: {response_data}")
            
            return Response(response_data)
        
        print("❌ Autenticación fallida")
        return Response(
            {'error': 'Credenciales inválidas'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mi_equipo(request):
    try:
        equipo = Equipo.objects.get(usuario=request.user)
        serializer = EquipoSerializer(equipo)
        return Response(serializer.data)
    except Equipo.DoesNotExist:
        return Response(
            {"error": "No se encontró equipo para este usuario"}, 
            status=status.HTTP_404_NOT_FOUND
        )
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
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'equipo': equipo_data
    })
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def datos_iniciales(request):
    """
    Endpoint único para cargar todos los datos iniciales del usuario
    """
    try:
        # 1. Obtener equipo del usuario
        equipo = Equipo.objects.filter(usuario=request.user).first()
        if not equipo:
            return Response(
                {"error": "No se encontró equipo para este usuario"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 2. Serializar datos
        equipo_data = EquipoSerializer(equipo).data
        
        # 3. Obtener jugadores del equipo
        jugadores = Jugador.objects.filter(equipo=equipo)
        jugadores_data = JugadorSerializer(jugadores, many=True).data
        
        # 4. Obtener mercado
        mercado_jugadores = []
        try:
            # Simular lógica del mercado
            mercado_jugadores = Jugador.objects.filter(
                equipo__isnull=True
            ).order_by('?')[:8]
            mercado_data = JugadorSerializer(mercado_jugadores, many=True).data
        except Exception as e:
            print(f"❌ Error cargando mercado: {e}")
            mercado_data = []
        
        # 5. Obtener clasificación
        clasificacion_data = []
        try:
            equipos_liga = Equipo.objects.filter(liga=equipo.liga)
            clasificacion = []
            for eq in equipos_liga:
                puntos_totales = sum(j.puntos_totales for j in eq.jugadores.all())
                clasificacion.append({
                    'equipo_id': eq.id,
                    'nombre': eq.nombre,
                    'usuario': eq.usuario.username,
                    'puntos_totales': puntos_totales,
                    'presupuesto': eq.presupuesto
                })
            clasificacion.sort(key=lambda x: x['puntos_totales'], reverse=True)
            for idx, item in enumerate(clasificacion, 1):
                item['posicion'] = idx
            clasificacion_data = clasificacion
        except Exception as e:
            print(f"❌ Error cargando clasificación: {e}")
            clasificacion_data = []
        
        return Response({
            'equipo': equipo_data,
            'jugadores': jugadores_data,
            'mercado': mercado_data,
            'clasificacion': clasificacion_data,
            'liga_id': equipo.liga.id
        })
        
    except Exception as e:
        print(f"❌ Error en datos_iniciales: {e}")
        return Response(
            {"error": "Error al cargar datos iniciales: " + str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
        equipo_id = self.request.query_params.get('equipo', None)  # 🆕 NUEVO FILTRO
        
        if posicion:
            queryset = queryset.filter(posicion=posicion)
            
        if equipo_id:  # 🆕 FILTRAR POR EQUIPO
            queryset = queryset.filter(equipo_id=equipo_id)
            
        return queryset

class EquipoViewSet(viewsets.ModelViewSet):
    queryset = Equipo.objects.all()
    serializer_class = EquipoSerializer
    permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        """Optimiza queries y filtra por usuario si se especifica"""
        queryset = Equipo.objects.select_related(
            'usuario',
            'liga'
        ).prefetch_related(
            Prefetch('jugadores', queryset=Jugador.objects.all())
        )
        
        # 🆕 FILTRADO POR USUARIO ACTUAL SI NO ES ADMIN
        if not self.request.user.is_staff and not self.request.user.is_superuser:
            print(f"🎯 Filtrando equipos para usuario: {self.request.user.username}")
            queryset = queryset.filter(usuario=self.request.user)
        else:
            # Para admin, permitir filtrado manual
            usuario_id = self.request.query_params.get('usuario_id')
            usuario_param = self.request.query_params.get('usuario')
            
            if usuario_id:
                queryset = queryset.filter(usuario_id=usuario_id)
            elif usuario_param:
                queryset = queryset.filter(usuario_id=usuario_param)
        
        return queryset

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
    def actualizar_estados_banquillo(self, request, pk=None):
        """Actualizar estados en_banquillo de múltiples jugadores"""
        equipo = self.get_object()
        estados = request.data.get('estados', [])
        
        print(f"🔄 Actualizando estados de banquillo para equipo {equipo.nombre}")
        print(f"📊 Estados recibidos: {len(estados)} jugadores")
        
        cambios_realizados = 0
        errores = 0
        
        for estado_data in estados:
            try:
                jugador_id = estado_data.get('jugador_id')
                en_banquillo = estado_data.get('en_banquillo')
                
                jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
                
                # Solo actualizar si hay cambio
                if jugador.en_banquillo != en_banquillo:
                    jugador.en_banquillo = en_banquillo
                    jugador.save()
                    cambios_realizados += 1
                    print(f"   ✅ {jugador.nombre}: en_banquillo = {en_banquillo}")
                else:
                    print(f"   ℹ️ {jugador.nombre}: sin cambios")
                    
            except Jugador.DoesNotExist:
                print(f"   ❌ Jugador {jugador_id} no encontrado en el equipo")
                errores += 1
            except Exception as e:
                print(f"   ❌ Error con jugador {jugador_id}: {e}")
                errores += 1
        
        return Response({
            'message': f'Estados actualizados: {cambios_realizados} cambios, {errores} errores',
            'cambios_realizados': cambios_realizados,
            'errores': errores
        })
    @action(detail=True, methods=['post'])
    def fichar_jugador(self, request, pk=None):
        """Fichar un jugador al equipo - SIEMPRE al banquillo"""
        print("📥 Datos recibidos en fichar_jugador:", request.data)
        equipo = self.get_object()
        serializer = FicharJugadorSerializer(data=request.data)
        if not serializer.is_valid():
            print("❌ Errores del serializer:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        jugador_id = serializer.validated_data['jugador_id']
        
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
        
        # SIEMPRE va al banquillo
        en_banquillo = True
        
        # Realizar el fichaje
        equipo.presupuesto -= jugador.valor
        jugador.equipo = equipo
        jugador.en_banquillo = en_banquillo
        jugador.fecha_fichaje = timezone.now()
        
        # Si el jugador estaba en venta, quitarlo del mercado
        if jugador.en_venta:
            jugador.en_venta = False
        
        equipo.save()
        jugador.save()
        
        # Actualizar estadísticas del equipo
        self.actualizar_estadisticas_equipo(equipo)
        
        mensaje = f'{jugador.nombre} fichado para el banquillo'
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
        jugador.en_venta = False  # Quitar de venta si estaba en venta
        
        equipo.save()
        jugador.save()
        
        # Actualizar estadísticas
        self.actualizar_estadisticas_equipo(equipo)
        
        return Response({
            'message': f'Jugador vendido por {valor_venta}', 
            'valor_venta': valor_venta,
            'nuevo_presupuesto': equipo.presupuesto
        })

    @action(detail=True, methods=['post'])
    def poner_en_venta(self, request, pk=None):
        """Poner un jugador del equipo en venta"""
        equipo = self.get_object()
        jugador_id = request.data.get('jugador_id')
        
        try:
            jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
        except Jugador.DoesNotExist:
            return Response(
                {'error': 'Jugador no encontrado en tu equipo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Poner en venta
        jugador.en_venta = True
        jugador.save()
        
        return Response({
            'message': f'{jugador.nombre} puesto en venta',
            'jugador': JugadorSerializer(jugador).data
        })

    @action(detail=True, methods=['post'])
    def quitar_de_venta(self, request, pk=None):
        """Quitar un jugador de la venta"""
        equipo = self.get_object()
        jugador_id = request.data.get('jugador_id')
        
        try:
            jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
        except Jugador.DoesNotExist:
            return Response(
                {'error': 'Jugador no encontrado en tu equipo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Quitar de venta
        jugador.en_venta = False
        jugador.save()
        
        return Response({
            'message': f'{jugador.nombre} quitado de venta',
            'jugador': JugadorSerializer(jugador).data
        })

    @action(detail=True, methods=['post'])
    def intercambiar_jugadores(self, request, pk=None):
        """Intercambiar dos jugadores del equipo (misma posición)"""
        equipo = self.get_object()
        jugador_origen_id = request.data.get('jugador_origen_id')
        jugador_destino_id = request.data.get('jugador_destino_id')
        
        print(f"🔍 Intercambiando jugadores: {jugador_origen_id} ↔ {jugador_destino_id}")
        
        # Validación básica
        if not jugador_origen_id or not jugador_destino_id:
            return Response({'error': 'Se requieren ambos IDs de jugadores'}, status=400)
        
        try:
            # Buscar por la ForeignKey (related_name='jugadores')
            jugador_origen = equipo.jugadores.get(id=jugador_origen_id)
            jugador_destino = equipo.jugadores.get(id=jugador_destino_id)
            print(f"✅ Jugadores encontrados: {jugador_origen.nombre} ↔ {jugador_destino.nombre}")
        except Jugador.DoesNotExist:
            print("❌ Jugador no encontrado en el equipo")
            return Response({'error': 'Jugador no encontrado en tu equipo'}, status=404)
        
        # Verificar misma posición
        if jugador_origen.posicion != jugador_destino.posicion:
            error_msg = f'Solo puedes intercambiar jugadores de la misma posición: {jugador_origen.posicion} != {jugador_destino.posicion}'
            print(f"❌ {error_msg}")
            return Response({'error': error_msg}, status=400)
        
        # Intercambiar sus estados de banquillo
        origen_banquillo = jugador_origen.en_banquillo
        destino_banquillo = jugador_destino.en_banquillo
        
        print(f"🔄 Intercambiando banquillo: {origen_banquillo} ↔ {destino_banquillo}")
        
        jugador_origen.en_banquillo = destino_banquillo
        jugador_destino.en_banquillo = origen_banquillo
        
        jugador_origen.save()
        jugador_destino.save()
        
        print("✅ Intercambio completado")
        
        return Response({
            'message': f'Intercambio realizado: {jugador_origen.nombre} ↔ {jugador_destino.nombre}',
            'origen_en_banquillo': jugador_origen.en_banquillo,
            'destino_en_banquillo': jugador_destino.en_banquillo
        })

class MercadoViewSet(viewsets.ViewSet):
    """
    Endpoint para obtener jugadores disponibles en el mercado:
    - 8 jugadores libres rotatorios cada 24h
    - Jugadores en venta de usuarios (ilimitados)
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

        # GESTIÓN DEL MERCADO ROTATORIO (solo para jugadores libres)
        self.actualizar_mercado_libre()

        ahora = timezone.now()
        limite_expiracion = ahora - timedelta(hours=24)
        
        # 🆕 OBTENER DOS TIPOS DE JUGADORES:
        
        # 1. JUGADORES LIBRES ROTATORIOS (máximo 8)
        jugadores_libres = Jugador.objects.filter(
            equipo__isnull=True,  # Sin equipo fantasy
            equipo_real__isnull=False,  # Con equipo real
            fecha_mercado__isnull=False,  # En el mercado
            fecha_mercado__gte=limite_expiracion,  # No expirados
            en_venta=False  # 🆕 No están en venta por usuarios
        ).order_by('?')[:8]
        
        # 2. 🆕 JUGADORES EN VENTA POR USUARIOS (ilimitados)
        jugadores_en_venta = Jugador.objects.filter(
            en_venta=True,  # 🆕 Marcados para vender
            equipo__isnull=False,  # 🆕 Tienen equipo (pertenecen a usuarios)
            equipo__liga=liga  # 🆕 De la misma liga
        )

        # 🆕 COMBINAR AMBOS TIPOS
        todos_jugadores = list(jugadores_libres) + list(jugadores_en_venta)
        
        serializer = JugadorSerializer(todos_jugadores, many=True)
        
        # Añadir información de expiración y procedencia
        data = serializer.data
        for jugador_data in data:
            jugador = Jugador.objects.get(id=jugador_data['id'])
            
            # 🆕 DETERMINAR PROCEDENCIA
            if jugador.en_venta and jugador.equipo:
                # Jugador en venta por usuario
                jugador_data['procedencia'] = f"Equipo: {jugador.equipo.nombre}"
                jugador_data['tipo'] = 'venta_usuario'
                jugador_data['fecha_expiracion'] = 'En venta'  # No expira
                jugador_data['expirado'] = False
            else:
                # Jugador libre rotatorio
                if jugador.fecha_mercado:
                    expiracion = jugador.fecha_mercado + timedelta(hours=24)
                    fecha_expiracion = expiracion.strftime('%d %b a las %H:%M')
                    jugador_data['fecha_expiracion'] = fecha_expiracion
                    jugador_data['expirado'] = ahora >= expiracion
                else:
                    jugador_data['fecha_expiracion'] = 'Fecha no disponible'
                    jugador_data['expirado'] = True
                
                jugador_data['procedencia'] = 'Sin equipo'
                jugador_data['tipo'] = 'libre_rotatorio'

        return Response(data)

    def actualizar_mercado_libre(self):
        """Actualiza solo el mercado de jugadores libres (no afecta jugadores en venta)"""
        ahora = timezone.now()
        limite_expiracion = ahora - timedelta(hours=24)
        
        # 🆕 SOLO ELIMINAR JUGADORES LIBRES EXPIRADOS (no los en venta)
        Jugador.objects.filter(
            fecha_mercado__lt=limite_expiracion,
            en_venta=False,  # 🆕 Solo jugadores libres
            equipo__isnull=True  # 🆕 Solo sin equipo
        ).update(fecha_mercado=None)
        
        # CONTAR JUGADORES LIBRES ACTUALES
        jugadores_libres_en_mercado = Jugador.objects.filter(
            fecha_mercado__isnull=False,
            fecha_mercado__gte=limite_expiracion,
            en_venta=False,
            equipo__isnull=True
        ).count()
        
        # SI HAY MENOS DE 8 JUGADORES LIBRES, AÑADIR NUEVOS
        if jugadores_libres_en_mercado < 8:
            necesarios = 8 - jugadores_libres_en_mercado
            
            jugadores_libres = Jugador.objects.filter(
                equipo__isnull=True,
                equipo_real__isnull=False,
                fecha_mercado__isnull=True,
                en_venta=False  # 🆕 Solo jugadores no en venta
            ).order_by('?')[:necesarios]
            
            for jugador in jugadores_libres:
                jugador.fecha_mercado = ahora
                jugador.save()

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
        posicion = request.data.get('posicion')
        
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