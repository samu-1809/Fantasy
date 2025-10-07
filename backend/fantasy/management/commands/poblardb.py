from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from fantasy.models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, Alineacion
import random
from datetime import datetime, timedelta
from decimal import Decimal

class Command(BaseCommand):
    help = 'Poblar la base de datos con datos de prueba extensos'

    def handle(self, *args, **kwargs):
        self.stdout.write('🏗️ Creando datos de prueba extensos...')

        # Limpiar datos existentes (opcional - cuidado en producción)
        # self.clean_database()

        # Crear liga principal
        liga = self.crear_liga()
        
        # Crear equipos reales
        equipos_reales = self.crear_equipos_reales()
        
        # Crear JUGADORES MASIVOS (mínimo 100+)
        total_jugadores = self.crear_jugadores_masivos(equipos_reales)
        
        # Crear usuario admin
        self.crear_usuario_admin()
        
        # Crear jornadas y partidos
        self.crear_calendario_completo(liga, equipos_reales)
        
        # Mostrar estadísticas finales
        self.mostrar_estadisticas()

    def clean_database(self):
        """Opcional: Limpiar base de datos (CUIDADO en producción)"""
        self.stdout.write('🧹 Limpiando base de datos...')
        Jugador.objects.all().delete()
        Equipo.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    def crear_liga(self):
        """Crear liga principal"""
        liga, created = Liga.objects.get_or_create(
            codigo='PRINCIPAL',
            defaults={
                'nombre': 'Liga Principal Fantasy',
                'jornada_actual': 1
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Liga creada: {liga.nombre}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Liga ya existe: {liga.nombre}'))
        return liga

    def crear_equipos_reales(self):
        """Crear equipos reales para asignar a jugadores"""
        equipos_reales_nombres = [
            'Makilakixki', 'Botafumeiro', 'Shalke', 'Viseu', 
            'San Zoilo', 'Aibares', 'Spolka', 'Internacional',
            'Barcelona', 'Real Madrid', 'Atlético', 'Sevilla',
            'Valencia', 'Athletic', 'Villarreal', 'Real Sociedad'
        ]
        
        equipos_reales = []
        for nombre in equipos_reales_nombres:
            equipo_real, created = EquipoReal.objects.get_or_create(nombre=nombre)
            equipos_reales.append(equipo_real)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Equipo real creado: {nombre}'))
        
        return equipos_reales

    def crear_jugadores_masivos(self, equipos_reales):
        """Crear una gran cantidad de jugadores para permitir muchos equipos"""
        self.stdout.write('\n🎯 Creando jugadores masivos...')
        
        # Nombres y apellidos para generar combinaciones realistas
        nombres = [
            'Carlos', 'Sergio', 'Fernando', 'Miguel', 'Roberto', 'Antonio', 'Luis', 'Jorge',
            'Manuel', 'Andrés', 'Diego', 'Alberto', 'Francisco', 'Javier', 'Raúl', 'Marcos',
            'Iván', 'Gabriel', 'David', 'Pablo', 'Ricardo', 'Ángel', 'Daniel', 'Pedro',
            'Lucas', 'Adrián', 'Mario', 'Juan', 'José', 'Álvaro', 'Rubén', 'Jesús'
        ]
        
        apellidos = [
            'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Fernández', 'Pérez',
            'Sánchez', 'Ramírez', 'Torres', 'Díaz', 'Vázquez', 'Romero', 'Suárez', 'Muñoz',
            'Iglesias', 'Santos', 'Castro', 'Ortega', 'Delgado', 'Peña', 'Rojas', 'Mora'
        ]
        
        posiciones = ['POR', 'DEF', 'DEL']
        
        # Crear jugadores en diferentes rangos de precio
        rangos_precio = [
            # (min_valor, max_valor, cantidad, descripción)
            (1000000, 3000000, 40, 'Económicos'),      # Jugadores baratos
            (3000000, 6000000, 50, 'Medios'),          # Jugadores promedio  
            (6000000, 9000000, 30, 'Caros'),           # Jugadores caros
            (9000000, 15000000, 20, 'Premium'),        # Jugadores estrella
        ]
        
        jugadores_creados = 0
        
        for min_valor, max_valor, cantidad, descripcion in rangos_precio:
            self.stdout.write(f'🎯 Creando {cantidad} jugadores {descripcion}...')
            
            for i in range(cantidad):
                # Generar nombre único
                nombre = f"{random.choice(nombres)} {random.choice(apellidos)}"
                contador = 1
                while Jugador.objects.filter(nombre=nombre).exists():
                    nombre = f"{random.choice(nombres)} {random.choice(apellidos)} {contador}"
                    contador += 1
                
                # Crear jugador
                jugador = Jugador.objects.create(
                    nombre=nombre,
                    posicion=random.choice(posiciones),
                    valor=round(random.uniform(min_valor, max_valor), 2),
                    puntos_totales=random.randint(0, 80),
                    equipo_real=random.choice(equipos_reales),
                    en_venta=False
                )
                
                jugadores_creados += 1
                
                if jugadores_creados % 20 == 0:  # Mostrar progreso cada 20 jugadores
                    self.stdout.write(f'   ✅ {jugadores_creados} jugadores creados...')
        
        self.stdout.write(self.style.SUCCESS(f'\n🎉 Total jugadores creados: {jugadores_creados}'))
        return jugadores_creados

    def crear_usuario_admin(self):
        """Crear usuario administrador"""
        user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@fantasy.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            user.set_password('admin')
            user.save()
            self.stdout.write(self.style.SUCCESS('✓ Usuario admin creado: admin / admin123'))
        else:
            self.stdout.write(self.style.WARNING('⚠ Usuario admin ya existe'))

    def crear_calendario_completo(self, liga, equipos_reales):
        """Crear jornadas y partidos completos"""
        self.stdout.write('\n📅 Creando calendario completo...')
        
        # Crear 10 jornadas
        for i in range(1, 11):
            jornada, created = Jornada.objects.get_or_create(numero=i)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Jornada {i} creada'))
                
                # Crear partidos para esta jornada
                self.crear_partidos_jornada(jornada, equipos_reales)

    def crear_partidos_jornada(self, jornada, equipos_reales):
        """Crear partidos para una jornada"""
        # Mezclar equipos para emparejamientos aleatorios
        equipos_mezclados = equipos_reales.copy()
        random.shuffle(equipos_mezclados)
        
        # Crear partidos (máximo 8 partidos por jornada)
        for i in range(0, min(len(equipos_mezclados), 16), 2):
            if i + 1 < len(equipos_mezclados):
                local = equipos_mezclados[i]
                visitante = equipos_mezclados[i + 1]
                
                # Fecha aleatoria en el futuro
                fecha_base = datetime.now() + timedelta(days=random.randint(1, 60))
                
                partido, created = Partido.objects.get_or_create(
                    jornada=jornada,
                    equipo_local=local,
                    equipo_visitante=visitante,
                    defaults={
                        'fecha': fecha_base,
                        'goles_local': random.randint(0, 5) if random.random() > 0.3 else 0,
                        'goles_visitante': random.randint(0, 5) if random.random() > 0.3 else 0,
                        'jugado': random.random() > 0.7  # 30% de partidos jugados
                    }
                )
                
                if created:
                    self.stdout.write(f'   ⚽ {local.nombre} vs {visitante.nombre}')

    def mostrar_estadisticas(self):
        """Mostrar estadísticas finales de la base de datos"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('📊 ESTADÍSTICAS FINALES DE LA BASE DE DATOS'))
        self.stdout.write('='*60)
        
        stats = {
            'Usuarios': User.objects.count(),
            'Ligas': Liga.objects.count(),
            'Equipos Reales': EquipoReal.objects.count(),
            'Jugadores Totales': Jugador.objects.count(),
            'Jugadores Disponibles': Jugador.objects.filter(equipo__isnull=True).count(),
            'Equipos Fantasy': Equipo.objects.count(),
            'Jornadas': Jornada.objects.count(),
            'Partidos': Partido.objects.count(),
        }
        
        for item, cantidad in stats.items():
            self.stdout.write(self.style.SUCCESS(f'   • {item}: {cantidad}'))
        
        # Estadísticas de jugadores por posición
        self.stdout.write('\n🎯 JUGADORES POR POSICIÓN:')
        for posicion in ['POR', 'DEF', 'DEL']:
            count = Jugador.objects.filter(posicion=posicion).count()
            disponibles = Jugador.objects.filter(posicion=posicion, equipo__isnull=True).count()
            self.stdout.write(f'   • {posicion}: {count} totales, {disponibles} disponibles')
        
        # Rango de precios de jugadores disponibles
        jugadores_disponibles = Jugador.objects.filter(equipo__isnull=True)
        if jugadores_disponibles.exists():
            precios = [float(j.valor) for j in jugadores_disponibles]
            self.stdout.write(f'\n💰 RANGO DE PRECIOS: €{min(precios):,.0f} - €{max(precios):,.0f}')
            self.stdout.write(f'   Precio promedio: €{sum(precios)/len(precios):,.0f}')
        
        self.stdout.write('\n🎮 INSTRUCCIONES PARA PROBAR:')
        self.stdout.write('   1. Registra nuevos usuarios → Se crearán equipos automáticamente')
        self.stdout.write('   2. Cada equipo tendrá 7 jugadores (1 POR, 3 DEF, 3 DEL)')
        self.stdout.write('   3. Presupuesto inicial: €50M')
        self.stdout.write('   4. Los equipos cuestan entre €25M-€30M')
        self.stdout.write('   5. ¡Puedes crear muchos equipos diferentes!')