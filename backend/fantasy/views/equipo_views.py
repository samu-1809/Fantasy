from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Prefetch
from django.db import transaction
from ..models import Equipo, Jugador, Puja
from ..serializers import EquipoSerializer, JugadorSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plantilla_equipo(request, equipo_id):
    try:
        print(f"🎯 Cargando plantilla para equipo ID: {equipo_id}")
        
        equipo = Equipo.objects.select_related(
            'usuario', 'liga'
        ).prefetch_related(
            Prefetch('jugadores', queryset=Jugador.objects.all())
        ).get(id=equipo_id)
        
        jugadores = equipo.jugadores.all()
        alineacion = calcular_alineacion_backend(jugadores)
        
        response_data = {
            'equipo': EquipoSerializer(equipo).data,
            'jugadores': JugadorSerializer(jugadores, many=True).data,
            'alineacion': alineacion
        }
        
        print(f"✅ Plantilla cargada: {equipo.nombre} - {len(jugadores)} jugadores")
        return Response(response_data)
        
    except Equipo.DoesNotExist:
        print(f"❌ Equipo {equipo_id} no encontrado")
        return Response(
            {"error": "Equipo no encontrado"}, 
            status=404
        )

def calcular_alineacion_backend(jugadores):
    if not jugadores:
        return {
            'portero_titular': None,
            'defensas_titulares': [],
            'delanteros_titulares': [],
            'banquillo': []
        }
    
    porteros = [j for j in jugadores if j.posicion == 'POR']
    defensas = [j for j in jugadores if j.posicion == 'DEF']
    delanteros = [j for j in jugadores if j.posicion == 'DEL']
    
    porteros.sort(key=lambda x: x.puntos_totales, reverse=True)
    defensas.sort(key=lambda x: x.puntos_totales, reverse=True)
    delanteros.sort(key=lambda x: x.puntos_totales, reverse=True)
    
    portero_titular = next((p for p in porteros if not p.en_banquillo), porteros[0] if porteros else None)
    
    defensas_titulares = [d for d in defensas if not d.en_banquillo][:2]
    if len(defensas_titulares) < 2:
        necesarios = 2 - len(defensas_titulares)
        defensas_banquillo = [d for d in defensas if d.en_banquillo][:necesarios]
        defensas_titulares.extend(defensas_banquillo)
    
    delanteros_titulares = [d for d in delanteros if not d.en_banquillo][:2]
    if len(delanteros_titulares) < 2:
        necesarios = 2 - len(delanteros_titulares)
        delanteros_banquillo = [d for d in delanteros if d.en_banquillo][:necesarios]
        delanteros_titulares.extend(delanteros_banquillo)
    
    titulares_ids = set()
    if portero_titular:
        titulares_ids.add(portero_titular.id)
    titulares_ids.update(d.id for d in defensas_titulares)
    titulares_ids.update(d.id for d in delanteros_titulares)
    
    banquillo = [j for j in jugadores if j.id not in titulares_ids]
    
    return {
        'portero_titular': JugadorSerializer(portero_titular).data if portero_titular else None,
        'defensas_titulares': JugadorSerializer(defensas_titulares, many=True).data,
        'delanteros_titulares': JugadorSerializer(delanteros_titulares, many=True).data,
        'banquillo': JugadorSerializer(banquillo, many=True).data
    }

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
            status=404
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def poner_en_venta(request, equipo_id, jugador_id):
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
    except (Equipo.DoesNotExist, Jugador.DoesNotExist):
        return Response({'error': 'Jugador o equipo no encontrado'}, status=404)
    
    precio_venta = request.data.get('precio_venta', jugador.valor)
    
    try:
        jugador.poner_en_mercado(precio_venta)
    except AttributeError:
        jugador.en_venta = True
        jugador.precio_venta = precio_venta
        jugador.fecha_mercado = timezone.now()
        jugador.save()
    
    return Response({
        'message': f'{jugador.nombre} puesto en venta en el mercado por €{precio_venta:,}',
        'precio_venta': precio_venta,
        'jugador': {
            'id': jugador.id,
            'nombre': jugador.nombre,
            'en_venta': True
        }
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quitar_del_mercado(request, equipo_id, jugador_id):
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)
    except Jugador.DoesNotExist:
        return Response({'error': 'Jugador no encontrado en tu equipo'}, status=404)
    
    if not jugador.en_venta:
        return Response({'error': 'El jugador no está en el mercado'}, status=400)
    
    try:
        with transaction.atomic():
            pujas_activas = Puja.objects.filter(
                jugador=jugador,
                activa=True
            ).select_related('equipo')
            
            # Notificar a cada equipo que pujó
            for puja in pujas_activas:
                # 🆕 Crear notificación para el equipo pujador
                crear_notificacion(
                    usuario=puja.equipo.usuario,
                    tipo_codigo='jugador_no_adquirido',
                    titulo='Jugador retirado del mercado',
                    mensaje=f'El jugador {jugador.nombre} ha sido retirado del mercado. Tu puja ha sido cancelada.',
                    datos_extra={
                        'jugador_id': jugador.id,
                        'jugador_nombre': jugador.nombre,
                        'monto_puja': puja.monto,
                        'tipo': 'jugador_retirado'
                    }
                )
                print(f"✅ Notificación enviada a {puja.equipo.nombre}")
                
                # Marcar la puja como no activa
                puja.activa = False
                puja.save()
            
            # Quitar jugador del mercado
            if hasattr(jugador, 'quitar_del_mercado') and callable(jugador.quitar_del_mercado):
                jugador.quitar_del_mercado()
            else:
                jugador.en_venta = False
                jugador.precio_venta = None
                jugador.en_banquillo = True
                jugador.save()
        
        return Response({
            'message': f'{jugador.nombre} quitado del mercado',
            'jugador': JugadorSerializer(jugador).data
        })
        
    except Exception as e:
        print(f"❌ Error inesperado en quitar_del_mercado: {str(e)}")
        return Response({'error': 'Error interno del servidor'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def intercambiar_jugadores(request, equipo_id):
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)
    
    jugador_origen_id = request.data.get('jugador_origen_id')
    jugador_destino_id = request.data.get('jugador_destino_id')
    
    print(f"🔍 Intercambiando jugadores: {jugador_origen_id} ↔ {jugador_destino_id}")
    
    if not jugador_origen_id or not jugador_destino_id:
        return Response({'error': 'Se requieren ambos IDs de jugadores'}, status=400)
    
    try:
        jugador_origen = equipo.jugadores.get(id=jugador_origen_id)
        jugador_destino = equipo.jugadores.get(id=jugador_destino_id)
        print(f"✅ Jugadores encontrados: {jugador_origen.nombre} ↔ {jugador_destino.nombre}")
    except Jugador.DoesNotExist:
        print("❌ Jugador no encontrado en el equipo")
        return Response({'error': 'Jugador no encontrado en tu equipo'}, status=404)
    
    if jugador_origen.posicion != jugador_destino.posicion:
        error_msg = f'Solo puedes intercambiar jugadores de la misma posición: {jugador_origen.posicion} != {jugador_destino.posicion}'
        print(f"❌ {error_msg}")
        return Response({'error': error_msg}, status=400)
    
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mover_a_alineacion(request, equipo_id):
    """Mover jugador del banquillo a la alineación"""
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        jugador_id = request.data.get('jugador_id')
        posicion = request.data.get('posicion')
        
        print(f"🔄 Moviendo jugador a alineación: jugador_id={jugador_id}, posicion={posicion}")
        
        jugador = Jugador.objects.get(id=jugador_id, equipo=equipo)
        
        # Verificar que el jugador esté en el banquillo
        if not jugador.en_banquillo:
            return Response({'error': 'El jugador no está en el banquillo'}, status=400)
        
        # Verificar que la posición coincida
        if jugador.posicion != posicion:
            return Response({'error': f'El jugador no es de la posición {posicion}'}, status=400)
        
        # Mover a la alineación (sacar del banquillo)
        jugador.en_banquillo = False
        jugador.save()
        
        print(f"✅ Jugador {jugador.nombre} movido a la alineación como {posicion}")
        
        return Response({
            'success': True,
            'message': f'{jugador.nombre} movido a la alineación como {posicion}',
            'jugador': JugadorSerializer(jugador).data
        })
        
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)
    except Jugador.DoesNotExist:
        return Response({'error': 'Jugador no encontrado'}, status=404)
    except Exception as e:
        print(f"❌ Error inesperado en mover_a_alineacion: {str(e)}")
        return Response({'error': 'Error interno del servidor'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def guardar_alineacion(request, equipo_id):
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        jugadores_data = request.data.get('jugadores', [])
        
        with transaction.atomic():
            for jugador_data in jugadores_data:
                jugador = Jugador.objects.get(
                    id=jugador_data['jugador_id'], 
                    equipo=equipo
                )
                jugador.en_banquillo = jugador_data['en_banquillo']
                jugador.save()
            
            return Response({
                'message': 'Alineación guardada correctamente',
                'equipo': EquipoSerializer(equipo).data
            })
            
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)
    except Jugador.DoesNotExist:
        return Response({'error': 'Jugador no encontrado'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)