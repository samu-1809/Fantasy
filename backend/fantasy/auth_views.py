"""
Custom JWT Authentication Views con httpOnly cookies
Implementa hybrid approach: access token en memoria, refresh token en cookie
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken


class CookieTokenObtainPairView(TokenObtainPairView):
    """
    Login que retorna access token en JSON y refresh token en httpOnly cookie
    Más seguro que localStorage ya que httpOnly cookies no son accesibles desde JavaScript
    """
    def post(self, request, *args, **kwargs):
        # Llamar al método padre para obtener los tokens
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Extraer refresh token del response body
            refresh_token = response.data.get('refresh')

            if refresh_token:
                # Mover refresh token a httpOnly cookie
                response.set_cookie(
                    key='refresh_token',
                    value=refresh_token,
                    httponly=True,  # No accesible desde JavaScript (protege contra XSS)
                    secure=False,   # True en producción (solo HTTPS)
                    samesite='Lax', # Protege contra CSRF
                    max_age=7*24*60*60  # 7 días
                )

                # Remover refresh token del body (ya está en cookie)
                del response.data['refresh']

        return response


class CookieTokenRefreshView(APIView):
    """
    Refresh que lee token de cookie httpOnly y retorna nuevo access token
    """
    def post(self, request):
        # Leer refresh token de cookie
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token no encontrado en cookies'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            # Crear objeto RefreshToken y obtener nuevo access token
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            # Si ROTATE_REFRESH_TOKENS está activo, obtenemos un nuevo refresh token
            response_data = {
                'access': access_token,
            }

            response = Response(response_data, status=status.HTTP_200_OK)

            # Si hay token rotation, actualizar cookie con nuevo refresh token
            # (SimpleJWT lo hace automáticamente cuando se llama a refresh.access_token)
            # Por ahora dejamos el mismo refresh token en la cookie

            return response

        except TokenError as e:
            return Response(
                {'error': 'Refresh token inválido o expirado', 'detail': str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    """
    Logout que blacklistea el refresh token y limpia la cookie
    """
    def post(self, request):
        try:
            # Leer refresh token de cookie
            refresh_token = request.COOKIES.get('refresh_token')

            if refresh_token:
                # Blacklistear el token para que no pueda ser usado de nuevo
                token = RefreshToken(refresh_token)
                token.blacklist()

            # Crear response y eliminar cookie
            response = Response(
                {'message': 'Logout exitoso'},
                status=status.HTTP_200_OK
            )
            response.delete_cookie('refresh_token')

            return response

        except TokenError:
            # Aunque el token sea inválido, igual limpiamos la cookie
            response = Response(
                {'message': 'Logout exitoso'},
                status=status.HTTP_200_OK
            )
            response.delete_cookie('refresh_token')
            return response

        except Exception as e:
            return Response(
                {'error': 'Error al hacer logout', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
