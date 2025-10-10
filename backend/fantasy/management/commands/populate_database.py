from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from fantasy.models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido
import random
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone

class Command(BaseCommand):
    help = 'Poblar la base de datos con datos de prueba extensos'

    def handle(self, *args, **kwargs):
        self.stdout.write('🏗️ Creando datos de prueba extensos...')

        # Limpiar datos existentes
        self.clean_database()

        # Crear liga principal
        liga = self.crear_liga()
        
        # Crear equipos reales
        equipos_reales = self.crear_equipos_reales()
        
        # Crear JUGADORES con los nombres proporcionados
        total_jugadores = self.crear_jugadores_proporcionados(equipos_reales)
    
        # Crear usuario admin
        self.crear_usuario_admin()
        
        # Crear algunos usuarios de prueba con equipos
        self.crear_usuarios_y_equipos_prueba(liga)

        # 🆕 PONER JUGADORES EN EL MERCADO
        self.poner_jugadores_en_mercado()
        
        # Crear jornadas y partidos
        self.crear_calendario_completo(liga, equipos_reales)
        
        # Mostrar estadísticas finales
        self.mostrar_estadisticas()

    def clean_database(self):
        """Limpiar base de datos"""
        self.stdout.write('🧹 Limpiando base de datos...')
        Jugador.objects.all().delete()
        Equipo.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        EquipoReal.objects.all().delete()
        Liga.objects.all().delete()
        Jornada.objects.all().delete()

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
            'Viseu', 'Shalcke', 'Spolka', 'Pizarrin', 
            'Barfleur', 'Pikatostes', 'Botafumeiro', 'Rayo Casedano', 'Makilakixki'
        ]
        
        equipos_reales = []
        for nombre in equipos_reales_nombres:
            equipo_real, created = EquipoReal.objects.get_or_create(nombre=nombre)
            equipos_reales.append(equipo_real)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Equipo real creado: {nombre}'))
        
        return equipos_reales

    def crear_jugadores_proporcionados(self, equipos_reales):
        """Crear jugadores con los nombres proporcionados"""
        self.stdout.write('\n🎯 Creando jugadores proporcionados...')
        
        # Mapeo de equipos reales por nombre
        equipos_dict = {equipo.nombre.lower(): equipo for equipo in equipos_reales}
        
        # Datos de jugadores por equipo
        jugadores_por_equipo = {
            'viseu': [
                'Íñigo Gutiérrez (pt)', 'Pablo Val', 'Óscar Choco', 'Julen La Casa',
                'Martín Gallo', 'Rubén Ingelmo', 'Julen Aranguren', 'Iñaki Jiménez',
                'Adrián Del Castillo', 'Iker Ibáñez', 'Asier Acaro'
            ],
            'shalcke': [
                'Juan Blanco (pt)', 'Xabier Rebole', 'Enaitz Pardo', 'Aimar Ibáñez',
                'Guillermo Ochoa', 'Unai Ojer', 'Germán Bielsa', 'Dani Gallo',
                'David Gil', 'Adrián Navarro', 'Aimar Rebole', 'Lucas Garcés'
            ],
            'spolka': [
                'Andrés Iriarte (pt)', 'Alejandro Sanchillas (pt)', 'Tasio Villacampa (pt)',
                'Adrián Segura', 'Roberto Erro', 'Iñaki Urdin', 'Daniel Montañés',
                'Daniel Mateo', 'Alejandro Jiménez', 'Adrián Echeverri', 'Sergio Jauregui',
                'Toñín Valencia', 'Álvaro Muiños', 'Arkaitz Molero'
            ],
            'pizarrin': [
                'Leandro (pt)', 'Ivan Bandrés', 'Iñaki Arina', 'Xabi Errea', 'Jorge',
                'Eric Molero', 'Sergio Navarro', 'Gonzalo Del Castillo', 'Juan Arbea', 'Samu Arbea'
            ],
            'barfleur': [
                'Íñigo Rebole (pt)', 'Aitzol Puga', 'El Primo de Iván', 'Guti Jr',
                'Francho Jr', 'Teo Villacampa', 'Pablo Pérez', 'Edu Echegoyen', 'Adrián Soteras'
            ],
            'pikatostes': [
                'Aratz Pardo (pt)', 'Belai García', 'Ivan De Lucas', 'Eneko Carreño',
                'Hugo Sarvide', 'Hodei Elizalde', 'Alejandro Urrizelqui'
            ],
            'botafumeiro': [
                'Yeison Granda', 'Steven Granda', 'Adrián Guerrero', 'Erik Choco',
                'Charlie Iriarte', 'Bro Cerijo', 'Maicol', 'Josuxa', 'Jull', 'Marco'
            ],
            'rayo casedano': [
                'Mali (pt)', 'Arturo Jiménez', 'Marcos Jiménez', 'Alin', 'Aritza',
                'Ivan Torrea', 'Daniel Torrea', 'Rodman'
            ],
            'makilakixki': [
                'Adrian Pueyo (pt)', 'Mikel Ruiz (pt)', 'Ander Bandres', 'Asier Bandres', 'Jon Perez', 'Samuel Gomez',
                'Alberto Lecumberri', 'Fermin Ingelmo', 'Oscar Guillen','Alvaro del Castillo','Asier Jimenez',
                'Egoitz Arguiñariz','Aitor Blanco','Ivan Ramos','Miguel Rodrigues', 'Jesus Oiza', 'Gabriel Guallar'
            ]
        }
        
        jugadores_creados = 0
        
        for equipo_nombre, jugadores in jugadores_por_equipo.items():
            equipo_real = equipos_dict.get(equipo_nombre.lower())
            if not equipo_real:
                self.stdout.write(self.style.WARNING(f'⚠ Equipo no encontrado: {equipo_nombre}'))
                continue
            
            self.stdout.write(f'🎯 Creando jugadores para {equipo_nombre}...')
            
            for nombre_jugador in jugadores:
                # Determinar posición y limpiar nombre
                if '(pt)' in nombre_jugador.lower():
                    posicion = 'POR'
                    nombre_limpio = nombre_jugador.replace('(pt)', '').strip()
                else:
                    # Asignar posición aleatoria entre DEF y DEL
                    posicion = random.choice(['DEF', 'DEL'])
                    nombre_limpio = nombre_jugador.strip()
                
                # Asignar valor según posición
                if posicion == 'POR':
                    valor = random.randint(1000000, 5000000)
                elif posicion == 'DEF':
                    valor = random.randint(500000, 8000000)
                else:  # DEL
                    valor = random.randint(1000000, 15000000)
                
                # Crear jugador - 🆕 TODOS los jugadores comienzan SIN equipo
                jugador = Jugador.objects.create(
                    nombre=nombre_limpio,
                    posicion=posicion,
                    valor=valor,
                    puntos_totales=random.randint(0, 80),
                    equipo_real=equipo_real,
                    equipo=None,  # 🆕 IMPORTANTE: Sin equipo fantasy
                    en_venta=False,  # Por defecto no en venta
                    en_banquillo=True
                )
                
                jugadores_creados += 1
            
            self.stdout.write(self.style.SUCCESS(f'   ✅ {len(jugadores)} jugadores creados para {equipo_nombre}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n🎉 Total jugadores creados: {jugadores_creados}'))
        return jugadores_creados

    def poner_jugadores_en_mercado(self):
        """Poner jugadores libres en el mercado automáticamente"""
        self.stdout.write('\n🏪 Poniendo jugadores en el mercado...')
        
        # 🆕 Obtener jugadores libres (sin equipo fantasy)
        jugadores_libres = Jugador.objects.filter(equipo__isnull=True)
        
        # 🆕 Seleccionar al menos 12 jugadores aleatorios para poner en el mercado
        num_jugadores_mercado = min(12, jugadores_libres.count())
        jugadores_para_mercado = random.sample(list(jugadores_libres), num_jugadores_mercado)
        
        for jugador in jugadores_para_mercado:
            jugador.en_venta = True
            jugador.fecha_mercado = timezone.now()
            jugador.save()
            self.stdout.write(f'   ✅ {jugador.nombre} puesto en mercado - {jugador.posicion} - €{jugador.valor:,}')
        
        self.stdout.write(self.style.SUCCESS(f'🎯 {num_jugadores_mercado} jugadores puestos en el mercado'))

    def crear_usuarios_y_equipos_prueba(self, liga):
        """Crear algunos usuarios de prueba con equipos"""
        self.stdout.write('\n👥 Creando usuarios de prueba...')
        
        usuarios_prueba = [
            {'username': 'aaa', 'email': 'manager1@test.com', 'equipo_nombre': 'Los Tigres'},
            {'username': 'aaaa', 'email': 'manager2@test.com', 'equipo_nombre': 'Dragones FC'},
        ]
        
        for usuario_data in usuarios_prueba:
            try:
                user = User.objects.create_user(
                    username=usuario_data['username'],
                    email=usuario_data['email'],
                    password='aaaaaa'
                )
                
                # Crear equipo para el usuario
                equipo = Equipo.objects.create(
                    usuario=user,
                    liga=liga,
                    nombre=usuario_data['equipo_nombre'],
                    presupuesto=50000000
                )
                
                # 🆕 ASIGNAR JUGADORES A ESTE EQUIPO (máximo 7)
                self.asignar_jugadores_a_equipo(equipo)
                
                self.stdout.write(self.style.SUCCESS(f'   ✅ Usuario {usuario_data["username"]} creado con equipo'))
                
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'   ⚠ Error creando usuario {usuario_data["username"]}: {e}'))

    def asignar_jugadores_a_equipo(self, equipo):
        """Asignar jugadores libres a un equipo (1 POR, 3 DEF, 3 DEL)"""
        # 🆕 Buscar jugadores libres por posición
        portero = Jugador.objects.filter(
            equipo__isnull=True, 
            posicion='POR'
        ).order_by('?').first()
        
        defensas = Jugador.objects.filter(
            equipo__isnull=True, 
            posicion='DEF'
        ).order_by('?')[:3]
        
        delanteros = Jugador.objects.filter(
            equipo__isnull=True, 
            posicion='DEL'
        ).order_by('?')[:3]
        
        # Asignar jugadores al equipo
        if portero:
            portero.equipo = equipo
            portero.en_banquillo = False  # Portero titular
            portero.save()
        
        for defensa in defensas:
            if defensa:
                defensa.equipo = equipo
                defensa.en_banquillo = random.choice([True, False])  # Aleatorio banquillo/campo
                defensa.save()
        
        for delantero in delanteros:
            if delantero:
                delantero.equipo = equipo
                delantero.en_banquillo = random.choice([True, False])  # Aleatorio banquillo/campo
                delantero.save()

    def crear_usuario_admin(self):
        """Crear usuario administrador"""
        user, created = User.objects.get_or_create(
            username='admin1',
            defaults={
                'email': 'admin@fantasy.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            user.set_password('admin1')
            user.save()
            self.stdout.write(self.style.SUCCESS('✓ Usuario admin creado: admin / admin'))
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
        
        # Crear partidos (máximo 4 partidos por jornada)
        for i in range(0, min(len(equipos_mezclados), 8), 2):
            if i + 1 < len(equipos_mezclados):
                local = equipos_mezclados[i]
                visitante = equipos_mezclados[i + 1]
                
                # Fecha aleatoria en el futuro
                fecha_base = timezone.now() + timedelta(days=random.randint(1, 60))
                
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
        
        # 🆕 Estadísticas mejoradas del mercado
        jugadores_en_mercado = Jugador.objects.filter(en_venta=True)
        jugadores_libres = Jugador.objects.filter(equipo__isnull=True)
        jugadores_libres_en_mercado = jugadores_libres.filter(en_venta=True)
        
        stats = {
            'Usuarios': User.objects.count(),
            'Ligas': Liga.objects.count(),
            'Equipos Reales': EquipoReal.objects.count(),
            'Jugadores Totales': Jugador.objects.count(),
            'Jugadores Libres (sin equipo)': jugadores_libres.count(),
            'Jugadores en Equipos': Jugador.objects.filter(equipo__isnull=False).count(),
            'JUGADORES EN MERCADO': jugadores_en_mercado.count(),
            'Jugadores Libres en Mercado': jugadores_libres_en_mercado.count(),
            'Equipos Fantasy': Equipo.objects.count(),
            'Jornadas': Jornada.objects.count(),
            'Partidos': Partido.objects.count(),
        }
        
        for item, cantidad in stats.items():
            if 'MERCADO' in item:
                self.stdout.write(self.style.SUCCESS(f'   🎯 {item}: {cantidad}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'   • {item}: {cantidad}'))
        
        # Estadísticas de jugadores por posición
        self.stdout.write('\n🎯 JUGADORES EN MERCADO POR POSICIÓN:')
        for posicion in ['POR', 'DEF', 'DEL']:
            count_total = jugadores_en_mercado.filter(posicion=posicion).count()
            count_libres = jugadores_libres_en_mercado.filter(posicion=posicion).count()
            self.stdout.write(f'   • {posicion}: {count_total} totales, {count_libres} libres')
        
        # Rango de precios de jugadores en mercado
        if jugadores_en_mercado.exists():
            precios = [j.valor for j in jugadores_en_mercado]
            self.stdout.write(f'\n💰 RANGO DE PRECIOS EN MERCADO: €{min(precios):,} - €{max(precios):,}')
            self.stdout.write(f'   Precio promedio: €{sum(precios)/len(precios):,.0f}')
        
        self.stdout.write('\n🎮 INSTRUCCIONES PARA PROBAR:')
        self.stdout.write('   1. Login con: admin/admin o manager1/password123')
        self.stdout.write('   2. Ve al mercado → Deberías ver jugadores disponibles')
        self.stdout.write('   3. Presupuesto inicial: €50M')
        self.stdout.write('   4. ¡Puja por los jugadores que quieras!')