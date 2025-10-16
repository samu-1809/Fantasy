from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from rest_framework.response import Response
from django.db import transaction
from ..models import Oferta, Equipo, Jugador
from ..serializers import OfertaSerializer
from .utils_views import (
    crear_notificacion_oferta_rechazada,
    crear_notificacion_oferta_editada,    
    crear_notificacion_oferta_retirada,
    crear_notificacion_traspaso   
)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ofertas_recibidas(request, equipo_id):
    """Obtener ofertas recibidas por un equipo"""
    print(f"🔍 Buscando ofertas recibidas para equipo ID: {equipo_id}")
    
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        print(f"✅ Equipo encontrado: {equipo.nombre}")
    except Equipo.DoesNotExist:
        print("❌ Equipo no encontrado")
        return Response(
            {'error': 'Equipo no encontrado o no tienes permisos'}, 
            status=404
        )
    
    # Obtener ofertas pendientes donde este equipo es el receptor
    ofertas = Oferta.objects.filter(
        equipo_receptor=equipo,
        estado='pendiente'
    ).select_related('jugador', 'equipo_ofertante', 'jugador__equipo_real')
    
    print(f"📨 Ofertas encontradas: {ofertas.count()}")
    
    data = []
    for oferta in ofertas:
        oferta_data = {
            'id': oferta.id,
            'jugador_id': oferta.jugador.id,
            'jugador_nombre': oferta.jugador.nombre,
            'jugador_posicion': oferta.jugador.posicion,
            'jugador_equipo': oferta.jugador.equipo_real.nombre if oferta.jugador.equipo_real else 'Libre',
            'equipo_ofertante_id': oferta.equipo_ofertante.id,
            'equipo_ofertante_nombre': oferta.equipo_ofertante.nombre,
            'monto': oferta.monto,
            'fecha_oferta': oferta.fecha_oferta,
            'estado': oferta.estado
        }
        data.append(oferta_data)
        print(f"📋 Oferta: {oferta.jugador.nombre} - {oferta.equipo_ofertante.nombre} - €{oferta.monto}")
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ofertas_realizadas(request, equipo_id):
    """Obtener ofertas realizadas por un equipo"""
    print(f"🔍 Buscando ofertas realizadas para equipo ID: {equipo_id}")
    
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
        print(f"✅ Equipo encontrado: {equipo.nombre}")
    except Equipo.DoesNotExist:
        print("❌ Equipo no encontrado")
        return Response(
            {'error': 'Equipo no encontrado o no tienes permisos'}, 
            status=404
        )
    
    # Obtener ofertas pendientes donde este equipo es el ofertante
    ofertas = Oferta.objects.filter(
        equipo_ofertante=equipo,
        estado='pendiente'
    ).select_related('jugador', 'equipo_receptor', 'jugador__equipo_real')
    
    print(f"📤 Ofertas realizadas encontradas: {ofertas.count()}")
    
    data = []
    for oferta in ofertas:
        oferta_data = {
            'id': oferta.id,
            'jugador_id': oferta.jugador.id,
            'jugador_nombre': oferta.jugador.nombre,
            'jugador_posicion': oferta.jugador.posicion,
            'jugador_equipo': oferta.jugador.equipo_real.nombre if oferta.jugador.equipo_real else 'Libre',
            'equipo_receptor_id': oferta.equipo_receptor.id,
            'equipo_receptor_nombre': oferta.equipo_receptor.nombre,
            'monto': oferta.monto,
            'fecha_oferta': oferta.fecha_oferta,
            'estado': oferta.estado
        }
        data.append(oferta_data)
        print(f"📋 Oferta realizada: {oferta.jugador.nombre} - {oferta.equipo_receptor.nombre} - €{oferta.monto}")
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def aceptar_oferta(request, oferta_id):
    print(f"🔄 Aceptando oferta ID: {oferta_id}")
    
    try:
        oferta = Oferta.objects.select_related(
            'jugador', 'equipo_ofertante', 'equipo_receptor', 'jugador__equipo_real'
        ).get(id=oferta_id)
        
        print(f"✅ Oferta encontrada: {oferta.jugador.nombre}")
        
        # Verificar que el usuario es el receptor de la oferta (vendedor)
        if oferta.equipo_receptor.usuario != request.user:
            print("❌ Usuario no autorizado para aceptar esta oferta")
            return Response(
                {'error': 'No tienes permisos para aceptar esta oferta'}, 
                status=403
            )
        
        with transaction.atomic():
            jugador = oferta.jugador
            
            # Transferir el jugador al equipo ofertante
            equipo_anterior = jugador.equipo
            jugador.equipo = oferta.equipo_ofertante
            jugador.en_venta = False
            jugador.fecha_mercado = None
            jugador.precio_venta = None
            jugador.puja_actual = None
            jugador.equipo_pujador = None
            jugador.save()
            
            print(f"✅ Jugador transferido: {jugador.nombre} -> {oferta.equipo_ofertante.nombre}")
            
            # Transferir dinero
            oferta.equipo_ofertante.presupuesto -= oferta.monto
            oferta.equipo_ofertante.save()
            
            oferta.equipo_receptor.presupuesto += oferta.monto
            oferta.equipo_receptor.save()
            
            oferta.estado = 'aceptada'
            oferta.fecha_respuesta = timezone.now()
            oferta.save()
            
            # CREAR NOTIFICACIÓN PÚBLICA DE TRASPASO
            crear_notificacion_traspaso(
                jugador=jugador,
                equipo_origen=equipo_anterior,
                equipo_destino=oferta.equipo_ofertante
            )
            print(f"✅ Notificación pública creada para traspaso")
            
            # Rechazar automáticamente otras ofertas pendientes para el mismo jugador
            ofertas_pendientes = Oferta.objects.filter(
                jugador=jugador,
                estado='pendiente'
            ).exclude(id=oferta_id)
            
            for oferta_pendiente in ofertas_pendientes:
                # Devolver dinero de las ofertas rechazadas
                equipo_rechazado = oferta_pendiente.equipo_ofertante
                equipo_rechazado.presupuesto += oferta_pendiente.monto
                equipo_rechazado.save()
                
                oferta_pendiente.estado = 'rechazada'
                oferta_pendiente.fecha_respuesta = timezone.now()
                oferta_pendiente.save()
                
                # CREAR NOTIFICACIÓN DE OFERTA RECHAZADA PARA CADA OFERTANTE
                crear_notificacion_oferta_rechazada(
                    jugador=jugador,
                    ofertante=oferta_pendiente.equipo_ofertante
                )
                print(f"✅ Oferta {oferta_pendiente.id} rechazada automáticamente y notificación creada")
        
        return Response({
            'success': True,
            'mensaje': f'¡Has vendido a {jugador.nombre} a {oferta.equipo_ofertante.nombre} por €{oferta.monto:,}!',
            'jugador_transferido': {
                'id': jugador.id,
                'nombre': jugador.nombre,
                'nuevo_equipo': oferta.equipo_ofertante.nombre
            },
            'presupuesto_actual': oferta.equipo_receptor.presupuesto
        })
        
    except Oferta.DoesNotExist:
        print("❌ Oferta no encontrada")
        return Response(
            {'error': 'Oferta no encontrada'}, 
            status=404
        )
    except Exception as e:
        print(f"❌ Error inesperado en aceptar_oferta: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )
        
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rechazar_oferta(request, oferta_id):
    print(f"🔄 Rechazando oferta ID: {oferta_id}")
    
    try:
        oferta = Oferta.objects.select_related(
            'equipo_ofertante', 'equipo_receptor', 'jugador'
        ).get(id=oferta_id)
        print(f"✅ Oferta encontrada: {oferta.jugador.nombre}")
        
        # Verificar que el usuario es el receptor de la oferta (vendedor)
        if oferta.equipo_receptor.usuario != request.user:
            print("❌ Usuario no autorizado para rechazar esta oferta")
            return Response(
                {'error': 'No tienes permisos para rechazar esta oferta'}, 
                status=403
            )
        
        with transaction.atomic():
            # Devolver el dinero al equipo ofertante
            equipo_ofertante = oferta.equipo_ofertante
            equipo_ofertante.presupuesto += oferta.monto
            equipo_ofertante.save()
            print(f"✅ Dinero devuelto a {equipo_ofertante.nombre}: €{oferta.monto}")
            
            # Actualizar estado de la oferta
            oferta.estado = 'rechazada'
            oferta.fecha_respuesta = timezone.now()
            oferta.save()
            print(f"✅ Oferta rechazada")

            # CREAR NOTIFICACIÓN DE OFERTA RECHAZADA
            crear_notificacion_oferta_rechazada(
                jugador=oferta.jugador,
                ofertante=equipo_ofertante
            )
            print(f"✅ Notificación de oferta rechazada creada para {equipo_ofertante.nombre}")
        
        return Response({
            'success': True,
            'mensaje': f'Oferta de {equipo_ofertante.nombre} rechazada',
            'presupuesto_actual': oferta.equipo_receptor.presupuesto
        })
        
    except Oferta.DoesNotExist:
        print("❌ Oferta no encontrada")
        return Response(
            {'error': 'Oferta no encontrada'}, 
            status=404
        )
    except Exception as e:
        print(f"❌ Error inesperado en rechazar_oferta: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_oferta_directa(request):
    print("=" * 50)
    print("🎯 INICIANDO OFERTA DIRECTA")
    print(f"👤 Usuario: {request.user.username}")
    print(f"📦 Datos: {request.data}")
    
    try:
        jugador_id = request.data.get('jugador_id')
        monto = request.data.get('monto')
        
        if not jugador_id or not monto:
            return Response({'error': 'Se requiere jugador_id y monto'}, status=400)
        
        # Obtener jugador y equipo del usuario
        jugador = Jugador.objects.select_related('equipo').get(id=jugador_id)
        equipo_ofertante = Equipo.objects.get(usuario=request.user)
        
        print(f"✅ Jugador: {jugador.nombre} - Equipo: {jugador.equipo.nombre if jugador.equipo else 'Libre'}")
        print(f"✅ Ofertante: {equipo_ofertante.nombre}")
        
        # Validaciones
        if not jugador.equipo:
            return Response({'error': 'No se puede hacer oferta por jugador libre'}, status=400)
        
        if jugador.equipo == equipo_ofertante:
            return Response({'error': 'No puedes hacer oferta por tu propio jugador'}, status=400)
        
        if equipo_ofertante.presupuesto < monto:
            return Response({'error': 'Presupuesto insuficiente'}, status=400)
        

        # Crear oferta
        oferta = Oferta.objects.create(
            jugador=jugador,
            equipo_ofertante=equipo_ofertante,
            equipo_receptor=jugador.equipo,
            monto=monto,
            estado='pendiente'
        )
        
        # Bloquear presupuesto
        equipo_ofertante.presupuesto -= monto
        equipo_ofertante.save()
        
        print(f"✅ Oferta creada: €{monto} por {jugador.nombre}")
        
        return Response({
            'success': True,
            'mensaje': f'Oferta de €{monto:,} enviada a {jugador.equipo.nombre} por {jugador.nombre}',
            'oferta_id': oferta.id
        })
        
    except Jugador.DoesNotExist:
        return Response({'error': 'Jugador no encontrado'}, status=404)
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def editar_oferta(request, oferta_id):
    print(f"🔄 Editando oferta ID: {oferta_id}")
    
    try:
        oferta = Oferta.objects.select_related(
            'equipo_ofertante', 'jugador'
        ).get(
            id=oferta_id, 
            equipo_ofertante__usuario=request.user
        )
    except Oferta.DoesNotExist:
        return Response({'error': 'Oferta no encontrada'}, status=404)

    # Verificar que la oferta está pendiente
    if oferta.estado != 'pendiente':
        return Response({'error': 'Solo puedes editar ofertas pendientes'}, status=400)

    # Obtener nuevo monto del request
    nuevo_monto = request.data.get('nuevo_monto')
    if not nuevo_monto:
        return Response({'error': 'El nuevo monto es requerido'}, status=400)

    try:
        nuevo_monto = float(nuevo_monto)
    except (TypeError, ValueError):
        return Response({'error': 'El monto debe ser un número válido'}, status=400)

    # Validar que el nuevo monto es mayor
    if nuevo_monto <= oferta.monto:
        return Response({'error': 'El nuevo monto debe ser mayor al monto actual'}, status=400)

    equipo = oferta.equipo_ofertante

    # Calcular diferencia
    diferencia = nuevo_monto - oferta.monto

    if equipo.presupuesto < diferencia:
        return Response({'error': 'Presupuesto insuficiente para aumentar la oferta'}, status=400)

    try:
        with transaction.atomic():
            # Guardar monto anterior para la notificación
            monto_anterior = oferta.monto
            
            # Actualizar la oferta
            oferta.monto = nuevo_monto
            oferta.fecha_oferta = timezone.now()
            oferta.save()

            # Restar diferencia del presupuesto
            equipo.presupuesto -= diferencia
            equipo.save()

            # CREAR NOTIFICACIÓN DE OFERTA EDITADA
            crear_notificacion_oferta_editada(
                jugador=oferta.jugador,
                ofertante=oferta.equipo_ofertante,
                monto_anterior=monto_anterior,
                monto_nuevo=nuevo_monto
            )

            print(f"✅ Oferta actualizada: €{monto_anterior} -> €{nuevo_monto}. Diferencia: €{diferencia}")
            print(f"✅ Notificación creada para oferta editada")

        return Response({
            'success': True,
            'message': 'Oferta actualizada correctamente',
            'nuevo_monto': nuevo_monto,
            'nuevo_presupuesto': equipo.presupuesto
        })

    except Exception as e:
        print(f"❌ Error editando oferta: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retirar_oferta(request, oferta_id):
    try:
        oferta = Oferta.objects.select_related('equipo_ofertante', 'jugador').get(
            id=oferta_id,
            equipo_ofertante__usuario=request.user,
            estado='pendiente'
        )
    except Oferta.DoesNotExist:
        return Response({'error': 'Oferta no encontrada o no se puede retirar'}, status=404)
    
    try:
        with transaction.atomic():
            # Devolver el dinero al equipo ofertante
            equipo = oferta.equipo_ofertante
            equipo.presupuesto += oferta.monto
            equipo.save()
            
            # Marcar la oferta como retirada
            oferta.estado = 'retirada'
            oferta.fecha_respuesta = timezone.now()
            oferta.save()
            
            # CREAR NOTIFICACIÓN DE OFERTA RETIRADA
            crear_notificacion_oferta_retirada(
                jugador=oferta.jugador,
                ofertante=oferta.equipo_ofertante,
                monto=oferta.monto
            )
            
            print(f"✅ Oferta {oferta_id} retirada. Dinero devuelto: €{oferta.monto}")
            print(f"✅ Notificación creada para oferta retirada")
        
        return Response({
            'success': True,
            'message': 'Oferta retirada correctamente',
            'nuevo_presupuesto': equipo.presupuesto
        })
    
    except Exception as e:
        print(f"❌ Error retirando oferta: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )