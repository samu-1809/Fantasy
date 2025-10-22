from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from ..models import Puja, Equipo, Jugador, Oferta
from ..serializers import PujaSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pujar_jugador(request, equipo_id):
    print("=" * 50)
    print("🎯 INICIANDO PROCESO DE PUJA/OFERTA")
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
            status=404
        )
    
    jugador_id = request.data.get('jugador_id')
    monto_puja = request.data.get('monto_puja')
    
    print(f"🎯 Jugador ID: {jugador_id}")
    print(f"💰 Monto puja: {monto_puja}")
    
    if not jugador_id or not monto_puja:
        print("❌ Datos incompletos")
        return Response(
            {'error': 'Datos incompletos: se requiere jugador_id y monto_puja'}, 
            status=400
        )
    
    try:
        jugador = Jugador.objects.get(id=jugador_id)
        print(f"✅ Jugador encontrado: {jugador.nombre}")
        print(f"🔍 Jugador en venta: {jugador.en_venta}")
        print(f"🏠 Equipo dueño: {jugador.equipo}")
        print(f"👤 Nombre equipo dueño: {jugador.equipo.nombre if jugador.equipo else 'Mercado'}")
    except Jugador.DoesNotExist:
        print("❌ Jugador no encontrado")
        return Response(
            {'error': 'Jugador no encontrado'}, 
            status=404
        )
    
    if not jugador.en_venta:
        print("❌ Jugador no está en venta")
        return Response(
            {'error': 'El jugador no está en el mercado'}, 
            status=400
        )
    
    if jugador.expirado:
        print("❌ Subasta expirada")
        return Response(
            {'error': 'La subasta ha expirada'}, 
            status=400
        )
    
    if equipo.presupuesto < monto_puja:
        print(f"❌ Presupuesto insuficiente: {equipo.presupuesto} < {monto_puja}")
        return Response(
            {'error': 'Presupuesto insuficiente'}, 
            status=400
        )
    
    # Verificar si el jugador es del mercado o de un usuario
    if jugador.equipo:
        # Es un jugador de un usuario - crear OFERTA
        print("👥 Jugador en venta por usuario - creando OFERTA")
        return crear_oferta_usuario(request, equipo, jugador, monto_puja)
    else:
        # Es un jugador del mercado - crear PUJA
        print("🤖 Jugador del mercado - creando PUJA")
        return crear_puja_mercado(request, equipo, jugador, monto_puja)

def crear_oferta_usuario(request, equipo, jugador, monto_puja):
    """Crear una oferta entre usuarios"""
    try:
        # El equipo receptor es el equipo propietario del jugador
        equipo_receptor = jugador.equipo
        
        if not equipo_receptor:
            print("❌ El jugador no tiene equipo propietario")
            return Response(
                {'error': 'El jugador no tiene un equipo propietario definido'}, 
                status=400
            )
        
        print(f"✅ Equipo receptor encontrado: {equipo_receptor.nombre} (ID: {equipo_receptor.id})")
        
        # Verificar que no sea oferta a sí mismo
        if equipo_receptor.id == equipo.id:
            return Response(
                {'error': 'No puedes hacer ofertas por tus propios jugadores'}, 
                status=400
            )
        
        # Verificar monto mínimo
        if monto_puja < jugador.precio_venta:
            return Response(
                {'error': f'La oferta debe ser mayor a €{jugador.precio_venta:,}'}, 
                status=400
            )
        
        with transaction.atomic():
            # Crear la oferta
            oferta = Oferta.objects.create(
                jugador=jugador,
                equipo_receptor=equipo_receptor,
                equipo_ofertante=equipo,
                monto=monto_puja,
                estado='pendiente'
            )
            print(f"✅ Oferta creada: ID {oferta.id}")
            
            # Restar presupuesto al ofertante
            equipo.presupuesto -= monto_puja
            equipo.save()
            print(f"✅ Presupuesto actualizado: {equipo.presupuesto}")
            
            # Actualizar mejor oferta del jugador
            mejor_oferta_actual = Oferta.objects.filter(
                jugador=jugador, 
                estado='pendiente'
            ).order_by('-monto').first()
            
            if not mejor_oferta_actual or monto_puja > mejor_oferta_actual.monto:
                jugador.mejor_oferta = monto_puja
                jugador.equipo_mejor_oferta = equipo
                jugador.save()
                print(f"✅ Mejor oferta actualizada: {monto_puja}")
        
        print("🎉 Oferta entre usuarios creada exitosamente")
        return Response({
            'success': True,
            'tipo': 'oferta_usuario',
            'mensaje': f'Oferta de €{monto_puja:,} enviada a {equipo_receptor.nombre} por {jugador.nombre}',
            'nuevo_presupuesto': equipo.presupuesto,
            'oferta_id': oferta.id
        })
        
    except Exception as e:
        print(f"❌ ERROR creando oferta: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error creando oferta: {str(e)}'}, 
            status=500
        )
        
def crear_puja_mercado(request, equipo, jugador, monto_puja):
    """Crear una puja por jugador del mercado"""
    try:
        puja_minima = (jugador.puja_actual or jugador.valor) + 100000
        if monto_puja <= puja_minima:
            print(f"❌ Puja demasiado baja: {monto_puja} <= {puja_minima}")
            return Response(
                {'error': f'La puja debe ser mayor a €{puja_minima:,}'}, 
                status=400
            )
        
        with transaction.atomic():
            # Crear puja con campo activa=True
            puja = Puja.objects.create(
                jugador=jugador,
                equipo=equipo,
                monto=monto_puja,
                activa=True  # Asegurar que se crea como activa
            )
            print(f"✅ Puja creada: ID {puja.id}")
            
            jugador.puja_actual = monto_puja
            jugador.equipo_pujador = equipo
            jugador.save()
            print(f"✅ Jugador actualizado: puja_actual = {monto_puja}")
            
            equipo.presupuesto -= monto_puja
            equipo.save()
            print(f"✅ Presupuesto actualizado: {equipo.presupuesto}")
        
        print("🎉 Puja al mercado realizada exitosamente")
        return Response({
            'success': True,
            'tipo': 'puja_mercado',
            'mensaje': f'Puja de €{monto_puja:,} realizada por {jugador.nombre}',
            'puja_actual': jugador.puja_actual,
            'pujador_actual': equipo.nombre,
            'nuevo_presupuesto': equipo.presupuesto
        })
        
    except Exception as e:
        print(f"❌ ERROR en puja: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pujas_realizadas(request, equipo_id):
    try:
        equipo = Equipo.objects.get(id=equipo_id, usuario=request.user)
    except Equipo.DoesNotExist:
        return Response({'error': 'Equipo no encontrado'}, status=404)

    # Verificar si existe el campo activa en el modelo
    try:
        # Intentar filtrar por activa si existe el campo
        pujas = Puja.objects.filter(
            equipo=equipo,
            es_ganadora=False,
            activa=True  # Solo pujas activas
        ).select_related('jugador', 'jugador__equipo_real')
    except Exception as e:
        print(f"⚠️ Campo 'activa' no encontrado, usando filtro alternativo: {str(e)}")
        # Fallback: usar filtro sin campo activa
        pujas = Puja.objects.filter(
            equipo=equipo,
            es_ganadora=False
        ).select_related('jugador', 'jugador__equipo_real')
    
    # Serializar manualmente para incluir información adicional
    pujas_data = []
    for puja in pujas:
        puja_data = {
            'id': puja.id,
            'jugador': puja.jugador.id,
            'jugador_nombre': puja.jugador.nombre,
            'jugador_posicion': puja.jugador.posicion,
            'jugador_equipo_real_nombre': puja.jugador.equipo_real.nombre if puja.jugador.equipo_real else 'Sin equipo',
            'monto': puja.monto,
            'fecha_puja': puja.fecha_puja,
            'es_ganadora': puja.es_ganadora,
            'activa': getattr(puja, 'activa', True),  # Fallback si no existe el campo
            'jugador_en_venta': puja.jugador.en_venta,
            'jugador_expirado': puja.jugador.expirado,
        }
        pujas_data.append(puja_data)
    
    return Response(pujas_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retirar_puja(request, puja_id):
    try:
        puja = Puja.objects.get(id=puja_id, equipo__usuario=request.user)
    except Puja.DoesNotExist:
        return Response({'error': 'Puja no encontrada'}, status=404)

    # Verificar si la puja ya está inactiva (si existe el campo)
    if hasattr(puja, 'activa') and not puja.activa:
        return Response({
            'success': True, 
            'message': 'Puja ya fue retirada anteriormente',
            'nuevo_presupuesto': puja.equipo.presupuesto
        })

    if puja.es_ganadora:
        return Response({'error': 'No puedes retirar una puja ganadora'}, status=400)

    jugador = puja.jugador
    
    try:
        with transaction.atomic():
            equipo = puja.equipo
            
            # Solo actualizar el estado del jugador si todavía está en venta y no expirado
            if jugador.en_venta and not jugador.expirado:
                if jugador.puja_actual == puja.monto and jugador.equipo_pujador == equipo:
                    print(f"🔄 Esta puja es la actual, buscando puja anterior...")
                    
                    # Buscar pujas anteriores (con o sin campo activa)
                    try:
                        # Intentar filtrar por activa si existe
                        puja_anterior = Puja.objects.filter(
                            jugador=jugador,
                            activa=True
                        ).exclude(id=puja_id).order_by('-monto', '-fecha_puja').first()
                    except Exception:
                        # Fallback: filtrar sin campo activa
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
                    
                    jugador.save()
            
            # Devolver el dinero siempre
            equipo.presupuesto += puja.monto
            equipo.save()
            print(f"✅ Dinero devuelto: €{puja.monto}. Nuevo presupuesto: €{equipo.presupuesto}")

            # Marcar puja como inactiva si existe el campo, sino eliminarla
            if hasattr(puja, 'activa'):
                puja.activa = False
                puja.fecha_retirada = timezone.now()
                puja.save()
                print(f"✅ Puja marcada como inactiva")
            else:
                puja.delete()
                print(f"✅ Puja eliminada")

        return Response({
            'success': True,
            'message': 'Puja retirada correctamente',
            'nuevo_presupuesto': equipo.presupuesto
        })
        
    except Exception as e:
        print(f"❌ Error retirando puja: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def editar_puja(request, puja_id):
    print(f"🔄 Editando puja ID: {puja_id}")
    
    try:
        puja = Puja.objects.select_related('equipo', 'jugador').get(
            id=puja_id, 
            equipo__usuario=request.user
        )
    except Puja.DoesNotExist:
        return Response({'error': 'Puja no encontrada'}, status=404)

    # Verificar si la puja está activa
    if hasattr(puja, 'activa') and not puja.activa:
        return Response({'error': 'No puedes editar una puja retirada'}, status=400)

    if puja.es_ganadora:
        return Response({'error': 'No puedes editar una puja ganadora'}, status=400)

    # Obtener el nuevo monto del request
    nuevo_monto = request.data.get('nuevo_monto')
    if not nuevo_monto:
        return Response({'error': 'El nuevo monto es requerido'}, status=400)

    try:
        nuevo_monto = float(nuevo_monto)
    except (TypeError, ValueError):
        return Response({'error': 'El monto debe ser un número válido'}, status=400)

    jugador = puja.jugador
    equipo = puja.equipo

    # Validaciones
    if not jugador.en_venta or jugador.expirado:
        return Response({'error': 'El jugador ya no está en venta'}, status=400)

    if nuevo_monto <= jugador.puja_actual:
        return Response({'error': 'El nuevo monto debe ser mayor a la puja actual'}, status=400)

    # Calcular diferencia
    diferencia = nuevo_monto - puja.monto

    if equipo.presupuesto < diferencia:
        return Response({'error': 'Presupuesto insuficiente para aumentar la puja'}, status=400)

    try:
        with transaction.atomic():
            # Actualizar la puja
            puja_anterior = puja.monto
            puja.monto = nuevo_monto
            puja.fecha_puja = timezone.now()
            puja.save()

            # Actualizar puja actual del jugador
            jugador.puja_actual = nuevo_monto
            jugador.equipo_pujador = equipo
            jugador.save()

            # Restar diferencia del presupuesto
            equipo.presupuesto -= diferencia
            equipo.save()

            print(f"✅ Puja actualizada: €{puja_anterior} -> €{nuevo_monto}. Diferencia: €{diferencia}")

        return Response({
            'success': True,
            'message': 'Puja actualizada correctamente',
            'nuevo_monto': nuevo_monto,
            'nuevo_presupuesto': equipo.presupuesto
        })

    except Exception as e:
        print(f"❌ Error editando puja: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Error interno del servidor: {str(e)}'}, 
            status=500
        )