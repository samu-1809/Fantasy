# management/commands/populate_real_data.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from fantasy.models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido
import random
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction

class Command(BaseCommand):
    help = 'Poblar la base de datos con datos reales del campeonato KODEKI 25/26'

    def handle(self, *args, **kwargs):
        self.stdout.write('🏗️ Creando datos reales del campeonato KODEKI 25/26...')

        # Limpiar datos existentes
        self.clean_database()

        # Crear liga principal
        liga = self.crear_liga()
        
        # Crear equipos reales BASADOS EN LOS DATOS REALES
        equipos_reales = self.crear_equipos_reales_reales()
        
        # Crear JUGADORES con los nombres REALES proporcionados
        total_jugadores = self.crear_jugadores_reales(equipos_reales)
        
        # Crear CALENDARIO REAL con las jornadas y partidos
        self.crear_calendario_real(liga, equipos_reales)
    
        # Crear usuario admin
        self.crear_usuario_admin()
        
        # 🆕 ASIGNAR PUNTUACIONES Y GOLES COHERENTES CON LOS RESULTADOS
        self.asignar_puntuaciones_y_goles_coherentes()
        
        # Mostrar estadísticas finales
        self.mostrar_estadisticas()

    def clean_database(self):
        """Limpiar base de datos"""
        self.stdout.write('🧹 Limpiando base de datos...')
        Puntuacion.objects.all().delete()
        Jugador.objects.all().delete()
        Equipo.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        EquipoReal.objects.all().delete()
        Jornada.objects.all().delete()
        Liga.objects.all().delete()

    def crear_liga(self):
        """Crear liga principal"""
        liga, created = Liga.objects.get_or_create(
            codigo='KODEKI_25_26',
            defaults={
                'nombre': 'Campeonato KODEKI 25/26',
                'jornada_actual': 1
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Liga creada: {liga.nombre}'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Liga ya existe: {liga.nombre}'))
        return liga

    def crear_equipos_reales_reales(self):
        """Crear equipos reales basados en los datos reales del PDF"""
        equipos_reales_nombres = [
            'F.C SCHALKE', 'PIÑA SIN MALIBU', 'CD AIBARES-EX', 'PIZZARIN F.C',
            'PIKATOSTES', 'BARFLEUR', 'VISEU', 'LASAI F.C', 
            'F.C BOTAFUMEIRO', 'SPOLKA', 'MAKILAKIXKI F.C', 'SANZOILO TEAM'
        ]
        
        equipos_reales = []
        for nombre in equipos_reales_nombres:
            equipo_real, created = EquipoReal.objects.get_or_create(nombre=nombre)
            equipos_reales.append(equipo_real)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Equipo real creado: {nombre}'))
        
        return equipos_reales

    def crear_jugadores_reales(self, equipos_reales):
        """Crear jugadores con los nombres REALES del PDF"""
        self.stdout.write('\n🎯 Creando jugadores reales...')
        
        # Mapeo de equipos reales por nombre
        equipos_dict = {equipo.nombre.upper(): equipo for equipo in equipos_reales}
        
        # Datos REALES de jugadores extraídos del PDF
        jugadores_data = {
            'BARFLEUR': [
                'Adrian Soteras Iso',
                'Aimar Azcarate Blanco',
                'Altzol Puga Saez',
                'Eduardo Echegoyen Guindano',
                'Gorka Pilas Machain',
                'Hugo Bielsa Sola',
                'Hugo Perez Sanz Galdeano',
                'Iñigo Rebole Guindado',
                'Oscar Gutierrez Elizalde',
                'Sancho Zia Usoz',
                'Teo Villacampa Apesteguia',
                'Tomas Torres Granda',
            ],
            'CD AIBARES-EX': [
                'Alberto Garro Baztan',
                'Ander Cibirian Andueza',
                'Angel Ibero Artieda',
                'Asier Labay Santesteban',
                'Cesar Arbeloa Irigoyen',
                'Gorka Aldunate Continente',
                'Iker Ibero Iriarte',
                'Imanol Ibero Azcarate',
                'Iñigo Garde Alzueta',
                'Iñigo Perez Ortiz',
                'Ion Irigoyen Martinez',
                'Javier Murillo',
                'Julen Martinez Orcaray',
                'Mikel Fanlo Iso',
                'Mikel Iparaguirre Leoz',
                'Samuel Gil Zabaleta',
                'Ugaitz Martinez Remon',
            ],
            'F.C BOTAFUMEIRO': [
                'Adrian Guerrero Narvaiz',
                'Breogan Gonzalez Cereijo',
                'Charlie Fernando Iriarte',
                'Erick Choco',
                'Javi Gallego Caballero',
                'Jean Pierre Sanches Vivanco',
                'Jinno Anderson Zhunio',
                'Josu Xabier Agreda Jaramillo',
                'Jull Iker Agreda Jaramillo',
                'Luis Maykol Romero Ramon',
                'Marco Riofrio Ordoñez',
                'Moundir El Mehdi',
                'Steeven Granda Hidalgo',
                'Yeison Granda Hidalgo',
            ],
            'F.C SCHALKE': [
                'Adrian Navarro Hualde',
                'Aimar Ibañez Amatrian',
                'Aimar Rebole Villahoz',
                'Ander Erdozain',
                'Daniel Gallo Juan',
                'David Gil Zarategui',
                'Enaitz Pardo Fernandez',
                'German Bielsa Sola',
                'Guillermo Ochoa Reta',
                'Juan Blanco Almarcegui',
                'Lucas Garces Perez',
                'Unai Ojer Fernandez',
                'Xabier Rebole Guindano',
            ],
            'LASAI F.C': [
                'Alfredo Machin Anso',
                'Alvaro Iriarte Iriarte',
                'Cesar de Carlos Goñi',
                'Diego Gimeno Cajal',
                'Diego Gomez Cifrain',
                'Eduardo Juanto Vidondo',
                'Ekaitz Sanz Domeño',
                'Ibon Ollo Jimenez',
                'Iker Ariz Cabodevilla',
                'Iker Iturbide Jimenez',
                'Iñaki Cajal Ozcoidi',
                'Iñaki Mugueta Guillen',
                'Iñigo Burguete Esquisabel',
                'Jon Bengoetxea Mendioroz',
                'Roberto Perez Cajal',
                'Unai Abaurrea Abadia',
                'Xabier Gamboa Apolicourt',
                'Xabier Iturbide Monzon',
            ],
            'MAKILAKIXKI F.C': [
                'Adrian Martinez Perez',
                'Adrian Pueyo Gallo',
                'Aitor Blanco Iso',
                'Alberto Lecumberri Del Castillo',
                'Alvaro Del Castillo Mallada',
                'Ander Bandres Abadia',
                'Asier Bandres Abadia',
                'Asier Jimenez Anaut',
                'Egoitz Arguiñariz Vital',
                'Fermin Ingelmo Guerrero',
                'Gabriel Guallar Areta',
                'Ion Perez Goñi',
                'Ivan Ramos Arlegui',
                'Jesus Oiza Ibañez',
                'Miguel Rodrigues Pona',
                'Mikel Ruiz Lorenzo',
                'Oscar Guillen Gil',
                'Samuel Gomez Jauregui',
            ],
            'PIKATOSTES': [
                'Aitor Saenz Juanenea',
                'Alejandro Urricelqui Sadaba',
                'Aratz Pardo Fernandez',
                'Egoi Sancet Eslava',
                'Eneko Carreño Roldan',
                'Hugo Sarvide Conte',
                'Imanol Garces Yabar',
                'Iraitz Arguiñariz Vital',
                'Ivan de Lucas Santos',
                'Jon Carmona Burguete',
                'Oier Sola Leiza'
            ],
            'PIÑA SIN MALIBU': [
                'Alberto Bustingorri Eguaras',
                'Alvaro Rocafort Beorlegui',
                'Aritz Lacosta Sanchez',
                'Carlos Cardenas Pino',
                'Diego Echeverri Bandres',
                'Gabriel Echeverri Bandres',
                'Gonzalo Oiza Irribaren',
                'Imanol Dominguez Gracia',
                'Ivan Chamorro Navarro',
                'Javier Hualde Gonzalez',
                'Jon Turrillas Bandres',
                'Mikel Landarech Vicente',
                'Mikel Valero Gonzalez',
                'Oier Iturbide Perez',
                'Samuel Gil Ubani',
            ],
            'PIZZARIN F.C': [
                'Eric Molero Garcia',
                'Inhar Suescun Boneta',
                'Iñigo Perez Mutiloa',
                'Ivan Bandres Ozcoidi',
                'Jorge Huelva Semitiel',
                'Juan Arbea Irigoyen',
                'Leandro Tapia Peña',
                'Samuel Arbea Irigoyen',
                'Sergio Navarro Valde',
                'Xabier Errea Villacampa',
                'Yassin Jaiti',
            ],
            'SANZOILO TEAM': [
                'Andres Felipe Cardenas',
                'Aritza Jose Villalba',
                'Arturo Jimenez Gimenez',
                'Braian Carbonel Jimenez',
                'Daniel Torrea',
                'Ivan Torrea',
                'Javier Sola Alustiza',
                'Jean Pierre Giraldo',
                'Marcos Jimenez Gimenez',
                'Miguel Angel Jauregui Valencia',
                'Oscar Obed Luque Bustillo',
                'Paul Alim Dumitru',
                'Ricardo Gimenez Segura',
                'Rothman Ortiz Bustillo',
                'Adrian Aznar Ayape',
            ],
            'SPOLKA': [
                'Adrian Echeverri Val',
                'Adrian Segura Rocha',
                'Alejandro Gallo Taboada',
                'Alvaro Muiños Abadia',
                'Andres Iriarte Salinas',
                'Antonio Valencia Jauregui',
                'Arkaitz Molero Gonzalez',
                'Asier Perez Sanchez',
                'Daniel Mateo Berkamans',
                'Daniel Montañes Alvarez',
                'Iñaki Urbia Alaman',
                'Javier Artajo Jimenez',
                'Mikel Segurola Baranda',
                'Pablo Gorriz Irigoyen',
                'Pablo Labairu',
                'Sergio Jauregui Vizcay',
                'Tasio Villacampa Apestegui',
            ],
            'VISEU': [
                'Adrian del Castillo Guindano',
                'Asier Acaro Riofrio',
                'Dario Choco',
                'Iker Ibañez Lacosta',
                'Iñaki Jimenez Moriones',
                'Iñigo Gutierrez Elizalde',
                'Javier Plano Contin',
                'Julen Aranguren Conde',
                'Julen Lacasa Begue',
                'Martin Gallo Juan',
                'Pablo Val Martin',
                'Ruben Ingelmo Guerrero',
            ]
        }
        
        jugadores_creados = 0
        
        for equipo_nombre, jugadores_list in jugadores_data.items():
            equipo_real = equipos_dict.get(equipo_nombre.upper())
            if not equipo_real:
                self.stdout.write(self.style.WARNING(f'⚠ Equipo no encontrado: {equipo_nombre}'))
                continue
            
            self.stdout.write(f'🎯 Creando jugadores para {equipo_nombre}...')
            
            for nombre_jugador in jugadores_list:
                # Asignar posición aleatoriamente
                posicion = random.choice(['POR', 'DEF', 'DEL'])
                
                # Asignar valor según posición
                if posicion == 'POR':
                    valor = random.randint(1000000, 5000000)
                elif posicion == 'DEF':
                    valor = random.randint(500000, 8000000)
                else:  # DEL
                    valor = random.randint(1000000, 15000000)
                
                # Crear jugador - TODOS los jugadores comienzan SIN equipo
                jugador = Jugador.objects.create(
                    nombre=nombre_jugador,
                    posicion=posicion,
                    valor=valor,
                    puntos_totales=0,
                    goles=0,  # Inicialmente 0 goles, se actualizará después
                    equipo_real=equipo_real,
                    equipo=None,  # IMPORTANTE: Sin equipo fantasy
                    en_venta=False,
                    en_banquillo=True
                )
                
                jugadores_creados += 1
            
            self.stdout.write(self.style.SUCCESS(f'   ✅ {len(jugadores_list)} jugadores creados para {equipo_nombre}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n🎉 Total jugadores creados: {jugadores_creados}'))
        return jugadores_creados

    def crear_calendario_real(self, liga, equipos_reales):
        """Crear calendario REAL basado en el PDF proporcionado"""
        self.stdout.write('\n📅 Creando calendario real...')
        
        # Mapeo de equipos reales por nombre
        equipos_dict = {equipo.nombre.upper(): equipo for equipo in equipos_reales}
        
        # Calendario real extraído del PDF
        calendario = [
            # Jornada 1
            [
                ('F.C SCHALKE', 'PIÑA SIN MALIBU'),
                ('CD AIBARES-EX', 'PIZZARIN F.C'),
                ('PIKATOSTES', 'BARFLEUR'),
                ('VISEU', 'LASAI F.C'),
                ('F.C BOTAFUMEIRO', 'SPOLKA'),
                ('MAKILAKIXKI F.C', 'SANZOILO TEAM')
            ],
            # Jornada 2
            [
                ('BARFLEUR', 'SPOLKA'),
                ('PIKATOSTES', 'F.C SCHALKE'),
                ('LASAI F.C', 'F.C BOTAFUMEIRO'),
                ('PIÑA SIN MALIBU', 'CD AIBARES-EX'),
                ('SANZOILO TEAM', 'VISEU'),
                ('PIZZARIN F.C', 'MAKILAKIXKI F.C')
            ],
            # Jornada 3
            [
                ('F.C SCHALKE', 'BARFLEUR'),
                ('SPOLKA', 'LASAI F.C'),
                ('CD AIBARES-EX', 'PIKATOSTES'),
                ('F.C BOTAFUMEIRO', 'SANZOILO TEAM'),
                ('MAKILAKIXKI F.C', 'PIÑA SIN MALIBU'),
                ('VISEU', 'PIZZARIN F.C')
            ],
            # Jornada 4
            [
                ('BARFLEUR', 'LASAI F.C'),
                ('F.C SCHALKE', 'CD AIBARES-EX'),
                ('SANZOILO TEAM', 'SPOLKA'),
                ('PIKATOSTES', 'MAKILAKIXKI F.C'),
                ('PIZZARIN F.C', 'F.C BOTAFUMEIRO'),
                ('PIÑA SIN MALIBU', 'VISEU')
            ],
            # Jornada 5
            [
                ('CD AIBARES-EX', 'BARFLEUR'),
                ('LASAI F.C', 'SANZOILO TEAM'),
                ('MAKILAKIXKI F.C', 'F.C SCHALKE'),
                ('SPOLKA', 'PIZZARIN F.C'),
                ('VISEU', 'PIKATOSTES'),
                ('F.C BOTAFUMEIRO', 'PIÑA SIN MALIBU')
            ],
            # Jornada 6
            [
                ('BARFLEUR', 'SANZOILO TEAM'),
                ('CD AIBARES-EX', 'MAKILAKIXKI F.C'),
                ('PIZZARIN F.C', 'LASAI F.C'),
                ('F.C SCHALKE', 'VISEU'),
                ('PIÑA SIN MALIBU', 'SPOLKA'),
                ('PIKATOSTES', 'F.C BOTAFUMEIRO')
            ],
            # Jornada 7
            [
                ('MAKILAKIXKI F.C', 'BARFLEUR'),
                ('SANZOILO TEAM', 'PIZZARIN F.C'),
                ('VISEU', 'CD AIBARES-EX'),
                ('LASAI F.C', 'PIÑA SIN MALIBU'),
                ('F.C BOTAFUMEIRO', 'F.C SCHALKE'),
                ('SPOLKA', 'PIKATOSTES')
            ],
            # Jornada 8
            [
                ('BARFLEUR', 'PIZZARIN F.C'),
                ('MAKILAKIXKI F.C', 'VISEU'),
                ('PIÑA SIN MALIBU', 'SANZOILO TEAM'),
                ('CD AIBARES-EX', 'F.C BOTAFUMEIRO'),
                ('PIKATOSTES', 'LASAI F.C'),
                ('F.C SCHALKE', 'SPOLKA')
            ],
            # Jornada 9
            [
                ('VISEU', 'BARFLEUR'),
                ('PIZZARIN F.C', 'PIÑA SIN MALIBU'),
                ('F.C BOTAFUMEIRO', 'MAKILAKIXKI F.C'),
                ('SANZOILO TEAM', 'PIKATOSTES'),
                ('SPOLKA', 'CD AIBARES-EX'),
                ('LASAI F.C', 'F.C SCHALKE')
            ],
            # Jornada 10
            [
                ('BARFLEUR', 'PIÑA SIN MALIBU'),
                ('VISEU', 'F.C BOTAFUMEIRO'),
                ('PIKATOSTES', 'PIZZARIN F.C'),
                ('MAKILAKIXKI F.C', 'SPOLKA'),
                ('F.C SCHALKE', 'SANZOILO TEAM'),
                ('CD AIBARES-EX', 'LASAI F.C')
            ],
            # Jornada 11
            [
                ('F.C BOTAFUMEIRO', 'BARFLEUR'),
                ('PIÑA SIN MALIBU', 'PIKATOSTES'),
                ('SPOLKA', 'VISEU'),
                ('PIZZARIN F.C', 'F.C SCHALKE'),
                ('LASAI F.C', 'MAKILAKIXKI F.C'),
                ('SANZOILO TEAM', 'CD AIBARES-EX')
            ]
        ]
        
        # Crear jornadas y partidos
        for i, partidos_jornada in enumerate(calendario, 1):
            jornada, created = Jornada.objects.get_or_create(numero=i)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Jornada {i} creada'))
                
                # Crear partidos para esta jornada
                for local_nombre, visitante_nombre in partidos_jornada:
                    local = equipos_dict.get(local_nombre.upper())
                    visitante = equipos_dict.get(visitante_nombre.upper())
                    
                    if local and visitante:
                        # Fecha basada en la jornada (cada 7 días)
                        fecha_base = timezone.now() + timedelta(days=(i-1)*7)
                        
                        partido, created = Partido.objects.get_or_create(
                            jornada=jornada,
                            equipo_local=local,
                            equipo_visitante=visitante,
                            defaults={
                                'fecha': fecha_base,
                                'goles_local': 0,  # Inicialmente 0, se asignarán después
                                'goles_visitante': 0,
                                'jugado': True  # Todos los partidos están jugados
                            }
                        )
                        
                        if created:
                            self.stdout.write(f'   ⚽ {local.nombre} vs {visitante.nombre}')
                    else:
                        self.stdout.write(self.style.WARNING(f'   ⚠ No se encontró equipo: {local_nombre} vs {visitante_nombre}'))

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
            user.set_password('aaaaaa')
            user.save()
        else:
            self.stdout.write(self.style.WARNING('⚠ Usuario admin ya existe'))

    def asignar_puntuaciones_y_goles_coherentes(self):
        """🆕 ASIGNAR PUNTUACIONES Y GOLES COHERENTES CON LOS RESULTADOS"""
        self.stdout.write('\n📊 Asignando puntuaciones y goles coherentes...')
        
        # Obtener todas las jornadas
        jornadas = Jornada.objects.all().order_by('numero')
        total_puntuaciones = 0
        total_goles = 0
        
        for jornada in jornadas:
            self.stdout.write(f'\n🎯 Procesando jornada {jornada.numero}...')
            
            # Obtener todos los partidos de esta jornada
            partidos = Partido.objects.filter(jornada=jornada)
            
            for partido in partidos:
                # Generar resultado realista
                goles_local = random.randint(0, 5)
                goles_visitante = random.randint(0, 5)
                
                # Actualizar el partido con el resultado
                partido.goles_local = goles_local
                partido.goles_visitante = goles_visitante
                partido.save()
                
                self.stdout.write(f'   ⚽ {partido.equipo_local.nombre} {goles_local}-{goles_visitante} {partido.equipo_visitante.nombre}')
                
                # Asignar goles a los jugadores del equipo local
                goles_local_asignados = self.asignar_goles_equipo(
                    partido.equipo_local, jornada, goles_local
                )
                
                # Asignar goles a los jugadores del equipo visitante
                goles_visitante_asignados = self.asignar_goles_equipo(
                    partido.equipo_visitante, jornada, goles_visitante
                )
                
                total_goles += goles_local_asignados + goles_visitante_asignados
        
        # Actualizar puntos totales de jugadores
        self.actualizar_puntos_totales()
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Asignados {total_goles} goles en {jornadas.count()} jornadas'
        ))

    def asignar_goles_equipo(self, equipo, jornada, total_goles):
        """Asignar goles a los jugadores de un equipo de forma coherente"""
        # Obtener jugadores del equipo
        jugadores = Jugador.objects.filter(equipo_real=equipo)
        
        if not jugadores.exists():
            return 0
        
        # Si no hay goles, crear puntuaciones sin goles
        if total_goles == 0:
            for jugador in jugadores:
                self.crear_puntuacion_jugador(jugador, jornada, 0)
            return 0
        
        # Distribuir goles según posición
        delanteros = jugadores.filter(posicion='DEL')
        defensas = jugadores.filter(posicion='DEF')
        porteros = jugadores.filter(posicion='POR')
        
        goles_asignados = 0
        
        # Asignar goles principalmente a delanteros, luego defensas, raramente a porteros
        goles_restantes = total_goles
        
        # Delanteros (70% de los goles)
        goles_delanteros = min(int(total_goles * 0.7) + random.randint(0, 1), goles_restantes)
        if delanteros.exists() and goles_delanteros > 0:
            goles_asignados += self.distribuir_goles_jugadores(delanteros, jornada, goles_delanteros)
            goles_restantes -= goles_delanteros
        
        # Defensas (25% de los goles)
        goles_defensas = min(int(total_goles * 0.25) + random.randint(0, 1), goles_restantes)
        if defensas.exists() and goles_defensas > 0:
            goles_asignados += self.distribuir_goles_jugadores(defensas, jornada, goles_defensas)
            goles_restantes -= goles_defensas
        
        # Porteros (5% de los goles)
        if porteros.exists() and goles_restantes > 0:
            goles_asignados += self.distribuir_goles_jugadores(porteros, jornada, goles_restantes)
        
        # Si por alguna razón no se asignaron todos los goles, asignar a cualquier jugador
        if goles_asignados < total_goles:
            jugadores_restantes = list(jugadores)
            goles_faltantes = total_goles - goles_asignados
            for _ in range(goles_faltantes):
                if jugadores_restantes:
                    jugador = random.choice(jugadores_restantes)
                    puntuacion, created = Puntuacion.objects.get_or_create(
                        jugador=jugador,
                        jornada=jornada,
                        defaults={'puntos': 0, 'goles': 0}
                    )
                    puntuacion.goles += 1
                    puntuacion.save()
                    goles_asignados += 1
        
        return goles_asignados

    def distribuir_goles_jugadores(self, jugadores, jornada, total_goles):
        """Distribuir goles entre un grupo de jugadores"""
        goles_asignados = 0
        jugadores_list = list(jugadores)
        
        # Si hay más goles que jugadores, asignar al menos 1 gol a cada uno
        if total_goles >= len(jugadores_list):
            for jugador in jugadores_list:
                puntuacion = self.crear_puntuacion_jugador(jugador, jornada, 1)
                goles_asignados += 1
            total_goles -= len(jugadores_list)
        
        # Distribuir los goles restantes de forma aleatoria
        for _ in range(total_goles):
            if jugadores_list:
                jugador = random.choice(jugadores_list)
                puntuacion, created = Puntuacion.objects.get_or_create(
                    jugador=jugador,
                    jornada=jornada,
                    defaults={'puntos': 0, 'goles': 0}
                )
                puntuacion.goles += 1
                puntuacion.save()
                goles_asignados += 1
        
        return goles_asignados

    def crear_puntuacion_jugador(self, jugador, jornada, goles):
        """Crear o actualizar puntuación para un jugador"""
        # Generar puntos basados en posición y goles
        puntos_base = 0
        
        if jugador.posicion == 'POR':
            puntos_base = random.randint(-3, 12)
            # Portero: puntos extra por mantener la portería a cero
            if goles == 0:
                puntos_base += random.randint(1, 5)
        elif jugador.posicion == 'DEF':
            puntos_base = random.randint(-2, 10)
            # Defensa: puntos extra por clean sheet
            if goles == 0:
                puntos_base += random.randint(1, 3)
        else:  # DEL
            puntos_base = random.randint(-1, 15)
        
        # Puntos por goles (2 puntos por gol)
        puntos_por_goles = goles * 2
        
        puntos_totales = puntos_base + puntos_por_goles
        
        puntuacion, created = Puntuacion.objects.get_or_create(
            jugador=jugador,
            jornada=jornada,
            defaults={
                'puntos': puntos_totales,
                'goles': goles
            }
        )
        
        if not created:
            puntuacion.puntos = puntos_totales
            puntuacion.goles = goles
            puntuacion.save()
        
        return puntuacion

    def actualizar_puntos_totales(self):
        """Actualizar puntos totales y goles totales de cada jugador"""
        self.stdout.write('\n🔄 Actualizando puntos y goles totales...')
        
        jugadores = Jugador.objects.all()
        
        for jugador in jugadores:
            puntuaciones = Puntuacion.objects.filter(jugador=jugador)
            
            puntos_totales = sum(p.puntos for p in puntuaciones)
            goles_totales = sum(p.goles for p in puntuaciones)
            
            jugador.puntos_totales = puntos_totales
            jugador.goles = goles_totales
            jugador.save()

    def mostrar_estadisticas(self):
        """Mostrar estadísticas finales de la base de datos"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('📊 ESTADÍSTICAS FINALES DE LA BASE DE DATOS'))
        self.stdout.write('='*60)
        
        # Verificar coherencia de goles
        partidos = Partido.objects.all()
        goles_partidos_local = sum(p.goles_local for p in partidos)
        goles_partidos_visitante = sum(p.goles_visitante for p in partidos)
        goles_partidos_totales = goles_partidos_local + goles_partidos_visitante
        
        goles_jugadores = sum(jugador.goles for jugador in Jugador.objects.all())
        goles_puntuaciones = sum(puntuacion.goles for puntuacion in Puntuacion.objects.all())
        
        stats = {
            'Usuarios': User.objects.count(),
            'Ligas': Liga.objects.count(),
            'Equipos Reales': EquipoReal.objects.count(),
            'Jugadores Totales': Jugador.objects.count(),
            'Jornadas': Jornada.objects.count(),
            'Partidos': Partido.objects.count(),
            'Puntuaciones Creadas': Puntuacion.objects.count(),
            'GOLES EN PARTIDOS (Local)': goles_partidos_local,
            'GOLES EN PARTIDOS (Visitante)': goles_partidos_visitante,
            'GOLES EN PARTIDOS (Total)': goles_partidos_totales,
            'GOLES EN JUGADORES (campo goles)': goles_jugadores,
            'GOLES EN PUNTUACIONES (suma por jornada)': goles_puntuaciones,
            'COHERENCIA GOLES': '✅ PERFECTA' if goles_partidos_totales == goles_jugadores == goles_puntuaciones else '❌ INCOHERENTE'
        }
        
        for item, cantidad in stats.items():
            if 'GOLES' in item or 'COHERENCIA' in item:
                self.stdout.write(self.style.SUCCESS(f'   🎯 {item}: {cantidad}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'   • {item}: {cantidad}'))
        
        # Estadísticas por equipo real
        self.stdout.write('\n🏆 ESTADÍSTICAS POR EQUIPO REAL:')
        for equipo_real in EquipoReal.objects.all():
            jugadores_equipo = Jugador.objects.filter(equipo_real=equipo_real)
            count_jugadores = jugadores_equipo.count()
            goles_equipo = sum(jugador.goles for jugador in jugadores_equipo)
            
            # Goles en partidos como local
            partidos_local = Partido.objects.filter(equipo_local=equipo_real)
            goles_local = sum(p.goles_local for p in partidos_local)
            
            # Goles en partidos como visitante
            partidos_visitante = Partido.objects.filter(equipo_visitante=equipo_real)
            goles_visitante = sum(p.goles_visitante for p in partidos_visitante)
            
            goles_partidos_equipo = goles_local + goles_visitante
            
            coherencia = '✅' if goles_equipo == goles_partidos_equipo else '❌'
            
            self.stdout.write(f'   • {equipo_real.nombre}:')
            self.stdout.write(f'     Jugadores: {count_jugadores}')
            self.stdout.write(f'     Goles jugadores: {goles_equipo}')
            self.stdout.write(f'     Goles partidos: {goles_partidos_equipo} ({goles_local}L + {goles_visitante}V)')
            self.stdout.write(f'     Coherencia: {coherencia}')
        
        # Top 5 goleadores
        self.stdout.write('\n👑 TOP 5 GOLEADORES:')
        top_goleadores = Jugador.objects.order_by('-goles')[:5]
        for i, jugador in enumerate(top_goleadores, 1):
            self.stdout.write(f'   {i}. {jugador.nombre} ({jugador.equipo_real.nombre}) - {jugador.goles} goles')
        
        self.stdout.write('\n🎮 INSTRUCCIONES PARA PROBAR:')
        self.stdout.write('   1. Login con: admin1/admin1')
        self.stdout.write('   2. Ve al dashboard para ver el calendario real')
        self.stdout.write('   3. Los detalles de partido mostrarán goles coherentes con balones ⚽')