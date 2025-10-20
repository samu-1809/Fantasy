# fantasy/management/commands/congelar_alineaciones.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from fantasy.models import Jornada, Equipo, AlineacionCongelada, Notificacion

class Command(BaseCommand):
    help = 'Congela las alineaciones de todos los equipos cuando inicia una jornada'

    def handle(self, *args, **options):
        ahora = timezone.now()

        self.stdout.write(f'\n🔍 Buscando jornadas para congelar ({ahora.strftime("%d/%m/%Y %H:%M")})...\n')

        # Buscar jornadas que deberían congelarse
        jornadas_por_congelar = Jornada.objects.filter(
            fecha_inicio__lte=ahora,
            alineaciones_congeladas=False
        )

        if not jornadas_por_congelar.exists():
            self.stdout.write(self.style.WARNING('No hay jornadas para congelar en este momento'))
            return

        for jornada in jornadas_por_congelar:
            self.stdout.write(f'\n🔒 Congelando alineaciones para Jornada {jornada.numero}...')

            with transaction.atomic():
                # Obtener liga de la jornada (asumimos que hay solo una liga o que la jornada tiene liga FK)
                # Si no hay FK liga en Jornada, obtenemos todos los equipos
                equipos = Equipo.objects.all().prefetch_related('jugadores')

                for equipo in equipos:
                    # Obtener titulares actuales (jugadores en el campo)
                    titulares = equipo.jugadores.filter(en_banquillo=False)

                    # Contar por posición
                    porteros = titulares.filter(posicion='POR').count()
                    defensas = titulares.filter(posicion='DEF').count()
                    delanteros = titulares.filter(posicion='DEL').count()

                    # Validar posiciones completas (1 POR, 2 DEF, 2 DEL)
                    tiene_completo = (porteros >= 1 and defensas >= 2 and delanteros >= 2)
                    posiciones_faltantes = []

                    if porteros < 1:
                        posiciones_faltantes.append('POR')
                    if defensas < 2:
                        posiciones_faltantes.append('DEF')
                    if delanteros < 2:
                        posiciones_faltantes.append('DEL')

                    # Crear snapshot de alineación
                    alineacion, created = AlineacionCongelada.objects.get_or_create(
                        equipo=equipo,
                        jornada=jornada,
                        defaults={
                            'tiene_posiciones_completas': tiene_completo,
                            'posiciones_faltantes': posiciones_faltantes
                        }
                    )

                    if created:
                        # Asignar jugadores titulares al snapshot
                        alineacion.jugadores_titulares.set(titulares)

                        if tiene_completo:
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'  ✅ {equipo.nombre}: Alineación completa ({titulares.count()} jugadores)'
                                )
                            )

                            # Notificar alineación registrada
                            Notificacion.objects.create(
                                destinatario=equipo.usuario,
                                tipo='privada',
                                categoria='alineacion_congelada',
                                titulo='✅ Alineación registrada',
                                mensaje=f'Tu alineación para la Jornada {jornada.numero} ha sido registrada exitosamente. '
                                       f'Estos {titulares.count()} jugadores sumarán puntos: {", ".join([j.nombre for j in titulares[:5]])}{"..." if titulares.count() > 5 else ""}',
                                leida=False
                            )
                        else:
                            self.stdout.write(
                                self.style.ERROR(
                                    f'  ❌ {equipo.nombre}: Alineación INCOMPLETA (falta {", ".join(posiciones_faltantes)})'
                                )
                            )

                            # Notificar advertencia
                            Notificacion.objects.create(
                                destinatario=equipo.usuario,
                                tipo='privada',
                                categoria='sin_dinero_jornada',
                                titulo='⚠️ Alineación incompleta',
                                mensaje=f'Tu alineación para la Jornada {jornada.numero} está INCOMPLETA. '
                                       f'Te faltan: {", ".join(posiciones_faltantes)}. '
                                       f'NO sumarás puntos ni ganarás dinero en esta jornada.',
                                leida=False
                            )

                # Marcar jornada como congelada
                jornada.alineaciones_congeladas = True
                jornada.save()

                self.stdout.write(self.style.SUCCESS(f'✅ Jornada {jornada.numero} congelada exitosamente\n'))
