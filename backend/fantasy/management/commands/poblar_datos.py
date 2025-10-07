from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from fantasy.models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, Alineacion
import random
from datetime import datetime, timedelta
from decimal import Decimal

class Command(BaseCommand):
    help = 'Poblar la base de datos con datos de prueba'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creando datos de prueba...')

        # Crear liga
        liga, created = Liga.objects.get_or_create(
            codigo='PRINCIPAL',
            defaults={
                'nombre': 'Liga Principal',
                'jornada_actual': 1
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Liga creada: {liga.nombre}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Liga ya existe: {liga.nombre}'))

        # Crear equipos reales
        equipos_reales_nombres = [
            'Makilakixki', 'Botafumeiro','Shalke','Viseu','San Zoilo','Aibares','Spolka','Internacional'
        ]
        
        equipos_reales = []
        for nombre in equipos_reales_nombres:
            equipo_real, created = EquipoReal.objects.get_or_create(nombre=nombre)
            equipos_reales.append(equipo_real)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Equipo real creado: {nombre}'))
            else:
                self.stdout.write(self.style.WARNING(f'⚠ Equipo real ya existe: {nombre}'))

        # Crear jugadores base (30 jugadores)
        nombres_porteros = [
            'Carlos Martínez', 'Sergio López', 'Fernando Castro', 'Miguel Ángel', 
            'Roberto Silva', 'Antonio Pérez'
        ]
        
        nombres_defensas = [
            'Luis Fernández', 'Jorge Ruiz', 'Manuel Sánchez', 'Andrés Moreno',
            'Diego Herrera', 'Alberto Ramírez', 'Francisco Vega', 'Javier Castro',
            'Raúl González', 'Marcos Ortiz', 'Iván Romero', 'Gabriel Núñez'
        ]
        
        nombres_delanteros = [
            'David Torres', 'Pablo García', 'Ricardo Jiménez', 'Alberto Díaz',
            'Roberto Silva', 'Ángel Medina', 'Daniel Vargas', 'Sergio Molina',
            'Pedro Campos', 'Lucas Domínguez', 'Adrián Reyes', 'Mario Suárez'
        ]

        # Crear porteros base
        for nombre in nombres_porteros:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor = random.uniform(6000000, 9000000)
                Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.PORTERO,
                    valor=round(valor, 2),
                    puntos_totales=random.randint(5, 30),
                    equipo_real=random.choice(equipos_reales),
                    en_venta=False
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Portero base creado: {nombre}'))

        # Crear defensas base
        for nombre in nombres_defensas:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor = random.uniform(5000000, 8000000)
                Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.DEFENSA,
                    valor=round(valor, 2),
                    puntos_totales=random.randint(5, 30),
                    equipo_real=random.choice(equipos_reales),
                    en_venta=False
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Defensa base creado: {nombre}'))

        # Crear delanteros base
        for nombre in nombres_delanteros:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor = random.uniform(7000000, 12000000)
                Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.DELANTERO,
                    valor=round(valor, 2),
                    puntos_totales=random.randint(5, 30),
                    equipo_real=random.choice(equipos_reales),
                    en_venta=False
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Delantero base creado: {nombre}'))

        # CREAR JUGADORES ESPECÍFICAMENTE DISPONIBLES PARA FICHAR
        self.stdout.write('\n🎯 Creando jugadores disponibles para fichar...')
        
        jugadores_disponibles_data = [
            # Porteros disponibles
            {'nombre': 'Iker Disponible', 'posicion': Jugador.PORTERO, 'valor': 7500000},
            {'nombre': 'David Disponible', 'posicion': Jugador.PORTERO, 'valor': 6800000},
            
            # Defensas disponibles  
            {'nombre': 'Carlos Disponible', 'posicion': Jugador.DEFENSA, 'valor': 6200000},
            {'nombre': 'Javier Disponible', 'posicion': Jugador.DEFENSA, 'valor': 5800000},
            {'nombre': 'Sergio Disponible', 'posicion': Jugador.DEFENSA, 'valor': 6100000},
            {'nombre': 'Marcos Disponible', 'posicion': Jugador.DEFENSA, 'valor': 5900000},
            
            # Delanteros disponibles
            {'nombre': 'Juan Disponible', 'posicion': Jugador.DELANTERO, 'valor': 8200000},
            {'nombre': 'Pedro Disponible', 'posicion': Jugador.DELANTERO, 'valor': 7800000},
            {'nombre': 'Luis Disponible', 'posicion': Jugador.DELANTERO, 'valor': 8500000},
            {'nombre': 'Miguel Disponible', 'posicion': Jugador.DELANTERO, 'valor': 7900000},
        ]
        
        for jugador_data in jugadores_disponibles_data:
            if not Jugador.objects.filter(nombre=jugador_data['nombre']).exists():
                jugador = Jugador.objects.create(
                    nombre=jugador_data['nombre'],
                    posicion=jugador_data['posicion'],
                    valor=jugador_data['valor'],
                    puntos_totales=random.randint(15, 45),
                    equipo_real=random.choice(equipos_reales),
                    en_venta=False  # Importante: disponibles pero no en venta específica
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Jugador disponible: {jugador.nombre} - €{jugador.valor:,.0f}'))

        # Crear usuario de prueba
        user, created = User.objects.get_or_create(
            username='testuser',
            defaults={'email': 'test@example.com'}
        )
        if created:
            user.set_password('test1234')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'✓ Usuario creado: testuser (password: test1234)'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Usuario ya existe: testuser'))

        # Crear equipo de prueba
        equipo, created = Equipo.objects.get_or_create(
            usuario=user,
            liga=liga,
            defaults={
                'nombre': 'Mi Equipo de Prueba',
                'presupuesto': 35000000
            }
        )
        
        if created:
            # ASIGNAR JUGADORES BASE AL EQUIPO (no los "Disponible")
            portero = Jugador.objects.filter(
                posicion=Jugador.PORTERO,
                nombre__icontains='Carlos'  # Usar nombres base
            ).first()
            
            defensas = Jugador.objects.filter(
                posicion=Jugador.DEFENSA,
                nombre__icontains='Luis'
            )[:2]
            
            delanteros = Jugador.objects.filter(
                posicion=Jugador.DELANTERO,
                nombre__icontains='David'
            )[:2]
            
            # Verificar que tenemos jugadores para asignar
            jugadores_a_asignar = []
            if portero:
                jugadores_a_asignar.append(portero)
                self.stdout.write(self.style.SUCCESS(f'✓ Portero asignado: {portero.nombre}'))
            
            if defensas:
                jugadores_a_asignar.extend(defensas)
                for defensa in defensas:
                    self.stdout.write(self.style.SUCCESS(f'✓ Defensa asignado: {defensa.nombre}'))
            
            if delanteros:
                jugadores_a_asignar.extend(delanteros)
                for delantero in delanteros:
                    self.stdout.write(self.style.SUCCESS(f'✓ Delantero asignado: {delantero.nombre}'))
            
            if jugadores_a_asignar:
                equipo.jugadores.add(*jugadores_a_asignar)
                self.stdout.write(self.style.SUCCESS(f'✓ Equipo creado: {equipo.nombre} con {len(jugadores_a_asignar)} jugadores'))
            else:
                self.stdout.write(self.style.ERROR('❌ No se encontraron jugadores para asignar al equipo'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Equipo ya existe: {equipo.nombre}'))

        # CREAR JUGADORES EN VENTA (de equipos existentes)
        self.stdout.write('\n🏪 Creando jugadores en venta...')
        
        # Seleccionar algunos jugadores que ya están en equipos para poner en venta
        if equipo.jugadores.exists():
            jugadores_en_equipo = list(equipo.jugadores.all())
            jugadores_para_venta = random.sample(jugadores_en_equipo, min(3, len(jugadores_en_equipo)))
            
            for jugador in jugadores_para_venta:
                # Incrementar el valor para la venta
                nuevo_valor = float(jugador.valor) * random.uniform(1.2, 1.8)
                jugador.en_venta = True
                jugador.valor = round(nuevo_valor, 2)
                jugador.save()
                self.stdout.write(self.style.SUCCESS(f'✓ Jugador en venta: {jugador.nombre} - €{jugador.valor:,.0f}'))

        # Crear jornadas de ejemplo
        for i in range(1, 6):
            jornada, created = Jornada.objects.get_or_create(
                numero=i,
                defaults={}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Jornada creada: {i}'))

        # Crear partidos de ejemplo para la jornada 1
        jornada1 = Jornada.objects.get(numero=1)
        
        partidos_ejemplo = [
            (equipos_reales[0], equipos_reales[1]),
            (equipos_reales[2], equipos_reales[3]),
            (equipos_reales[4], equipos_reales[5]),
            (equipos_reales[6], equipos_reales[7]),
        ]

        fecha_base = datetime.now() + timedelta(days=1)
        
        for i, (local, visitante) in enumerate(partidos_ejemplo):
            if not Partido.objects.filter(jornada=jornada1, equipo_local=local, equipo_visitante=visitante).exists():
                partido = Partido.objects.create(
                    jornada=jornada1,
                    equipo_local=local,
                    equipo_visitante=visitante,
                    fecha=fecha_base + timedelta(hours=i*3),
                    goles_local=random.randint(0, 5),
                    goles_visitante=random.randint(0, 5),
                    jugado=True
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Partido creado: {local} vs {visitante}'))

        # Actualizar puntos totales de jugadores
        self.stdout.write('\n📊 Actualizando puntos de jugadores...')
        jugadores_con_puntos = Jugador.objects.all()[:15]
        for jugador in jugadores_con_puntos:
            nuevos_puntos = random.randint(10, 60)
            jugador.puntos_totales = nuevos_puntos
            jugador.save()
            self.stdout.write(self.style.SUCCESS(f'✓ Puntos actualizados: {jugador.nombre} ({jugador.puntos_totales} pts)'))

        # Crear alineaciones automáticamente
        self.stdout.write('\n⚽ Creando alineaciones automáticamente...')
        equipos = Equipo.objects.all()
        for equipo in equipos:
            alineacion, created = Alineacion.objects.get_or_create(equipo=equipo)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Alineación creada para: {equipo.nombre}'))

        # VERIFICACIÓN FINAL
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('✅ DATOS CREADOS EXITOSAMENTE!'))
        self.stdout.write('='*50)
        
        # Estadísticas finales
        total_jugadores = Jugador.objects.count()
        jugadores_con_equipo = Jugador.objects.filter(equipo__isnull=False).count()
        jugadores_sin_equipo = Jugador.objects.filter(equipo__isnull=True).count()
        jugadores_en_venta = Jugador.objects.filter(en_venta=True).count()
        jugadores_disponibles = Jugador.objects.filter(equipo__isnull=True, en_venta=False).count()
        
        self.stdout.write(self.style.SUCCESS(f'📊 ESTADÍSTICAS FINALES:'))
        self.stdout.write(f'   • Total jugadores: {total_jugadores}')
        self.stdout.write(f'   • Jugadores con equipo: {jugadores_con_equipo}')
        self.stdout.write(f'   • Jugadores sin equipo: {jugadores_sin_equipo}')
        self.stdout.write(f'   • Jugadores en venta: {jugadores_en_venta}')
        self.stdout.write(f'   • Jugadores disponibles para fichar: {jugadores_disponibles}')
        
        # Mostrar IDs de jugadores disponibles para facilitar las pruebas
        if jugadores_disponibles > 0:
            self.stdout.write('\n🎯 JUGADORES DISPONIBLES PARA FICHAR (IDs):')
            disponibles = Jugador.objects.filter(equipo__isnull=True, en_venta=False)
            for jugador in disponibles:
                self.stdout.write(f'   • ID {jugador.id}: {jugador.nombre} ({jugador.posicion}) - €{jugador.valor:,.0f}')
        
        self.stdout.write(f'\n💡 Para probar el fichaje, usa uno de los IDs mostrados arriba')
        self.stdout.write(f'🔧 Usuario de prueba: testuser / test1234')
        self.stdout.write(f'🏆 Equipo ID: {equipo.id}')