# fantasy/management/commands/finalizar_subastas.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from random import uniform
from fantasy.models import Jugador, Equipo, Puja, Oferta, Notificacion

class Command(BaseCommand):
    help = 'Finaliza subastas expiradas y genera ofertas automáticas del sistema'

    def handle(self, *args, **options):
        ahora = timezone.now()

        self.stdout.write(f'\n🔍 Buscando subastas a finalizar ({ahora.strftime("%d/%m/%Y %H:%M")})...\n')

        # 1. Finalizar pujas (mercado libre)
        self.finalizar_pujas_mercado_libre(ahora)

        # 2. Generar ofertas automáticas para jugadores de usuarios sin ofertas
        self.generar_ofertas_automaticas(ahora)

        # 3. Devolver jugadores sin ofertas a sus dueños
        self.devolver_jugadores_sin_ofertas(ahora)

    @transaction.atomic()
    def finalizar_pujas_mercado_libre(self, ahora):
        """Finalizar pujas de mercado libre (jugadores sin equipo)"""
        limite_24h = ahora - timedelta(hours=24)

        jugadores_expirados = Jugador.objects.filter(
            equipo__isnull=True,  # Mercado libre
            en_venta=True,
            fecha_mercado__lte=limite_24h
        ).select_for_update()

        if not jugadores_expirados.exists():
            self.stdout.write(self.style.WARNING('No hay pujas de mercado libre para finalizar'))
            return

        self.stdout.write(f'📊 Finalizando {jugadores_expirados.count()} pujas de mercado libre...\n')

        for jugador in jugadores_expirados:
            # Buscar puja ganadora
            puja_ganadora = Puja.objects.filter(
                jugador=jugador,
                activa=True
            ).order_by('-monto').first()

            if puja_ganadora:
                # Asignar jugador al ganador
                equipo_ganador = puja_ganadora.equipo

                jugador.equipo = equipo_ganador
                jugador.en_banquillo = True  # ⚠️ SIEMPRE al banquillo
                jugador.en_venta = False
                jugador.fecha_mercado = None
                jugador.save()

                # Actualizar presupuesto
                equipo_ganador.presupuesto -= puja_ganadora.monto
                equipo_ganador.save()

                # Marcar puja como ganadora
                puja_ganadora.es_ganadora = True
                puja_ganadora.save()

                # Notificar ganador
                Notificacion.objects.create(
                    destinatario=equipo_ganador.usuario,
                    tipo='privada',
                    categoria='puja_ganada',
                    titulo='🎉 ¡Puja ganada!',
                    mensaje=f'Has ganado la puja por {jugador.nombre} por €{puja_ganadora.monto:,}. El jugador está en tu banquillo.',
                    leida=False
                )

                # Notificar fichaje global
                self.notificar_fichaje_global(jugador, equipo_ganador)

                # Marcar pujas perdedoras
                pujas_perdedoras = Puja.objects.filter(
                    jugador=jugador,
                    activa=True
                ).exclude(id=puja_ganadora.id)

                for puja in pujas_perdedoras:
                    puja.activa = False
                    puja.save()

                    # Notificar perdedor
                    Notificacion.objects.create(
                        destinatario=puja.equipo.usuario,
                        tipo='privada',
                        categoria='puja_perdida',
                        titulo='Puja perdida',
                        mensaje=f'Has perdido la puja por {jugador.nombre}. Tu dinero ha sido devuelto.',
                        leida=False
                    )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✅ {jugador.nombre} → {equipo_ganador.nombre} por €{puja_ganadora.monto:,}'
                    )
                )
            else:
                # Sin pujas: devolver al pool
                jugador.en_venta = False
                jugador.fecha_mercado = None
                jugador.save()

                self.stdout.write(
                    self.style.WARNING(f'  ⚠️ {jugador.nombre}: Sin pujas, devuelto al pool')
                )

    @transaction.atomic()
    def generar_ofertas_automaticas(self, ahora):
        """Generar ofertas automáticas del sistema para jugadores sin ofertas"""
        limite_24h = ahora - timedelta(hours=24)

        jugadores_sin_ofertas = Jugador.objects.filter(
            equipo__isnull=False,  # Pertenecen a un usuario
            en_venta=True,
            fecha_mercado__lte=limite_24h
        ).select_for_update()

        if not jugadores_sin_ofertas.exists():
            self.stdout.write(self.style.WARNING('No hay jugadores de usuarios sin ofertas'))
            return

        self.stdout.write(f'\n🤖 Generando ofertas automáticas...\n')

        for jugador in jugadores_sin_ofertas:
            # Verificar que no tenga ofertas pendientes
            tiene_ofertas = Oferta.objects.filter(
                jugador=jugador,
                estado__in=['pendiente', 'aceptada']
            ).exists()

            if not tiene_ofertas:
                # Generar oferta del sistema (±5%)
                variacion = uniform(-0.05, 0.05)
                monto_oferta = int(jugador.valor * (1 + variacion))

                oferta_sistema = Oferta.objects.create(
                    jugador=jugador,
                    equipo_oferente=None,  # NULL = sistema
                    equipo_receptor=jugador.equipo,
                    monto=monto_oferta,
                    es_del_sistema=True,
                    estado='pendiente'
                )

                # Notificar vendedor
                Notificacion.objects.create(
                    destinatario=jugador.equipo.usuario,
                    tipo='privada',
                    categoria='oferta_sistema',
                    titulo='💰 Oferta del mercado',
                    mensaje=f'El mercado ofrece €{monto_oferta:,} por {jugador.nombre}. Puedes aceptarla o rechazarla.',
                    leida=False
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✅ Oferta automática: {jugador.nombre} → €{monto_oferta:,}'
                    )
                )

    @transaction.atomic()
    def devolver_jugadores_sin_ofertas(self, ahora):
        """
        Devolver jugadores a sus dueños si llevan 48h sin ofertas
        (24h + 24h de gracia para ofertas del sistema)
        """
        limite_48h = ahora - timedelta(hours=48)

        jugadores_devolver = Jugador.objects.filter(
            equipo__isnull=False,
            en_venta=True,
            fecha_mercado__lte=limite_48h
        ).select_for_update()

        if not jugadores_devolver.exists():
            return

        self.stdout.write(f'\n↩️  Devolviendo jugadores sin ofertas...\n')

        for jugador in jugadores_devolver:
            # Verificar que realmente no tenga ofertas
            tiene_ofertas = Oferta.objects.filter(
                jugador=jugador,
                estado='pendiente'
            ).exists()

            if not tiene_ofertas:
                jugador.en_venta = False
                jugador.fecha_mercado = None
                jugador.save()

                # Notificar al dueño
                Notificacion.objects.create(
                    destinatario=jugador.equipo.usuario,
                    tipo='privada',
                    categoria='traspaso',
                    titulo='Jugador devuelto',
                    mensaje=f'{jugador.nombre} ha sido devuelto a tu equipo por falta de ofertas.',
                    leida=False
                )

                self.stdout.write(
                    self.style.SUCCESS(f'  ✅ {jugador.nombre} devuelto a {jugador.equipo.nombre}')
                )

    def notificar_fichaje_global(self, jugador, equipo):
        """Notificar a todos los usuarios de la liga sobre el fichaje"""
        # Obtener liga del equipo
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
