from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from fantasy.models import Liga, Jugador, Equipo
import random

class Command(BaseCommand):
    help = 'Poblar la base de datos con datos de prueba'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creando datos de prueba...')

        # Crear liga
        liga, created = Liga.objects.get_or_create(
            codigo='LOCAL2024',
            defaults={
                'nombre': 'Liga Local 2024',
                'presupuesto_inicial': 50000000,
                'jornada_actual': 1
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Liga creada: {liga.nombre}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Liga ya existe: {liga.nombre}'))

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
                    puntos_totales=0
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
                    puntos_totales=0
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
                    puntos_totales=0
                )
                self.stdout.write(self.style.SUCCESS(f'✓ Delantero creado: {nombre}'))

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
            portero = Jugador.objects.filter(posicion=Jugador.PORTERO).order_by('?').first()
            defensas = list(Jugador.objects.filter(posicion=Jugador.DEFENSA).order_by('?')[:2])
            delanteros = list(Jugador.objects.filter(posicion=Jugador.DELANTERO).order_by('?')[:2])
            
            equipo.jugadores.add(portero, *defensas, *delanteros)
            self.stdout.write(self.style.SUCCESS(f'✓ Equipo creado: {equipo.nombre}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Equipo ya existe: {equipo.nombre}'))

        self.stdout.write(self.style.SUCCESS('\n✅ Datos de prueba creados exitosamente!'))
        self.stdout.write(f'Total jugadores: {Jugador.objects.count()}')
        self.stdout.write(f'Total equipos: {Equipo.objects.count()}')