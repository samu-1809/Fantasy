from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from ..models import Equipo, Jugador, Liga, Oferta, EquipoReal, Notificacion
from ..serializers import EquipoRealSerializer, EquipoSerializer, JugadorSerializer

def crear_notificacion_distribucion_dinero(monto_total, jornada=None):
    """Crea una notificación pública de distribución de dinero"""
    mensaje = f'Se ha repartido un total de {monto_total}€ al final de la jornada'
    if jornada:
        mensaje += f' {jornada.numero}'
    
    return Notificacion.objects.create(
        tipo='publica',
        categoria='distribucion_dinero',
        titulo='Distribución de dinero',
        mensaje=mensaje
    )

def crear_notificacion_traspaso(jugador, equipo_origen, equipo_destino):
    """Crea una notificación pública de traspaso"""
    return Notificacion.objects.create(
        tipo='publica',
        categoria='traspaso',
        titulo=f'Traspaso: {jugador.nombre}',
        mensaje=f'{jugador.nombre} se traspasa de {equipo_origen.nombre} a {equipo_destino.nombre}'
    )

def crear_notificacion_oferta_rechazada(jugador, ofertante):
    """Crea una notificación privada de oferta rechazada"""
    return Notificacion.objects.create(
        tipo='privada',
        categoria='oferta_rechazada',
        titulo='Oferta rechazada',
        mensaje=f'Tu oferta por {jugador.nombre} ha sido rechazada',
        destinatario=ofertante.usuario
    )

def crear_notificacion_publica(categoria, titulo, mensaje, objeto_relacionado=None):
    """Crea una notificación pública"""
    notificacion = Notificacion.objects.create(
        tipo='publica',
        categoria=categoria,
        titulo=titulo,
        mensaje=mensaje,
        objeto_relacionado=objeto_relacionado
    )
    return notificacion

def crear_notificacion_privada(destinatario, categoria, titulo, mensaje, objeto_relacionado=None):
    """Crea una notificación privada para un usuario específico"""
    notificacion = Notificacion.objects.create(
        tipo='privada',
        categoria=categoria,
        titulo=titulo,
        mensaje=mensaje,
        destinatario=destinatario,
        objeto_relacionado=objeto_relacionado
    )
    return notificacion

def crear_notificacion_oferta_editada(jugador, ofertante, monto_anterior, monto_nuevo):
    """Crea una notificación privada de oferta editada"""
    return Notificacion.objects.create(
        tipo='privada',
        categoria='oferta_editada',
        titulo='Oferta editada',
        mensaje=f'Has editado tu oferta por {jugador.nombre} de {monto_anterior}€ a {monto_nuevo}€',
        destinatario=ofertante.usuario
    )

def crear_notificacion_oferta_retirada(jugador, ofertante, monto):
    """Crea una notificación privada de oferta retirada"""
    return Notificacion.objects.create(
        tipo='privada',
        categoria='oferta_retirada',
        titulo='Oferta retirada',
        mensaje=f'Has retirado tu oferta por {jugador.nombre} de {monto}€. El dinero ha sido devuelto a tu presupuesto.',
        destinatario=ofertante.usuario
    )

def notificar_fichaje_global(jugador, equipo):
    """
    Notifica a todos los usuarios de la liga sobre un fichaje.
    Envía notificación a todos EXCEPTO al equipo que fichó al jugador.
    """
    liga = equipo.liga
    usuarios = Equipo.objects.filter(liga=liga).exclude(id=equipo.id).values_list('usuario', flat=True)

    for usuario_id in usuarios:
        Notificacion.objects.create(
            destinatario_id=usuario_id,
            tipo='publica',
            categoria='fichaje_global',
            titulo='🔔 Nuevo fichaje',
            mensaje=f'{equipo.nombre} ha fichado a {jugador.nombre}',
            leida=False
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def datos_iniciales(request):
    try:
        print(f"🎯 Cargando datos iniciales para usuario: {request.user.username}")
        print(f"🔐 Usuario ID: {request.user.id}, Email: {request.user.email}")
        
        # DEBUG: Verificar si el usuario tiene equipo
        equipo_existente = Equipo.objects.filter(usuario=request.user).first()
        print(f"🔍 Búsqueda de equipo: {equipo_existente}")
        
        if request.user.is_superuser or request.user.is_staff:
            print(f"🛠️ Cargando datos para ADMIN: {request.user.username}")
            
            jugadores = Jugador.objects.all().select_related('equipo_real', 'equipo', 'equipo__usuario')
            jugadores_data = JugadorSerializer(jugadores, many=True).data
            
            equipos_reales = EquipoReal.objects.all()
            equipos_reales_data = EquipoRealSerializer(equipos_reales, many=True).data
            
            print(f"🛠️ Admin - Jugadores cargados: {len(jugadores_data)}")
            
            return Response({
                'usuario': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email,
                    'is_staff': request.user.is_staff,
                    'is_superuser': request.user.is_superuser
                },
                'jugadores': jugadores_data,
                'equipos_reales': equipos_reales_data,
                'es_admin': True,
                'ligaActual': {
                    'id': 1,
                    'nombre': 'Liga de Administración',
                    'jornada_actual': 1
                }
            })
        
        # 🎯 PARA USUARIOS NORMALES - CORREGIDO
        print(f"👤 Cargando datos para USUARIO NORMAL: {request.user.username}")
        
        # Buscar equipo del usuario
        equipo = Equipo.objects.filter(usuario=request.user).first()
        
        if not equipo:
            print(f"❌ ERROR: No se encontró equipo para usuario {request.user.username}")
            print(f"🔍 Intentando crear equipo automáticamente...")
            
            try:
                from django.db import transaction
                with transaction.atomic():
                    # Buscar una liga disponible
                    liga_default = Liga.objects.first()
                    if not liga_default:
                        liga_default = Liga.objects.create(
                            nombre="Liga Principal",
                            jornada_actual=1
                        )
                        print(f"✅ Liga creada: {liga_default.nombre}")
                    
                    # Crear equipo para el usuario
                    equipo = Equipo.objects.create(
                        usuario=request.user,
                        nombre=f"Equipo de {request.user.username}",
                        liga=liga_default,
                        presupuesto=100000000,  # 100M
                        puntos_totales=0
                    )
                    print(f"✅ Equipo creado automáticamente: {equipo.nombre} (ID: {equipo.id})")
                    
            except Exception as e:
                print(f"❌ Error creando equipo automático: {e}")
                return Response(
                    {"error": f"No se pudo crear el equipo automáticamente: {str(e)}"}, 
                    status=500
                )
        else:
            print(f"✅ Equipo encontrado: {equipo.nombre} (ID: {equipo.id})")
            print(f"🏆 Liga del equipo: {equipo.liga.nombre} (ID: {equipo.liga.id})")
        
        # 🎯 SERIALIZAR EQUIPO CON TU SERIALIZER
        equipo_data = EquipoSerializer(equipo).data
        print(f"📊 Equipo serializado - ID: {equipo_data.get('id')}, Nombre: {equipo_data.get('nombre')}")
        print(f"📊 Equipo serializado - Liga: {equipo_data.get('liga_nombre')}")
        print(f"📊 Equipo serializado - Presupuesto: {equipo_data.get('presupuesto')}")
        
        # 🎯 CARGAR JUGADORES DEL EQUIPO
        jugadores = Jugador.objects.filter(equipo=equipo)
        print(f"👥 Jugadores en el equipo: {jugadores.count()}")
        
        # Si no hay jugadores, crear algunos por defecto
        if jugadores.count() == 0:
            print(f"⚠️ No hay jugadores en el equipo. Creando jugadores por defecto...")
            try:
                # Buscar algunos jugadores libres para asignar
                jugadores_libres = Jugador.objects.filter(equipo__isnull=True)[:5]
                for jugador in jugadores_libres:
                    jugador.equipo = equipo
                    jugador.save()
                print(f"✅ {jugadores_libres.count()} jugadores asignados al equipo")
                # Recargar jugadores
                jugadores = Jugador.objects.filter(equipo=equipo)
            except Exception as e:
                print(f"⚠️ Error asignando jugadores: {e}")
        
        jugadores_data = JugadorSerializer(jugadores, many=True).data
        print(f"📊 Jugadores serializados: {len(jugadores_data)}")
        
        # 🎯 CARGAR MERCADO (jugadores sin equipo)
        mercado_data = []
        try:
            mercado_jugadores = Jugador.objects.filter(
                equipo__isnull=True
            ).order_by('?')[:8]
            mercado_data = JugadorSerializer(mercado_jugadores, many=True).data
            print(f"🛒 Jugadores en mercado: {len(mercado_data)}")
        except Exception as e:
            print(f"⚠️ Error cargando mercado: {e}")
            mercado_data = []
        
        # 🎯 CARGAR CLASIFICACIÓN MEJORADA
        clasificacion_data = []
        try:
            equipos_liga = Equipo.objects.filter(liga=equipo.liga)
            print(f"🏅 Equipos en la liga: {equipos_liga.count()}")
            
            clasificacion = []
            for eq in equipos_liga:
                # Calcular puntos totales sumando puntos de todos los jugadores
                puntos_totales = sum(j.puntos_totales for j in eq.jugadores.all())
                clasificacion.append({
                    'equipo_id': eq.id,
                    'nombre': eq.nombre,  # 🎯 clave 'nombre' para coincidir con frontend
                    'usuario': eq.usuario.username,
                    'puntos_totales': puntos_totales,
                    'presupuesto': eq.presupuesto
                })
            
            # Ordenar por puntos (mayor a menor)
            clasificacion.sort(key=lambda x: x['puntos_totales'], reverse=True)
            
            # Asignar posiciones
            for idx, item in enumerate(clasificacion, 1):
                item['posicion'] = idx
            
            clasificacion_data = clasificacion
            print(f"📈 Clasificación calculada: {len(clasificacion_data)} equipos")
            
        except Exception as e:
            print(f"⚠️ Error cargando clasificación: {e}")
            clasificacion_data = []
        
        # 🎯 ESTRUCTURA FINAL CORREGIDA
        response_data = {
            'usuario': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'is_staff': request.user.is_staff,
                'is_superuser': request.user.is_superuser
            },
            'equipo': equipo_data,
            'jugadores': jugadores_data,
            'mercado': mercado_data,
            'clasificacion': clasificacion_data,
            'liga_id': equipo.liga.id,
            'ligaActual': {
                'id': equipo.liga.id,
                'nombre': equipo.liga.nombre,
                'jornada_actual': equipo.liga.jornada_actual
            },
            'es_admin': False,
            'presupuesto': equipo.presupuesto
        }
        
        print(f"✅ Datos iniciales preparados para {request.user.username}")
        print(f"📦 Resumen respuesta:")
        print(f"   - Equipo: {equipo_data.get('nombre')}")
        print(f"   - Jugadores: {len(jugadores_data)}")
        print(f"   - Liga: {response_data['ligaActual']['nombre']}")
        print(f"   - Presupuesto: {equipo.presupuesto}")
        
        return Response(response_data)
        
    except Exception as e:
        print(f"❌ ERROR CRÍTICO en datos_iniciales: {str(e)}")
        import traceback
        print(f"📋 Traceback completo: {traceback.format_exc()}")
        
        return Response(
            {"error": "Error interno del servidor al cargar datos iniciales: " + str(e)}, 
            status=500
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
    if not request.user.is_superuser:
        return Response({'error': 'Solo administradores pueden ejecutar esta acción'}, status=403)
    
    ahora = timezone.now()
    limite_expiracion = ahora - timedelta(hours=24)
    
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