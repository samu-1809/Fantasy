from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta


class EquipoReal(models.Model):
    nombre = models.CharField(max_length=100, unique=True)    
    def __str__(self):
        return self.nombre

class Liga(models.Model):
    nombre = models.CharField(max_length=100)
    codigo = models.CharField(max_length=20, unique=True)
    jornada_actual = models.IntegerField(default=1)

    def __str__(self):
        return self.nombre

class Jugador(models.Model):
    PORTERO = 'POR'
    DEFENSA = 'DEF'
    DELANTERO = 'DEL'

    POSICIONES = [
        (PORTERO, 'Portero'),
        (DEFENSA, 'Defensa'),
        (DELANTERO, 'Delantero'),
    ]

    nombre = models.CharField(max_length=100)
    posicion = models.CharField(max_length=3, choices=POSICIONES)
    valor = models.IntegerField(default=5000000)
    puntos_totales = models.IntegerField(default=0)
    equipo_real = models.ForeignKey('EquipoReal', on_delete=models.CASCADE, null=True, blank=True)
    en_venta = models.BooleanField(default=False)
    equipo = models.ForeignKey('Equipo', on_delete=models.SET_NULL, null=True, blank=True, related_name='jugadores')
    en_banquillo = models.BooleanField(default=True)
    fecha_mercado = models.DateTimeField(null=True, blank=True)
    fecha_fichaje = models.DateTimeField(null=True, blank=True)
    precio_venta = models.IntegerField(null=True, blank=True)
    puja_actual = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.nombre} ({self.posicion})"
    
    @property
    def posicion_display(self):
        return dict(self.POSICIONES).get(self.posicion, self.posicion)
    
    # 🆕 Propiedad para saber si está en el mercado (no expirado)
    @property
    def en_mercado(self):
        from django.utils import timezone
        if not self.fecha_mercado:
            return False
        # Un jugador está en el mercado si se añadió en las últimas 24 horas
        return timezone.now() <= self.fecha_mercado + timedelta(hours=24)
    
    # 🆕 Propiedad para calcular la expiración
    @property
    def expiracion_mercado(self):
        if not self.fecha_mercado:
            return None
        return self.fecha_mercado + timedelta(hours=24)

    @property
    def expirado(self):
        """Verifica si la subasta/mercado ha expirado"""
        if not self.fecha_mercado:
            return False
        from django.utils import timezone
        tiempo_transcurrido = timezone.now() - self.fecha_mercado
        return tiempo_transcurrido.days >= 1  # 1 día de duración

    def realizar_puja(self, equipo, monto):
        """Crear una puja por este jugador (solo para jugadores libres)"""
        if not self.en_mercado:
            raise ValueError("El jugador no está en el mercado")

        if monto <= (self.puja_actual or 0):
            raise ValueError("La puja debe ser mayor a la puja actual")

        # Crear nueva puja
        from .models import Puja  # Import local para evitar circular
        puja = Puja.objects.create(
            jugador=self,
            equipo=equipo,
            monto=monto
        )

        # Actualizar puja actual
        self.puja_actual = monto
        self.save()

        return puja

    def finalizar_subasta(self):
        """Finalizar subasta y transferir jugador al mejor postor"""
        if self.en_mercado and self.puja_actual:
            # Obtener la puja ganadora (mayor monto)
            puja_ganadora = self.pujas.filter(monto=self.puja_actual).first()

            if puja_ganadora:
                # Transferir jugador al equipo ganador
                self.equipo = puja_ganadora.equipo
                self.en_mercado = False
                self.fecha_mercado = None

                # Descontar presupuesto
                puja_ganadora.equipo.presupuesto -= self.puja_actual
                puja_ganadora.equipo.save()

                # Marcar puja ganadora
                puja_ganadora.es_ganadora = True
                puja_ganadora.save()

                self.save()
                return True
        return False

class Equipo(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    liga = models.ForeignKey(Liga, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    presupuesto = models.IntegerField(default=150000000)
    puntos_totales = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.nombre} - {self.usuario.username}"

class Jornada(models.Model):
    numero = models.IntegerField(unique=True)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Jornada {self.numero}"

    class Meta:
        ordering = ['numero']

class Puntuacion(models.Model):
    jugador = models.ForeignKey(Jugador, on_delete=models.CASCADE)
    jornada = models.ForeignKey(Jornada, on_delete=models.CASCADE)
    puntos = models.IntegerField()
    
    class Meta:
        unique_together = ('jugador', 'jornada')
    
    def __str__(self):
        return f"{self.jugador.nombre} - J{self.jornada.numero}: {self.puntos} pts"

class Partido(models.Model):
    jornada = models.ForeignKey(Jornada, on_delete=models.CASCADE, related_name='partidos')
    equipo_local = models.ForeignKey(EquipoReal, on_delete=models.CASCADE, related_name='partidos_local')
    equipo_visitante = models.ForeignKey(EquipoReal, on_delete=models.CASCADE, related_name='partidos_visitante')
    fecha = models.DateTimeField()
    goles_local = models.IntegerField(default=0)
    goles_visitante = models.IntegerField(default=0)
    jugado = models.BooleanField(default=False)

    class Meta:
        ordering = ['fecha']
        indexes = [
            models.Index(fields=['jornada', 'fecha']),
        ]

    def __str__(self):
        return f"{self.equipo_local} vs {self.equipo_visitante} - J{self.jornada.numero}"

    @property
    def resultado(self):
        if not self.jugado:
            return "Pendiente"
        return f"{self.goles_local} - {self.goles_visitante}"

class Alineacion(models.Model):
    equipo = models.OneToOneField(Equipo, on_delete=models.CASCADE, related_name='alineacion')
    
    # Titulares (posición específica en el campo)
    portero_titular = models.ForeignKey(Jugador, on_delete=models.CASCADE, related_name='portero_titular', null=True, blank=True)
    defensa1_titular = models.ForeignKey(Jugador, on_delete=models.CASCADE, related_name='defensa1_titular', null=True, blank=True)
    defensa2_titular = models.ForeignKey(Jugador, on_delete=models.CASCADE, related_name='defensa2_titular', null=True, blank=True)
    delantero1_titular = models.ForeignKey(Jugador, on_delete=models.CASCADE, related_name='delantero1_titular', null=True, blank=True)
    delantero2_titular = models.ForeignKey(Jugador, on_delete=models.CASCADE, related_name='delantero2_titular', null=True, blank=True)
    
    # Banquillo (máximo 6 jugadores)
    banquillo = models.ManyToManyField(Jugador, related_name='banquillo', blank=True)
    
    def __str__(self):
        return f"Alineación de {self.equipo.nombre}"
    
    def clean(self):
        """Validar que los titulares estén en la posición correcta"""
        if self.portero_titular and self.portero_titular.posicion != 'POR':
            raise ValidationError('El portero titular debe ser un PORTERO')
        if self.defensa1_titular and self.defensa1_titular.posicion != 'DEF':
            raise ValidationError('Los defensas titulares deben ser DEFENSAS')
        if self.defensa2_titular and self.defensa2_titular.posicion != 'DEF':
            raise ValidationError('Los defensas titulares deben ser DEFENSAS')
        if self.delantero1_titular and self.delantero1_titular.posicion != 'DEL':
            raise ValidationError('Los delanteros titulares deben ser DELANTEROS')
        if self.delantero2_titular and self.delantero2_titular.posicion != 'DEL':
            raise ValidationError('Los delanteros titulares deben ser DELANTEROS')
    
    @property
    def titulares(self):
        """Devuelve todos los titulares"""
        titulares = []
        if self.portero_titular:
            titulares.append(self.portero_titular)
        if self.defensa1_titular:
            titulares.append(self.defensa1_titular)
        if self.defensa2_titular:
            titulares.append(self.defensa2_titular)
        if self.delantero1_titular:
            titulares.append(self.delantero1_titular)
        if self.delantero2_titular:
            titulares.append(self.delantero2_titular)
        return titulares
    
    @property
    def total_titulares(self):
        return len([j for j in [self.portero_titular, self.defensa1_titular, self.defensa2_titular,
                               self.delantero1_titular, self.delantero2_titular] if j is not None])

class Oferta(models.Model):
    """Oferta de compra por un jugador que pertenece a otro usuario"""
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'),
        ('retirada', 'Retirada'),
        ('expirada', 'Expirada'),
    ]

    jugador = models.ForeignKey('Jugador', on_delete=models.CASCADE, related_name='ofertas')
    equipo_ofertante = models.ForeignKey('Equipo', on_delete=models.CASCADE, related_name='ofertas_realizadas')
    equipo_receptor = models.ForeignKey('Equipo', on_delete=models.CASCADE, related_name='ofertas_recibidas')
    monto = models.IntegerField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    fecha_oferta = models.DateTimeField(auto_now_add=True)
    fecha_respuesta = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha_oferta']

    def __str__(self):
        return f"{self.equipo_ofertante.nombre} -> {self.jugador.nombre} (€{self.monto})"

    def aceptar(self):
        """Aceptar la oferta: transferir jugador y dinero"""
        if self.estado == 'pendiente':
            from django.utils import timezone

            # Validar que el ofertante tenga presupuesto
            if self.equipo_ofertante.presupuesto < self.monto:
                raise ValueError("El equipo ofertante no tiene presupuesto suficiente")

            self.estado = 'aceptada'
            self.fecha_respuesta = timezone.now()
            self.save()

            # Transferir jugador
            self.jugador.equipo = self.equipo_ofertante
            self.jugador.en_venta = False
            self.jugador.save()

            # Transferir dinero
            self.equipo_ofertante.presupuesto -= self.monto
            self.equipo_ofertante.save()

            self.equipo_receptor.presupuesto += self.monto
            self.equipo_receptor.save()

            # Cancelar otras ofertas pendientes por este jugador
            Oferta.objects.filter(
                jugador=self.jugador,
                estado='pendiente'
            ).exclude(id=self.id).update(estado='expirada')

            return True
        return False

    def rechazar(self):
        """Rechazar la oferta"""
        if self.estado == 'pendiente':
            from django.utils import timezone
            self.estado = 'rechazada'
            self.fecha_respuesta = timezone.now()
            self.save()
            return True
        return False

    def retirar(self):
        """Retirar la oferta (solo el ofertante puede hacerlo)"""
        if self.estado == 'pendiente':
            from django.utils import timezone
            self.estado = 'retirada'
            self.fecha_respuesta = timezone.now()
            self.save()
            return True
        return False

class Puja(models.Model):
    """Puja en subasta por un jugador libre (sin equipo)"""
    jugador = models.ForeignKey('Jugador', on_delete=models.CASCADE, related_name='pujas')
    equipo = models.ForeignKey('Equipo', on_delete=models.CASCADE, related_name='pujas')
    monto = models.IntegerField()
    fecha_puja = models.DateTimeField(auto_now_add=True)
    es_ganadora = models.BooleanField(default=False)

    class Meta:
        ordering = ['-monto', 'fecha_puja']

    def __str__(self):
        return f"{self.equipo.nombre} puja €{self.monto} por {self.jugador.nombre}"