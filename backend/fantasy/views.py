from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from .serializers import RegisterSerializer, LoginSerializer
from django.db.models import Prefetch
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Q
import random
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, Alineacion, Oferta, Puja
from .serializers import (
    LigaSerializer, JugadorSerializer, EquipoSerializer, AlineacionSerializer, OfertaSerializer, PujaSerializer, JugadorMercadoSerializer,
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

from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
import hashlib
from datetime import datetime

class MercadoViewSet(viewsets.ViewSet):
    """
    Endpoint para obtener jugadores disponibles en el mercado
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        liga_id = request.query_params.get('liga_id')
        
        if not liga_id:
            return Response({'error': 'Se requiere liga_id'}, status=400)
        
        try:
            liga = Liga.objects.get(id=liga_id)
        except Liga.DoesNotExist:
            return Response({'error': 'Liga no encontrada'}, status=404)
        
        # Actualizar mercado rotatorio con lote fijo de 24h
        self.actualizar_mercado_libre_fijo()
        
        ahora = timezone.now()
        limite_expiracion = ahora - timedelta(hours=24)
        
        # 1. JUGADORES LIBRES FIJOS (máximo 8, mismo lote por 24h)
        jugadores_libres = Jugador.objects.filter(
            equipo__isnull=True,
            equipo_real__isnull=False,
            fecha_mercado__isnull=False,
            fecha_mercado__gte=limite_expiracion,
            en_venta=True
        ).order_by('id')  # Orden fijo para consistencia
        
        # 2. JUGADORES EN VENTA POR USUARIOS
        jugadores_en_venta = Jugador.objects.filter(
            en_venta=True,
            equipo__isnull=False,
            equipo__liga=liga
        ).exclude(fecha_mercado__lt=limite_expiracion)
        
        # Combinar y serializar
        todos_jugadores = list(jugadores_libres) + list(jugadores_en_venta)
        serializer = JugadorMercadoSerializer(todos_jugadores, many=True)
        
        # Añadir información adicional
        data = serializer.data
        for jugador_data in data:
            jugador = Jugador.objects.get(id=jugador_data['id'])
            
            if jugador.equipo:
                # Jugador en venta por usuario
                jugador_data['tipo'] = 'venta_usuario'
                jugador_data['vendedor'] = jugador.equipo.nombre
                jugador_data['expirado'] = False
                jugador_data['fecha_expiracion'] = 'Hasta que se venda'
            else:
                # Jugador libre
                jugador_data['tipo'] = 'libre_rotatorio'
                jugador_data['vendedor'] = 'Agente libre'
                jugador_data['expirado'] = jugador.expirado
                if jugador.fecha_mercado:
                    expiracion = jugador.fecha_mercado + timedelta(hours=24)
                    tiempo_restante = expiracion - ahora
                    
                    # Calcular horas y minutos restantes
                    horas_restantes = int(tiempo_restante.total_seconds() // 3600)
                    minutos_restantes = int((tiempo_restante.total_seconds() % 3600) // 60)
                    
                    jugador_data['fecha_expiracion'] = expiracion.strftime('%d/%m/%Y %H:%M')
                    jugador_data['tiempo_restante'] = f"{horas_restantes:02d}:{minutos_restantes:02d}"
        
        return Response(data)
    
    def actualizar_mercado_libre_fijo(self):
        """Actualizar jugadores libres con lote fijo cada 24 horas"""
        ahora = timezone.now()
        limite_expiracion = ahora - timedelta(hours=24)
        
        # Generar una clave única para el día actual
        dia_actual = ahora.date().isoformat()
        cache_key = f'mercado_libre_lote_{dia_actual}'
        
        # Verificar si ya hemos generado el lote de hoy
        lote_generado = cache.get(cache_key)
        
        if not lote_generado:
            with transaction.atomic():
                print(f"🔄 Generando nuevo lote de jugadores libres para {dia_actual}")
                
                # Eliminar TODOS los jugadores libres existentes (expirados o no)
                Jugador.objects.filter(
                    equipo__isnull=True,
                    en_venta=True
                ).update(
                    en_venta=False,
                    fecha_mercado=None,
                    puja_actual=None,
                    equipo_pujador=None
                )
                
                # Seleccionar exactamente 8 nuevos jugadores libres
                nuevos_jugadores = Jugador.objects.filter(
                    equipo__isnull=True,
                    equipo_real__isnull=False,
                    fecha_mercado__isnull=True,
                    en_venta=False
                ).order_by('?')[:8]
                
                print(f"🎯 Seleccionados {len(nuevos_jugadores)} jugadores para el nuevo lote")
                
                for jugador in nuevos_jugadores:
                    jugador.poner_en_mercado()
                    print(f"➕ {jugador.nombre} añadido al mercado libre")
                
                # Marcar que ya generamos el lote de hoy (expira en 26 horas por seguridad)
                cache.set(cache_key, True, 26 * 60 * 60)
                
                print("✅ Lote de jugadores libres generado exitosamente")
        
        else:
            # Solo limpiar jugadores expirados del lote actual
            Jugador.objects.filter(
                fecha_mercado__lt=limite_expiracion,
                equipo__isnull=True
            ).update(
                en_venta=False,
                fecha_mercado=None,
                puja_actual=None,
                equipo_pujador=None
            )

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

class OfertaViewSet(viewsets.ModelViewSet):
    queryset = Oferta.objects.all()
    serializer_class = OfertaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Oferta.objects.all()
        
        equipos_usuario = Equipo.objects.filter(usuario=user)
        return Oferta.objects.filter(
            models.Q(equipo_ofertante__in=equipos_usuario) | 
            models.Q(equipo_receptor__in=equipos_usuario)
        )

class PujaViewSet(viewsets.ModelViewSet):
    queryset = Puja.objects.all()
    serializer_class = PujaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Puja.objects.all()
        
        # Usuarios normales solo ven pujas relacionadas con sus equipos
        equipos_usuario = Equipo.objects.filter(usuario=user)
        return Puja.objects.filter(
            models.Q(equipo__in=equipos_usuario) | 
            models.Q(jugador__equipo__in=equipos_usuario)
        )

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def equipo_detalle(request, pk):
    """
    Obtener un equipo específico por ID - Cualquier usuario autenticado puede ver cualquier equipo
    """
    print(f"🎯 EJECUTANDO equipo_detalle para equipo ID: {pk}")
    print(f"🔐 Usuario autenticado: {request.user.username} (ID: {request.user.id})")
    print(f"📤 Headers de la solicitud: {request.headers}")
    
    try:
        equipo = Equipo.objects.get(id=pk)
        print(f"✅ Equipo encontrado: {equipo.nombre} (Usuario: {equipo.usuario.username})")
        
        serializer = EquipoSerializer(equipo, context={'request': request})
        return Response(serializer.data)
        
    except Equipo.DoesNotExist:
        print(f"❌ Equipo con ID {pk} no encontrado")
        return Response(
            {"error": "Equipo no encontrado"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    """
    Obtener un equipo específico por ID - Cualquier usuario autenticado puede ver cualquier equipo
    """
    try:
        equipo = Equipo.objects.get(id=pk)
        serializer = EquipoSerializer(equipo, context={'request': request})
        return Response(serializer.data)
    except Equipo.DoesNotExist:
        return Response(
            {"error": "Equipo no encontrado"}, 
            status=status.HTTP_404_NOT_FOUND
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finalizar_subastas(request):
    """
    Endpoint para finalizar subastas expiradas (ejecutar cada 24h)
    """
    if not request.user.is_superuser:
        return Response({'error': 'Solo administradores pueden ejecutar esta acción'}, status=403)
    
    ahora = timezone.now()
    limite_expiracion = ahora - timedelta(hours=24)
    
    # Jugadores con subastas expiradas
    jugadores_expirados = Jugador.objects.filter(
        fecha_mercado__lt=limite_expiracion,
        en_venta=True
    )
    
    resultados = []
    for jugador in jugadores_expirados:
        try:
            with transaction.atomic():
                resultado = jugador.finalizar_subasta()
                if resultado:
                    resultados.append({
                        'jugador': jugador.nombre,
                        'resultado': resultado
                    })
        except Exception as e:
            resultados.append({
                'jugador': jugador.nombre,
                'error': str(e)
            })
    
    return Response({
        'message': f'Subastas finalizadas: {len(resultados)} procesadas',
        'resultados': resultados
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def poner_en_venta(request, equipo_id, jugador_id):
    """
    Poner un jugador del equipo en venta en el mercado
    """
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
    except (Equipo.DoesNotExist, Jugador.DoesNotExist):
        return Response({'error': 'Jugador o equipo no encontrado'}, status=404)
    
    precio_venta = request.data.get('precio_venta')
    
    if precio_venta and precio_venta < jugador.valor * 0.5:
        return Response({'error': 'El precio de venta debe ser al menos el 50% del valor del jugador'}, status=400)
    
    jugador.poner_en_mercado(precio_venta)
    
    return Response({
        'message': f'{jugador.nombre} puesto en venta en el mercado',
        'precio_venta': jugador.precio_venta,
        'expiracion': jugador.expiracion_mercado
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retirar_oferta(request, oferta_id):
    """
    Retirar una oferta realizada (solo si está pendiente)
    """
    try:
        oferta = Oferta.objects.get(
            id=oferta_id,
            equipo_ofertante__usuario=request.user,
            estado='pendiente'
        )
    except Oferta.DoesNotExist:
        return Response({'error': 'Oferta no encontrada o no se puede retirar'}, status=404)
    
    oferta.estado = 'retirada'
    oferta.fecha_respuesta = timezone.now()
    oferta.save()
    
    return Response({'message': 'Oferta retirada correctamente'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pujar_jugador(request, equipo_id):
    """Realizar una puja por un jugador en el mercado"""
    print("=" * 50)
    print("🎯 INICIANDO PROCESO DE PUJA")
    print(f"👤 Usuario: {request.user.username}")
    print(f"🏆 Equipo ID: {equipo_id}")
    print(f"📦 Datos recibidos: {request.data}")
    
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        print(f"✅ Equipo encontrado: {equipo.nombre}")
    except Equipo.DoesNotExist:
        print("❌ Equipo no encontrado o no pertenece al usuario")
        return Response(
            {'error': 'Equipo no encontrado o no tienes permisos'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    jugador_id = request.data.get('jugador_id')
    monto_puja = request.data.get('monto_puja')
    
    print(f"🎯 Jugador ID: {jugador_id}")
    print(f"💰 Monto puja: {monto_puja}")
    
    if not jugador_id or not monto_puja:
        print("❌ Datos incompletos")
        return Response(
            {'error': 'Datos incompletos: se requiere jugador_id y monto_puja'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        jugador = Jugador.objects.get(id=jugador_id)
        print(f"✅ Jugador encontrado: {jugador.nombre}")
    except Jugador.DoesNotExist:
        print("❌ Jugador no encontrado")
        return Response(
            {'error': 'Jugador no encontrado'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Verificar que el jugador está en el mercado
    if not jugador.en_venta:
        print("❌ Jugador no está en venta")
        return Response(
            {'error': 'El jugador no está en el mercado'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verificar que no ha expirado
    if jugador.expirado:
        print("❌ Subasta expirada")
        return Response(
            {'error': 'La subasta ha expirado'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verificar presupuesto
    if equipo.presupuesto < monto_puja:
        print(f"❌ Presupuesto insuficiente: {equipo.presupuesto} < {monto_puja}")
        return Response(
            {'error': 'Presupuesto insuficiente'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verificar que la puja es mayor que la actual
    puja_minima = (jugador.puja_actual or jugador.valor) + 100000  # Mínimo 100k más
    if monto_puja <= puja_minima:
        print(f"❌ Puja demasiado baja: {monto_puja} <= {puja_minima}")
        return Response(
            {'error': f'La puja debe ser mayor a {puja_minima}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        print("🔄 Realizando puja en la base de datos...")
        with transaction.atomic():
            # Crear nueva puja
            puja = Puja.objects.create(
                jugador=jugador,
                equipo=equipo,
                monto=monto_puja
            )
            print(f"✅ Puja creada: ID {puja.id}")
            
            # Actualizar puja actual del jugador
            jugador.puja_actual = monto_puja
            jugador.equipo_pujador = equipo
            jugador.save()
            print(f"✅ Jugador actualizado: puja_actual = {monto_puja}")
            
            # Restar el monto del presupuesto del equipo (reserva)
            equipo.presupuesto -= monto_puja
            equipo.save()
            print(f"✅ Presupuesto actualizado: {equipo.presupuesto}")
        
        print("🎉 Puja realizada exitosamente")
        return Response({
            'success': True,
            'mensaje': f'Puja de €{monto_puja:,} realizada por {jugador.nombre}',
            'puja_actual': jugador.puja_actual,
            'pujador_actual': equipo.nombre,
            'nuevo_presupuesto': equipo.presupuesto
        })
        
    except Exception as e:
        print(f"❌ ERROR en puja: {str(e)}")
        print(f"❌ Tipo de error: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ofertas_recibidas(request, equipo_id):
    try:
        equipo = Equipo.objects.get(id=equipo_id)
        
        # Verificar que el equipo pertenece al usuario
        if equipo.usuario != request.user:
            return Response({'error': 'No tienes permisos para este equipo'}, status=403)
        
        ofertas = Oferta.objects.filter(
            equipo_receptor=equipo,
            estado='pendiente'
        ).select_related('jugador', 'equipo_ofertante')
        
        serializer = OfertaSerializer(ofertas, many=True)
        return Response(serializer.data)
        
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ofertas_realizadas(request, equipo_id):
    try:
        equipo = Equipo.objects.get(id=equipo_id)
        
        # Verificar que el equipo pertenece al usuario
        if equipo.usuario != request.user:
            return Response({'error': 'No tienes permisos para este equipo'}, status=403)
        
        ofertas = Oferta.objects.filter(
            equipo_ofertante=equipo
        ).select_related('jugador', 'equipo_receptor').order_by('-fecha_oferta')
        
        serializer = OfertaSerializer(ofertas, many=True)
        return Response(serializer.data)
        
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def aceptar_oferta(request, oferta_id):
    try:
        oferta = Oferta.objects.get(id=oferta_id)
        
        # Verificar que la oferta es para el usuario
        if oferta.equipo_receptor.usuario != request.user:
            return Response({'error': 'No tienes permisos para aceptar esta oferta'}, status=403)
        
        # Verificar que la oferta está pendiente
        if oferta.estado != 'pendiente':
            return Response({'error': 'La oferta ya fue procesada'}, status=400)
        
        with transaction.atomic():
            if oferta.aceptar():
                return Response({
                    'success': True,
                    'mensaje': f'Oferta aceptada. {oferta.jugador.nombre} transferido a {oferta.equipo_ofertante.nombre}'
                })
            else:
                return Response({'error': 'No se pudo aceptar la oferta'}, status=400)
                
    except Oferta.DoesNotExist:
        return Response({'error': 'Oferta no encontrada'}, status=404)
    except Exception as e:
        return Response({'error': 'Error interno del servidor'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rechazar_oferta(request, oferta_id):
    try:
        oferta = Oferta.objects.get(id=oferta_id)
        
        # Verificar que la oferta es para el usuario
        if oferta.equipo_receptor.usuario != request.user:
            return Response({'error': 'No tienes permisos para rechazar esta oferta'}, status=403)
        
        # Verificar que la oferta está pendiente
        if oferta.estado != 'pendiente':
            return Response({'error': 'La oferta ya fue procesada'}, status=400)
        
        with transaction.atomic():
            if oferta.rechazar():
                return Response({
                    'success': True,
                    'mensaje': 'Oferta rechazada'
                })
            else:
                return Response({'error': 'No se pudo rechazar la oferta'}, status=400)
                
    except Oferta.DoesNotExist:
        return Response({'error': 'Oferta no encontrada'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quitar_del_mercado(request, equipo_id, jugador_id):
    """
    Quitar un jugador del mercado (solo si es del equipo del usuario)
    """
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
    except (Equipo.DoesNotExist, Jugador.DoesNotExist):
        return Response({'error': 'Jugador o equipo no encontrado'}, status=404)
    
    if not jugador.en_venta:
        return Response({'error': 'El jugador no está en el mercado'}, status=400)
    
    jugador.quitar_del_mercado()
    
    return Response({
        'message': f'{jugador.nombre} quitado del mercado',
        'jugador': JugadorSerializer(jugador).data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def intercambiar_jugadores(request, equipo_id):
    """Intercambiar dos jugadores del equipo (misma posición)"""
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)
    
    jugador_origen_id = request.data.get('jugador_origen_id')
    jugador_destino_id = request.data.get('jugador_destino_id')
    
    print(f"🔍 Intercambiando jugadores: {jugador_origen_id} ↔ {jugador_destino_id}")
    
    # Validación básica
    if not jugador_origen_id or not jugador_destino_id:
        return Response({'error': 'Se requieren ambos IDs de jugadores'}, status=400)
    
    try:
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def actualizar_estados_banquillo(request, equipo_id):
    """Actualizar estados en_banquillo de múltiples jugadores"""
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)
    
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pujas_realizadas(request, equipo_id):
    """
    Obtener todas las pujas realizadas por un equipo
    """
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)

    # Obtener pujas del equipo que aún no han sido ganadoras
    pujas = Puja.objects.filter(
        equipo=equipo,
        es_ganadora=False
    ).select_related('jugador', 'jugador__equipo_real')
    
    serializer = PujaSerializer(pujas, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retirar_puja(request, puja_id):
    """
    Retirar una puja realizada (solo si no ha sido ganadora y la subasta no ha terminado)
    """
    try:
        puja = Puja.objects.get(id=puja_id, equipo__usuario=request.user)
    except Puja.DoesNotExist:
        return Response({'error': 'Puja no encontrada'}, status=404)

    # Verificar que la puja no haya sido ganadora
    if puja.es_ganadora:
        return Response({'error': 'No puedes retirar una puja ganadora'}, status=400)

    jugador = puja.jugador
    
    # Verificar que el jugador todavía esté en el mercado y no haya expirado
    if not jugador.en_venta or jugador.expirado:
        return Response({'error': 'No se puede retirar la puja porque la subasta ha terminado'}, status=400)

    try:
        with transaction.atomic():
            equipo = puja.equipo
            
            # Si esta puja es la puja actual del jugador, debemos revertir la puja actual
            if jugador.puja_actual == puja.monto and jugador.equipo_pujador == equipo:
                print(f"🔄 Esta puja es la actual, buscando puja anterior...")
                
                # Buscar la puja anterior (excluyendo esta)
                puja_anterior = Puja.objects.filter(
                    jugador=jugador
                ).exclude(id=puja_id).order_by('-monto', '-fecha_puja').first()
                
                if puja_anterior:
                    jugador.puja_actual = puja_anterior.monto
                    jugador.equipo_pujador = puja_anterior.equipo
                    print(f"✅ Puja actual revertida a: {puja_anterior.equipo.nombre} - €{puja_anterior.monto}")
                else:
                    jugador.puja_actual = None
                    jugador.equipo_pujador = None
                    print(f"✅ No hay pujas anteriores, puja actual resetada")
            
            # Devolver el dinero al equipo
            equipo.presupuesto += puja.monto
            equipo.save()
            print(f"✅ Dinero devuelto: €{puja.monto}. Nuevo presupuesto: €{equipo.presupuesto}")

            # Eliminar la puja
            puja.delete()
            print(f"✅ Puja eliminada")

            # Guardar los cambios en el jugador
            jugador.save()

        return Response({
            'success': True,
            'message': 'Puja retirada correctamente',
            'nuevo_presupuesto': equipo.presupuesto
        })
        
    except Exception as e:
        print(f"❌ Error retirando puja: {str(e)}")
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def equipos_disponibles_jornada(request, jornada_id):
    """
    Obtener equipos reales que NO tienen partido en la jornada especificada
    """
    try:
        jornada = Jornada.objects.get(id=jornada_id)
        
        # Obtener IDs de equipos que YA tienen partido en esta jornada
        partidos_jornada = Partido.objects.filter(jornada=jornada)
        
        equipos_ocupados_ids = set()
        for partido in partidos_jornada:
            if partido.equipo_local:
                equipos_ocupados_ids.add(partido.equipo_local.id)
            if partido.equipo_visitante:
                equipos_ocupados_ids.add(partido.equipo_visitante.id)
        
        # Obtener equipos que NO están ocupados
        equipos_disponibles = EquipoReal.objects.exclude(id__in=equipos_ocupados_ids)
        
        serializer = EquipoRealSerializer(equipos_disponibles, many=True)
        return Response(serializer.data)
        
    except Jornada.DoesNotExist:
        return Response(
            {'error': 'Jornada no encontrada'}, 
            status=status.HTTP_404_NOT_FOUND
        )