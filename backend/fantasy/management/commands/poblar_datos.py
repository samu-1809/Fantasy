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

        # Crear jugadores (30 jugadores)
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

        # Crear porteros
        for nombre in nombres_porteros:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor = random.uniform(6000000, 9000000)
                Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.PORTERO,
                    valor=round(valor, 2),
                    puntos_totales=0,
                    equipo_real=random.choice(equipos_reales)
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Portero creado: {nombre}'))

        # Crear defensas
        for nombre in nombres_defensas:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor = random.uniform(5000000, 8000000)
                Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.DEFENSA,
                    valor=round(valor, 2),
                    puntos_totales=0,
                    equipo_real=random.choice(equipos_reales)
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Defensa creado: {nombre}'))

        # Crear delanteros
        for nombre in nombres_delanteros:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor = random.uniform(7000000, 12000000)
                Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.DELANTERO,
                    valor=round(valor, 2),
                    puntos_totales=0,
                    equipo_real=random.choice(equipos_reales)
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Delantero creado: {nombre}'))

        # Poner 8 jugadores sin equipo en el mercado
        self.stdout.write('\n🏪 Añadiendo jugadores sin equipo al mercado...')

        # Crear 8 jugadores adicionales SIN EQUIPO para el mercado
        nombres_extra_porteros = ['Portero Mercado 1', 'Portero Mercado 2']
        nombres_extra_defensas = ['Defensa Mercado 1', 'Defensa Mercado 2', 'Defensa Mercado 3']
        nombres_extra_delanteros = ['Delantero Mercado 1', 'Delantero Mercado 2', 'Delantero Mercado 3']

        # Crear porteros extra para el mercado
        for nombre in nombres_extra_porteros:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor_base = random.uniform(6000000, 9000000)
                jugador = Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.PORTERO,
                    valor=round(valor_base, 2),
                    puntos_totales=random.randint(5, 30),
                    equipo_real=None,
                    en_venta=True
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Portero en mercado: {nombre} - €{jugador.valor:,.0f}'))

        # Crear defensas extra para el mercado
        for nombre in nombres_extra_defensas:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor_base = random.uniform(5000000, 8000000)
                jugador = Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.DEFENSA,
                    valor=round(valor_base, 2),
                    puntos_totales=random.randint(5, 30),
                    equipo_real=None,
                    en_venta=True
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Defensa en mercado: {nombre} - €{jugador.valor:,.0f}'))

        # Crear delanteros extra para el mercado
        for nombre in nombres_extra_delanteros:
            if not Jugador.objects.filter(nombre=nombre).exists():
                valor_base = random.uniform(7000000, 12000000)
                jugador = Jugador.objects.create(
                    nombre=nombre,
                    posicion=Jugador.DELANTERO,
                    valor=round(valor_base, 2),
                    puntos_totales=random.randint(5, 30),
                    equipo_real=None,
                    en_venta=True
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Delantero en mercado: {nombre} - €{jugador.valor:,.0f}'))

        # Añadir algunos jugadores de equipos existentes al mercado (para venta)
        self.stdout.write('\n🏪 Añadiendo jugadores de equipos al mercado (en venta)...')

        # Buscar jugadores que están en equipos (a través de la relación ManyToMany)
        # Primero, obtener todos los IDs de jugadores que están en algún equipo
        jugadores_en_equipos_ids = Equipo.objects.values_list('jugadores', flat=True).distinct()

        # Seleccionar 3-5 jugadores aleatorios que ya están en equipos para poner en venta
        jugadores_en_equipos = Jugador.objects.filter(
            id__in=jugadores_en_equipos_ids, 
            en_venta=False
        ).order_by('?')[:random.randint(3, 5)]

        for jugador in jugadores_en_equipos:
            # Incrementar el valor para la venta
            nuevo_valor = float(jugador.valor) * random.uniform(1.1, 1.5)
            jugador.en_venta = True
            jugador.valor = round(nuevo_valor, 2)  # Actualizar el valor con el precio de venta
            jugador.save()
            
            # Encontrar a qué equipo pertenece
            equipo_del_jugador = Equipo.objects.filter(jugadores=jugador).first()
            nombre_equipo = equipo_del_jugador.nombre if equipo_del_jugador else "Equipo desconocido"
            
            self.stdout.write(self.style.SUCCESS(f'✓ Jugador en venta: {jugador.nombre} - €{jugador.valor:,.0f} (de {nombre_equipo})'))
        # Crear usuario de prueba si no existe
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

        # Crear equipo de prueba si no existe
        equipo, created = Equipo.objects.get_or_create(
            usuario=user,
            liga=liga,
            defaults={
                'nombre': 'Mi Equipo',
                'presupuesto': 35000000
            }
        )
        
        if created:
            # Asignar 5 jugadores aleatorios al equipo (1 POR, 2 DEF, 2 DEL)
            # Excluir jugadores que ya están en el mercado
            portero = Jugador.objects.filter(posicion=Jugador.PORTERO, en_venta=False).order_by('?').first()
            defensas = list(Jugador.objects.filter(posicion=Jugador.DEFENSA, en_venta=False).order_by('?')[:2])
            delanteros = list(Jugador.objects.filter(posicion=Jugador.DELANTERO, en_venta=False).order_by('?')[:2])
            
            equipo.jugadores.add(portero, *defensas, *delanteros)
            self.stdout.write(self.style.SUCCESS(f'✓ Equipo creado: {equipo.nombre}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Equipo ya existe: {equipo.nombre}'))

        # Crear jornadas de ejemplo
        for i in range(1, 6):
            jornada, created = Jornada.objects.get_or_create(
                numero=i,  # ← Solo número, sin liga
                defaults={}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Jornada creada: {i}'))

        # Crear partidos de ejemplo para la jornada 1
        jornada1 = Jornada.objects.get(numero=1)  # ← Buscar por número, no por liga
        
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

        # Crear algunas puntuaciones de ejemplo
        jugadores_con_puntos = Jugador.objects.order_by('?')[:10]
        for jugador in jugadores_con_puntos:
            jugador.puntos_totales = random.randint(5, 50)
            jugador.save()
            self.stdout.write(self.style.SUCCESS(f'✓ Puntos asignados a: {jugador.nombre} ({jugador.puntos_totales} pts)'))

        self.stdout.write(self.style.SUCCESS('\n✅ Datos de prueba creados exitosamente!'))
        self.stdout.write(f'Total equipos reales: {EquipoReal.objects.count()}')
        self.stdout.write(f'Total jugadores: {Jugador.objects.count()}')
        self.stdout.write(f'Total equipos: {Equipo.objects.count()}')
        self.stdout.write(f'Total jornadas: {Jornada.objects.count()}')
        self.stdout.write(f'Total partidos: {Partido.objects.count()}')
        self.stdout.write('\n⚽ Creando alineaciones automáticamente...')
        equipos = Equipo.objects.all()
        for equipo in equipos:
            alineacion, created = Alineacion.objects.get_or_create(equipo=equipo)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Alineación creada para: {equipo.nombre}'))