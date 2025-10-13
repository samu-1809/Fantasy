from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from ..models import Equipo, Liga, Jugador
from ..serializers import RegisterSerializer, LoginSerializer, EquipoSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        print("📥 Datos recibidos:", request.data)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        print(f"👤 Usuario creado: {user.username}")

        # Crear equipo para el nuevo usuario
        liga = Liga.objects.first()
        print(f"🏆 Liga encontrada: {liga}")
        
        equipo = None
        if liga:
            print("🎯 Creando equipo...")
            equipo = Equipo.objects.create(
                usuario=user,
                liga=liga,
                nombre=f"Equipo de {user.username}",
                presupuesto=150000000  # 150M inicial
            )
            print(f"✅ Equipo creado: {equipo.nombre}")

            # ASIGNACIÓN ALEATORIA - 1 POR, 3 DEF, 3 DEL (5 TITULARES + 2 BANQUILLO)
            print("🔄 Asignando 7 jugadores (5 titulares + 2 banquillo)...")
            
            presupuesto_maximo = 100000000  # 100M para jugadores
            presupuesto_actual = presupuesto_maximo
            jugadores_asignados = []
            
            # 1. PORTERO - aleatorio que quepa en el presupuesto (TITULAR)
            porteros = Jugador.objects.filter(
                equipo__isnull=True, 
                posicion='POR',
                valor__lte=presupuesto_actual
            ).order_by('?')
            
            portero = porteros.first() if porteros.exists() else None
            
            if portero:
                jugadores_asignados.append(portero)
                presupuesto_actual -= portero.valor
                print(f"✅ PORTERO TITULAR: {portero.nombre} - €{portero.valor:,}")
            else:
                print("❌ No hay porteros disponibles")
                equipo.delete()
                return Response({"error": "No hay porteros disponibles"}, status=400)

            # 2. DEFENSAS - 3 aleatorias que quepan en el presupuesto (2 TITULARES + 1 BANQUILLO)
            defensas = Jugador.objects.filter(
                equipo__isnull=True, 
                posicion='DEF',
                valor__lte=presupuesto_actual
            ).order_by('?')[:3]
            
            if len(defensas) == 3:
                for defensa in defensas:
                    jugadores_asignados.append(defensa)
                    presupuesto_actual -= defensa.valor
                print(f"✅ 3 DEFENSAS asignadas (2 titulares + 1 banquillo)")
            else:
                print(f"❌ Solo {len(defensas)} defensas disponibles")
                equipo.delete()
                return Response({"error": f"Solo {len(defensas)} defensas disponibles"}, status=400)

            # 3. DELANTEROS - 3 aleatorios que quepan en el presupuesto (2 TITULARES + 1 BANQUILLO)
            delanteros = Jugador.objects.filter(
                equipo__isnull=True, 
                posicion='DEL',
                valor__lte=presupuesto_actual
            ).order_by('?')[:3]
            
            if len(delanteros) == 3:
                for delantero in delanteros:
                    jugadores_asignados.append(delantero)
                    presupuesto_actual -= delantero.valor
                print(f"✅ 3 DELANTEROS asignados (2 titulares + 1 banquillo)")
            else:
                print(f"❌ Solo {len(delanteros)} delanteros disponibles")
                equipo.delete()
                return Response({"error": f"Solo {len(delanteros)} delanteros disponibles"}, status=400)

            # VERIFICAR ASIGNACIÓN COMPLETA Y GUARDAR
            if len(jugadores_asignados) == 7:
                costo_total = sum(j.valor for j in jugadores_asignados)
                
                # Separar por posiciones para asignar titulares y banquillo
                porteros_asignados = [j for j in jugadores_asignados if j.posicion == 'POR']
                defensas_asignados = [j for j in jugadores_asignados if j.posicion == 'DEF']
                delanteros_asignados = [j for j in jugadores_asignados if j.posicion == 'DEL']
                
                # Asignar titulares (1 POR, 2 DEF, 2 DEL) y banquillo (1 DEF, 1 DEL)
                # Titulares
                for jugador in porteros_asignados[:1] + defensas_asignados[:2] + delanteros_asignados[:2]:
                    jugador.equipo = equipo
                    jugador.en_banquillo = False  # Titular
                    jugador.save()
                
                # Banquillo (los restantes: 1 DEF, 1 DEL)
                for jugador in defensas_asignados[2:] + delanteros_asignados[2:]:
                    jugador.equipo = equipo
                    jugador.en_banquillo = True  # Banquillo
                    jugador.save()
                
                # Actualizar presupuesto del equipo
                equipo.presupuesto = 150000000 - costo_total
                equipo.save()
                
                print(f"🎉 EQUIPO COMPLETO: 7 jugadores (5 titulares + 2 banquillo) - €{costo_total:,}")
                print(f"💰 Presupuesto final: €{equipo.presupuesto:,}")
                
                # Mostrar resumen del equipo
                print("\n📊 RESUMEN DEL EQUIPO:")
                titulares = [j for j in jugadores_asignados if not j.en_banquillo]
                banquillo = [j for j in jugadores_asignados if j.en_banquillo]
                
                print("   ⭐ TITULARES:")
                for jugador in titulares:
                    print(f"     • {jugador.posicion}: {jugador.nombre} - €{jugador.valor:,}")
                
                print("   🪑 BANQUILLO:")
                for jugador in banquillo:
                    print(f"     • {jugador.posicion}: {jugador.nombre} - €{jugador.valor:,}")
                
            else:
                print(f"❌ Asignación incompleta: {len(jugadores_asignados)}/7 jugadores")
                equipo.delete()
                return Response({"error": "Asignación incompleta de jugadores"}, status=400)

        else:
            print("❌ No se encontró liga")
            return Response({"error": "No se encontró liga"}, status=400)

        # Generar tokens
        refresh = RefreshToken.for_user(user)

        # Serializar el equipo con tu EquipoSerializer
        equipo_serializer = EquipoSerializer(equipo)

        response_data = {
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            },
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'equipo_creado': True,
            'jugadores_asignados': len(jugadores_asignados),
            'titulares': 5,
            'banquillo': 2,
            'presupuesto_restante': equipo.presupuesto,
            'costo_equipo': costo_total,
            'equipo': equipo_serializer.data,
            'message': 'Usuario registrado y equipo creado exitosamente con 5 titulares y 2 jugadores en el banquillo'
        }

        response = Response(response_data, status=status.HTTP_201_CREATED)

        # Cookie para refresh token
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=7*24*60*60
        )

        return response

class LoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        print(f"🔐 Login attempt: {username}")
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            refresh = RefreshToken.for_user(user)
            
            # Obtener equipo del usuario
            try:
                equipo = Equipo.objects.get(usuario=user)
                equipo_data = self.get_serializer(equipo).data
                print(f"✅ Equipo encontrado: {equipo.nombre}")
            except Equipo.DoesNotExist:
                equipo_data = None
                print("❌ No se encontró equipo")
            
            response_data = {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser
                },
                'equipo': equipo_data,
                'access': str(refresh.access_token),
            }
            
            print(f"📤 Enviando respuesta: {response_data}")
            
            return Response(response_data)
        
        print("❌ Autenticación fallida")
        return Response(
            {'error': 'Credenciales inválidas'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )