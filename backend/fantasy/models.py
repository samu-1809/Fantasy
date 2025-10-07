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
    equipo = models.ForeignKey('Equipo', on_delete=models.SET_NULL, null=True, blank=True, related_name='jugadores_fichados')
    en_banquillo = models.BooleanField(default=True)
    fecha_mercado = models.DateTimeField(null=True, blank=True)
    fecha_fichaje = models.DateTimeField(null=True, blank=True)  # 🆕 Si no la tienes

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

class Equipo(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    liga = models.ForeignKey(Liga, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    presupuesto = models.IntegerField(default=150000000)
    puntos_totales = models.IntegerField(default=0)
    jugadores = models.ManyToManyField(Jugador, related_name='equipos_mtm')

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