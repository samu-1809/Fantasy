from rest_framework import viewsets, status
from rest_framework.response import Response
from django.core.cache import cache
from random import uniform
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from ..models import Jugador, Oferta, Puja, Liga, Equipo
from ..serializers import OfertaSerializer, PujaSerializer, JugadorMercadoSerializer

class MercadoViewSet(viewsets.ViewSet):
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
        
        # Generar ofertas automáticas para jugadores con 24h en mercado
        self.generar_ofertas_automaticas()
        
        ahora = timezone.now()
        limite_expiracion = ahora - timedelta(hours=24)
        
        # 1. JUGADORES LIBRES FIJOS (máximo 8, mismo lote por 24h)
        jugadores_libres = Jugador.objects.filter(
            equipo__isnull=True,
            equipo_real__isnull=False,
            fecha_mercado__isnull=False,
            fecha_mercado__gte=limite_expiracion,
            en_venta=True
        ).order_by('id')
        
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
            
            jugador_data['en_venta'] = jugador.en_venta
            
            if jugador.equipo:
                jugador_data['tipo'] = 'venta_usuario'
                jugador_data['vendedor'] = jugador.equipo.nombre
                jugador_data['expirado'] = False
                jugador_data['fecha_expiracion'] = 'Hasta que se venda'
                
                if jugador.puja_actual and jugador.equipo_pujador:
                    jugador_data['puja_actual'] = jugador.puja_actual
                    jugador_data['pujador_actual'] = jugador.equipo_pujador.nombre
            else:
                jugador_data['tipo'] = 'libre_rotatorio'
                jugador_data['vendedor'] = 'Agente libre'
                jugador_data['expirado'] = jugador.expirado
                if jugador.fecha_mercado:
                    expiracion = jugador.fecha_mercado + timedelta(hours=24)
                    tiempo_restante = expiracion - ahora
                    
                    horas_restantes = int(tiempo_restante.total_seconds() // 3600)
                    minutos_restantes = int((tiempo_restante.total_seconds() % 3600) // 60)
                    
                    jugador_data['fecha_expiracion'] = expiracion.strftime('%d/%m/%Y %H:%M')
                    jugador_data['tiempo_restante'] = f"{horas_restantes:02d}:{minutos_restantes:02d}"
        
        return Response(data)
    
    def actualizar_mercado_libre_fijo(self):
        ahora = timezone.now()
        limite_expiracion = ahora - timedelta(hours=24)
        
        dia_actual = ahora.date().isoformat()
        cache_key = f'mercado_libre_lote_{dia_actual}'
        
        lote_generado = cache.get(cache_key)
        
        if not lote_generado:
            with transaction.atomic():
                print(f"🔄 Generando nuevo lote de jugadores libres para {dia_actual}")
                
                Jugador.objects.filter(
                    equipo__isnull=True,
                    en_venta=True
                ).update(
                    en_venta=False,
                    fecha_mercado=None,
                    puja_actual=None,
                    equipo_pujador=None
                )
                
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
                
                cache.set(cache_key, True, 26 * 60 * 60)
                
                print("✅ Lote de jugadores libres generado exitosamente")
        
        else:
            Jugador.objects.filter(
                fecha_mercado__lt=limite_expiracion,
                equipo__isnull=True
            ).update(
                en_venta=False,
                fecha_mercado=None,
                puja_actual=None,
                equipo_pujador=None
            )

    def generar_ofertas_automaticas(self):
        ahora = timezone.now()
        limite_24h = ahora - timedelta(hours=24)
        
        jugadores_24h = Jugador.objects.filter(
            equipo__isnull=False,
            en_venta=True,
            fecha_mercado__lte=limite_24h
        )
        
        print(f"🔄 Generando ofertas automáticas para {jugadores_24h.count()} jugadores con 24h en mercado...")
        
        for jugador in jugadores_24h:
            if jugador.puja_actual:
                monto_base = max(jugador.puja_actual + 1, jugador.valor)
                variacion = uniform(0.01, 0.05)
                monto_oferta = int(monto_base * (1 + variacion))
            else:
                variacion = uniform(-0.05, 0.05)
                monto_oferta = int(jugador.valor * (1 + variacion))
            
            equipos_interesados = Equipo.objects.exclude(id=jugador.equipo.id).order_by('?')[:1]
            
            if equipos_interesados:
                equipo_ofertante = equipos_interesados[0]
                
                hoy = timezone.now().date()
                oferta_existente = Oferta.objects.filter(
                    jugador=jugador,
                    equipo_ofertante=equipo_ofertante,
                    fecha_oferta__date=hoy
                ).exists()
                
                if not oferta_existente:
                    oferta = Oferta.objects.create(
                        jugador=jugador,
                        equipo_ofertante=equipo_ofertante,
                        equipo_receptor=jugador.equipo,
                        monto=monto_oferta,
                        estado='pendiente'
                    )
                    
                    if not jugador.puja_actual or monto_oferta > jugador.puja_actual:
                        jugador.puja_actual = monto_oferta
                        jugador.equipo_pujador = equipo_ofertante
                        jugador.save()
                    
                    print(f"✅ Oferta automática: {equipo_ofertante.nombre} -> {jugador.equipo.nombre} por {jugador.nombre} - €{monto_oferta}")

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
        
        equipos_usuario = Equipo.objects.filter(usuario=user)
        return Puja.objects.filter(
            models.Q(equipo__in=equipos_usuario) | 
            models.Q(jugador__equipo__in=equipos_usuario)
        )