from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
from django.utils import timezone



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
    equipo_pujador = models.ForeignKey('Equipo', on_delete=models.SET_NULL, null=True, blank=True, related_name='pujas_actuales')

    def __str__(self):
        return f"{self.nombre} ({self.posicion})"
    
    @property
    def posicion_display(self):
        return dict(self.POSICIONES).get(self.posicion, self.posicion)
    
    # 🆕 Propiedad para saber si está en el mercado (no expirado)
    @property
    def en_mercado(self):
        if not self.fecha_mercado:
            return False
        return timezone.now() <= self.fecha_mercado + timedelta(hours=24)
    
    # 🆕 Propiedad para calcular la expiración
    @property
    def expiracion_mercado(self):
        if not self.fecha_mercado:
            return None
        return self.fecha_mercado + timedelta(hours=24)
    
    # 🆕 CORREGIR LA INDENTACIÓN DE ESTOS MÉTODOS
    def poner_en_mercado(self, precio=None):
        self.en_venta = True
        self.fecha_mercado = timezone.now()
        if precio:
            self.precio_venta = precio
        self.save()

    def quitar_del_mercado(self):
        self.en_venta = False
        self.fecha_mercado = None
        self.precio_venta = None
        self.puja_actual = None
        self.equipo_pujador = None
        self.save()
        
        # Cancelar todas las pujas
        Puja.objects.filter(jugador=self).update(es_ganadora=False)

    def realizar_puja(self, equipo, monto):
        if not self.en_venta:
            raise ValueError("El jugador no está en el mercado")
        
        if monto <= (self.puja_actual or 0):
            raise ValueError("La puja debe ser mayor a la puja actual")
        
        # Crear nueva puja
        puja = Puja.objects.create(
            jugador=self,
            equipo=equipo,
            monto=monto
        )
        
        # Actualizar puja actual
        self.puja_actual = monto
        self.equipo_pujador = equipo
        self.save()
        
        if self.equipo and self.equipo != equipo:  # No crear oferta si es el mismo equipo
            oferta = Oferta.objects.create(
                jugador=self,
                equipo_ofertante=equipo,
                equipo_receptor=self.equipo,
                monto=monto,
                estado='pendiente'
            )
            print(f"✅ Oferta creada: {equipo.nombre} -> {self.equipo.nombre} por {self.nombre} - €{monto}")
        
        return puja

    def finalizar_subasta(self):
        if self.en_venta and self.equipo_pujador:
            if self.equipo:
                # ✅ Crear oferta cuando un jugador con equipo tiene pujas
                oferta = Oferta.objects.create(
                    jugador=self,
                    equipo_ofertante=self.equipo_pujador,
                    equipo_receptor=self.equipo,
                    monto=self.puja_actual,
                    estado='pendiente'
                )
                print(f"✅ Oferta creada: {self.equipo_pujador.nombre} ofrece €{self.puja_actual} por {self.nombre} a {self.equipo.nombre}")
                
                # Resetear puja pero mantener en mercado
                self.puja_actual = None
                self.equipo_pujador = None
                self.save()
                return {'tipo': 'oferta', 'oferta': oferta}
            else:
                # Jugador libre - transferir directamente
                self.equipo = self.equipo_pujador
                self.en_venta = False
                self.fecha_mercado = None
                
                # Marcar puja ganadora
                puja_ganadora = self.pujas.filter(monto=self.puja_actual).first()
                if puja_ganadora:
                    puja_ganadora.es_ganadora = True
                    puja_ganadora.save()
                
                self.save()
                print(f"✅ Jugador libre transferido: {self.nombre} a {self.equipo.nombre}")
                return {'tipo': 'transferencia', 'jugador': self}
        return None

    @property
    def expirado(self):
        if not self.fecha_mercado:
            return False
        return timezone.now() > self.fecha_mercado + timedelta(hours=24)

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

class Oferta(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'),
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
        return f"{self.equipo_ofertante.nombre} -> {self.jugador.nombre} (${self.monto})"
    
    def aceptar(self):
        if self.estado == 'pendiente':
            self.estado = 'aceptada'
            self.fecha_respuesta = timezone.now()
            self.save()
            
            # Transferir jugador
            self.jugador.equipo = self.equipo_ofertante
            self.jugador.en_venta = False
            self.jugador.precio_venta = None
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
        if self.estado == 'pendiente':
            self.estado = 'rechazada'
            self.fecha_respuesta = timezone.now()
            self.save()
            return True
        return False

class Puja(models.Model):
    jugador = models.ForeignKey('Jugador', on_delete=models.CASCADE, related_name='pujas')
    equipo = models.ForeignKey('Equipo', on_delete=models.CASCADE, related_name='pujas')
    monto = models.IntegerField()
    fecha_puja = models.DateTimeField(auto_now_add=True)
    es_ganadora = models.BooleanField(default=False)
    activa = models.BooleanField(default=True)  # NUEVO CAMPO
    fecha_retirada = models.DateTimeField(null=True, blank=True)  # NUEVO CAMPO
    
    class Meta:
        ordering = ['-monto', 'fecha_puja']
    
    def __str__(self):
        return f"{self.equipo.nombre} puja ${self.monto} por {self.jugador.nombre}"

class TipoNotificacion(models.Model):
    nombre = models.CharField(max_length=100)
    codigo = models.CharField(max_length=50, unique=True)
    es_publica = models.BooleanField(default=False)
    icono = models.CharField(max_length=50, default='📢')
    
    def __str__(self):
        return self.nombre

def crear_tipos_notificacion():
    tipos_base = [
        # Ofertas que tú haces (como comprador)
        {'nombre': 'Oferta Aceptada por Ti', 'codigo': 'oferta_aceptada_comprador', 'icono': '✅', 'es_publica': False},
        {'nombre': 'Oferta Rechazada por Ti', 'codigo': 'oferta_rechazada_comprador', 'icono': '❌', 'es_publica': False},
        
        # Ofertas que te hacen a ti (como vendedor)
        {'nombre': 'Oferta que Aceptaste', 'codigo': 'oferta_aceptada_vendedor', 'icono': '💰', 'es_publica': False},
        {'nombre': 'Oferta que Rechazaste', 'codigo': 'oferta_rechazada_vendedor', 'icono': '🚫', 'es_publica': False},
        
        # Fichajes públicos (PARA TODOS LOS USUARIOS)
        {'nombre': 'Fichaje en la Liga', 'codigo': 'fichaje_publico', 'icono': '⚽', 'es_publica': True},
        {'nombre': 'Oferta Aceptada en Liga', 'codigo': 'oferta_aceptada_liga', 'icono': '🔄', 'es_publica': True},
        
        # Transacciones y otros
        {'nombre': 'Jugador No Adquirido', 'codigo': 'jugador_no_adquirido', 'icono': '❌', 'es_publica': False},
        {'nombre': 'Jugador Retirado Mercado', 'codigo': 'jugador_retirado_mercado', 'icono': '↩️', 'es_publica': False},
        {'nombre': 'Pago Jornada', 'codigo': 'pago_jornada', 'icono': '💸', 'es_publica': False},
        {'nombre': 'Fichaje Exitoso', 'codigo': 'fichaje_exitoso', 'icono': '⚽', 'es_publica': False},
        {'nombre': 'Venta Exitosa', 'codigo': 'venta_exitosa', 'icono': '🛒', 'es_publica': False},
    ]
    
    for tipo_data in tipos_base:
        tipo, created = TipoNotificacion.objects.get_or_create(
            codigo=tipo_data['codigo'],
            defaults=tipo_data
        )
        if created:
            print(f"✅ Tipo de notificación creado: {tipo_data['codigo']}")

class Notificacion(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.ForeignKey(TipoNotificacion, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    datos_extra = models.JSONField(default=dict, blank=True)
    es_leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.tipo.nombre} - {self.usuario.username}"

class TransaccionEconomica(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=50, choices=[
        ('ingreso_jornada', 'Ingreso por Jornada'),
        ('compra_jugador', 'Compra de Jugador'),
        ('venta_jugador', 'Venta de Jugador'),
        ('puja_retirada', 'Puja Retirada'),
    ])
    monto = models.BigIntegerField()
    descripcion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-fecha']