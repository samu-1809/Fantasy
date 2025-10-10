from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Liga, Jugador, Equipo, Jornada, Puntuacion, EquipoReal, Partido, Oferta, Puja

class LigaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Liga
        fields = ['id', 'nombre', 'codigo', 'jornada_actual']

class PuntuacionJornadaSerializer(serializers.ModelSerializer):
    jornada_numero = serializers.IntegerField(source='jornada.numero', read_only=True)
    jornada_id = serializers.IntegerField(source='jornada.id', read_only=True)

    class Meta:
        model = Puntuacion
        fields = ['jornada_id', 'jornada_numero', 'puntos']

class JugadorSerializer(serializers.ModelSerializer):
    equipo_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    usuario_vendedor = serializers.CharField(source='equipo.usuario.username', read_only=True)
    usuario_vendedor_id = serializers.IntegerField(source='equipo.usuario.id', read_only=True)
    equipo_real_nombre = serializers.CharField(source='equipo_real.nombre', read_only=True)
    puntuaciones_jornadas = serializers.SerializerMethodField()

    class Meta:
        model = Jugador
        fields = ['id', 'nombre', 'posicion', 'valor', 'precio_venta', 'en_venta', 
                 'fecha_mercado', 'equipo_nombre', 'equipo_real_nombre', 'usuario_vendedor', 'usuario_vendedor_id',
                 'puntos_totales', 'en_banquillo', 'puntuaciones_jornadas']

    def get_puntuaciones_jornadas(self, obj):
        # Obtener las puntuaciones del jugador por jornada
        puntuaciones = Puntuacion.objects.filter(jugador=obj).select_related('jornada')
        return PuntuacionJornadaSerializer(puntuaciones, many=True).data

class JugadorDetailSerializer(serializers.ModelSerializer):
    equipo_nombre = serializers.CharField(source='equipo.nombre', read_only=True, allow_null=True)
    equipo_real_nombre = serializers.CharField(source='equipo_real.nombre', read_only=True, allow_null=True)
    puntuaciones_jornadas = serializers.SerializerMethodField()

    class Meta:
        model = Jugador
        fields = ['id', 'nombre', 'posicion', 'valor', 'equipo_real_nombre', 
                 'equipo_nombre', 'puntos_totales', 'puntuaciones_jornadas']

    def get_puntuaciones_jornadas(self, obj):
        # Obtener las puntuaciones del jugador por jornada
        puntuaciones = Puntuacion.objects.filter(jugador=obj).select_related('jornada')
        return PuntuacionJornadaSerializer(puntuaciones, many=True).data

class EquipoSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    liga_nombre = serializers.CharField(source='liga.nombre', read_only=True)
    jugadores = JugadorSerializer(many=True, read_only=True)
    jugadores_campo = serializers.SerializerMethodField()
    jugadores_banquillo = serializers.SerializerMethodField() 
    
    class Meta:
        model = Equipo
        fields = [
            'id', 'nombre', 'usuario', 'usuario_username', 'liga', 'liga_nombre', 
            'presupuesto', 'puntos_totales', 'jugadores',
            'jugadores_campo', 'jugadores_banquillo'
        ]
    
    def get_jugadores_campo(self, obj):
        """Jugadores en el campo (no en banquillo)"""
        jugadores_campo = obj.jugadores.filter(en_banquillo=False)
        return JugadorSerializer(jugadores_campo, many=True).data
    
    def get_jugadores_banquillo(self, obj):
        """Jugadores en el banquillo"""
        jugadores_banquillo = obj.jugadores.filter(en_banquillo=True)
        return JugadorSerializer(jugadores_banquillo, many=True).data

class PuntuacionSerializer(serializers.ModelSerializer):
    jugador_nombre = serializers.CharField(source='jugador.nombre', read_only=True)
    jornada_numero = serializers.IntegerField(source='jornada.numero', read_only=True)
    
    class Meta:
        model = Puntuacion
        fields = ['id', 'jugador', 'jugador_nombre', 'jornada', 'jornada_numero', 'puntos']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        extra_kwargs = {'password': {'write_only': True}}

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class EquipoRealSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipoReal
        fields = ['id', 'nombre']

class JornadaSerializer(serializers.ModelSerializer):
    partidos_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Jornada
        fields = ['id', 'numero', 'fecha', 'partidos_count']
    
    def get_partidos_count(self, obj):
        return obj.partidos.count()

class PartidoSerializer(serializers.ModelSerializer):
    equipo_local_nombre = serializers.CharField(source='equipo_local.nombre', read_only=True)
    equipo_visitante_nombre = serializers.CharField(source='equipo_visitante.nombre', read_only=True)
    jornada_numero = serializers.IntegerField(source='jornada.numero', read_only=True)

    class Meta:
        model = Partido
        fields = [
            'id', 'jornada', 'jornada_numero', 'equipo_local', 'equipo_visitante',
            'equipo_local_nombre', 'equipo_visitante_nombre', 'goles_local', 
            'goles_visitante', 'fecha', 'jugado'
        ]

    def validate(self, data):
        instance = getattr(self, 'instance', None)
        
        if instance and not any(field in data for field in ['equipo_local', 'equipo_visitante']):
            return data

        equipo_local = data.get('equipo_local', instance.equipo_local if instance else None)
        equipo_visitante = data.get('equipo_visitante', instance.equipo_visitante if instance else None)

        if equipo_local and equipo_visitante and equipo_local == equipo_visitante:
            raise serializers.ValidationError("Un equipo no puede jugar contra sí mismo.")

        jornada = data.get('jornada', instance.jornada if instance else None)

        if not jornada:
            return data

        partidos_query = Partido.objects.filter(jornada=jornada)
        if instance:
            partidos_query = partidos_query.exclude(id=instance.id)

        if equipo_local and partidos_query.filter(equipo_local=equipo_local).exists():
            raise serializers.ValidationError(f"El equipo {equipo_local.nombre} ya tiene un partido como local en esta jornada.")

        if equipo_visitante and partidos_query.filter(equipo_visitante=equipo_visitante).exists():
            raise serializers.ValidationError(f"El equipo {equipo_visitante.nombre} ya tiene un partido como visitante en esta jornada.")

        if equipo_local and partidos_query.filter(equipo_visitante=equipo_local).exists():
            raise serializers.ValidationError(f"El equipo {equipo_local.nombre} ya tiene un partido como visitante en esta jornada.")

        if equipo_visitante and partidos_query.filter(equipo_local=equipo_visitante).exists():
            raise serializers.ValidationError(f"El equipo {equipo_visitante.nombre} ya tiene un partido como local en esta jornada.")

        return data

class FicharJugadorSerializer(serializers.Serializer):
    jugador_id = serializers.IntegerField()
    en_banquillo = serializers.BooleanField(required=False, allow_null=True)

class VenderJugadorSerializer(serializers.Serializer):
    jugador_id = serializers.IntegerField()
    precio_venta = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_precio_venta(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("El precio de venta debe ser mayor a 0")
        return value

class OfertaSerializer(serializers.ModelSerializer):
    jugador_nombre = serializers.CharField(source='jugador.nombre', read_only=True)
    jugador_posicion = serializers.CharField(source='jugador.posicion', read_only=True)
    jugador_equipo = serializers.CharField(source='jugador.equipo.nombre', read_only=True)
    equipo_ofertante_nombre = serializers.CharField(source='equipo_ofertante.nombre', read_only=True)
    equipo_receptor_nombre = serializers.CharField(source='equipo_receptor.nombre', read_only=True)
    
    class Meta:
        model = Oferta
        fields = [
            'id', 'jugador', 'jugador_nombre', 'jugador_posicion', 'jugador_equipo',
            'equipo_ofertante', 'equipo_ofertante_nombre', 'equipo_receptor', 'equipo_receptor_nombre',
            'monto', 'estado', 'fecha_oferta', 'fecha_respuesta'
        ]

class PujaSerializer(serializers.ModelSerializer):
    equipo_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    jugador_nombre = serializers.CharField(source='jugador.nombre', read_only=True)
    jugador_posicion = serializers.CharField(source='jugador.posicion', read_only=True)
    jugador_equipo_real_nombre = serializers.CharField(source='jugador.equipo_real.nombre', read_only=True)
    valor_jugador = serializers.IntegerField(source='jugador.valor', read_only=True)
    puntos_jugador = serializers.IntegerField(source='jugador.puntos_totales', read_only=True)
    jugador_en_venta = serializers.BooleanField(source='jugador.en_venta', read_only=True)
    jugador_expirado = serializers.BooleanField(source='jugador.expirado', read_only=True)
    fecha_mercado = serializers.DateTimeField(source='jugador.fecha_mercado', read_only=True)
    
    class Meta:
        model = Puja
        fields = [
            'id', 'jugador', 'jugador_nombre', 'jugador_posicion', 
            'jugador_equipo_real_nombre', 'equipo', 'equipo_nombre', 
            'monto', 'fecha_puja', 'es_ganadora', 'valor_jugador',
            'puntos_jugador', 'jugador_en_venta', 'jugador_expirado', 'fecha_mercado'
        ]

class JugadorMercadoSerializer(serializers.ModelSerializer):
    equipo_real_nombre = serializers.CharField(source='equipo_real.nombre', read_only=True)
    pujador_actual = serializers.CharField(source='equipo_pujador.nombre', read_only=True)
    expirado = serializers.SerializerMethodField()
    en_venta = serializers.BooleanField() 
    
    class Meta:
        model = Jugador
        fields = [
            'id', 'nombre', 'posicion', 'equipo_real', 'equipo_real_nombre', 
            'valor', 'puntos_totales', 'en_venta', 'fecha_mercado',
            'precio_venta', 'puja_actual', 'pujador_actual', 'expirado'
        ]
    
    def get_expirado(self, obj):
        return obj.expirado