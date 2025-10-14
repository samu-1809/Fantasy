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
        
        # Crear jornadas PRIMERO (para poder crear puntuaciones)
        self.crear_calendario_completo(liga, equipos_reales)
        
        # Crear JUGADORES con los nombres proporcionados
        total_jugadores = self.crear_jugadores_proporcionados(equipos_reales)
    
        # Crear usuario admin
        self.crear_usuario_admin()
        
        # 🆕 CREAR PUNTUACIONES ALEATORIAS PARA LAS PRIMERAS 5 JORNADAS
        self.crear_puntuaciones_aleatorias()
        
        # Mostrar estadísticas finales
        self.mostrar_estadisticas()

    def clean_database(self):
        """Limpiar base de datos"""
        self.stdout.write('🧹 Limpiando base de datos...')
        Puntuacion.objects.all().delete()  # 🆕 Limpiar puntuaciones primero
        Jugador.objects.all().delete()
        Equipo.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        EquipoReal.objects.all().delete()
        Jornada.objects.all().delete()
        Liga.objects.all().delete()

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
                    puntos_totales=0,  # 🆕 Iniciar en 0, se calculará después con las puntuaciones
                    equipo_real=equipo_real,
                    equipo=None,  # 🆕 IMPORTANTE: Sin equipo fantasy
                    en_venta=False,  # Por defecto no en venta
                    en_banquillo=True
                )
                
                jugadores_creados += 1
            
            self.stdout.write(self.style.SUCCESS(f'   ✅ {len(jugadores)} jugadores creados para {equipo_nombre}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n🎉 Total jugadores creados: {jugadores_creados}'))
        return jugadores_creados

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

    def crear_puntuaciones_aleatorias(self):
        """🆕 Crear puntuaciones aleatorias para las primeras 5 jornadas"""
        self.stdout.write('\n📊 Creando puntuaciones aleatorias para las primeras 5 jornadas...')
        
        # Obtener todas las jornadas (1-5)
        jornadas = Jornada.objects.filter(numero__lte=5).order_by('numero')
        jugadores = Jugador.objects.all()
        
        if not jornadas.exists():
            self.stdout.write(self.style.ERROR('❌ No se encontraron jornadas. Creando jornadas...'))
            liga = Liga.objects.first()
            equipos_reales = EquipoReal.objects.all()
            self.crear_calendario_completo(liga, equipos_reales)
            jornadas = Jornada.objects.filter(numero__lte=5).order_by('numero')
        
        total_puntuaciones = 0
        puntos_totales_por_jugador = {}
        
        for jugador in jugadores:
            puntos_jugador = 0
            
            for jornada in jornadas:
                # Generar puntuación aleatoria según la posición
                if jugador.posicion == 'POR':
                    # Porteros: entre -3 y 12 puntos
                    puntos = random.randint(-3, 12)
                elif jugador.posicion == 'DEF':
                    # Defensas: entre -2 y 10 puntos
                    puntos = random.randint(-2, 10)
                else:  # DEL
                    # Delanteros: entre -1 y 15 puntos
                    puntos = random.randint(-1, 15)
                
                # Crear la puntuación
                Puntuacion.objects.create(
                    jugador=jugador,
                    jornada=jornada,
                    puntos=puntos
                )
                
                puntos_jugador += puntos
                total_puntuaciones += 1
            
            # Guardar los puntos totales para actualizar después
            puntos_totales_por_jugador[jugador.id] = puntos_jugador
        
        # Actualizar los puntos totales de cada jugador
        for jugador_id, puntos_totales in puntos_totales_por_jugador.items():
            Jugador.objects.filter(id=jugador_id).update(puntos_totales=puntos_totales)
        
        self.stdout.write(self.style.SUCCESS(
            f'✅ Creadas {total_puntuaciones} puntuaciones para {jugadores.count()} jugadores en {jornadas.count()} jornadas'
        ))
        
        # Mostrar algunas estadísticas de las puntuaciones
        todas_puntuaciones = Puntuacion.objects.all()
        if todas_puntuaciones.exists():
            puntuaciones_lista = [p.puntos for p in todas_puntuaciones]
            self.stdout.write(f'📈 Estadísticas de puntuaciones:')
            self.stdout.write(f'   • Mínimo: {min(puntuaciones_lista)} puntos')
            self.stdout.write(f'   • Máximo: {max(puntuaciones_lista)} puntos')
            self.stdout.write(f'   • Promedio: {sum(puntuaciones_lista)/len(puntuaciones_lista):.1f} puntos')
            self.stdout.write(f'   • Negativas: {sum(1 for p in puntuaciones_lista if p < 0)} registros')

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
            'PUNTUACIONES CREADAS': Puntuacion.objects.count(),  # 🆕 Nueva estadística
        }
        
        for item, cantidad in stats.items():
            if 'MERCADO' in item or 'PUNTUACIONES' in item:
                self.stdout.write(self.style.SUCCESS(f'   🎯 {item}: {cantidad}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'   • {item}: {cantidad}'))
        
        # Estadísticas de jugadores por posición
        self.stdout.write('\n🎯 JUGADORES EN MERCADO POR POSICIÓN:')
        for posicion in ['POR', 'DEF', 'DEL']:
            count_total = jugadores_en_mercado.filter(posicion=posicion).count()
            count_libres = jugadores_libres_en_mercado.filter(posicion=posicion).count()
            self.stdout.write(f'   • {posicion}: {count_total} totales, {count_libres} libres')
        
        # 🆕 Estadísticas de puntuaciones
        if Puntuacion.objects.exists():
            self.stdout.write('\n📊 PUNTUACIONES POR JORNADA:')
            for jornada_num in range(1, 6):
                count = Puntuacion.objects.filter(jornada__numero=jornada_num).count()
                self.stdout.write(f'   • Jornada {jornada_num}: {count} puntuaciones')
        
        # Rango de precios de jugadores en mercado
        if jugadores_en_mercado.exists():
            precios = [j.valor for j in jugadores_en_mercado]
            self.stdout.write(f'\n💰 RANGO DE PRECIOS EN MERCADO: €{min(precios):,} - €{max(precios):,}')
            self.stdout.write(f'   Precio promedio: €{sum(precios)/len(precios):,.0f}')
        
        # 🆕 Rango de puntos totales
        if Jugador.objects.exists():
            puntos = [j.puntos_totales for j in Jugador.objects.all()]
            self.stdout.write(f'\n⭐ RANGO DE PUNTOS TOTALES: {min(puntos)} - {max(puntos)} puntos')
            self.stdout.write(f'   Promedio: {sum(puntos)/len(puntos):.1f} puntos')
        
        self.stdout.write('\n🎮 INSTRUCCIONES PARA PROBAR:')
        self.stdout.write('   1. Login con: admin1/admin1')
        self.stdout.write('   2. Ve al dashboard y haz clic en cualquier jugador')
        self.stdout.write('   3. Deberías ver el gráfico de puntuaciones por jornada')
        self.stdout.write('   4. Presupuesto inicial: €50M')
        self.stdout.write('   5. ¡Puja por los jugadores que quieras!')