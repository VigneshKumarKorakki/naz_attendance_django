from django.contrib.auth import authenticate, login
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models.owner import Owner
from core.responses import api_response


class OwnerLoginSerializer(serializers.Serializer):
    login = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(required=True)

    def validate(self, attrs):
        resolved_login = attrs.get("login") or attrs.get("username") or attrs.get("email")
        if not resolved_login:
            raise serializers.ValidationError({"login": "Login is required."})
        attrs["resolved_login"] = resolved_login
        return attrs


class OwnerLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = OwnerLoginSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return api_response(
                ok=False,
                message="Missing credentials",
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = serializer.validated_data["resolved_login"]
        password = serializer.validated_data["password"]
        user = authenticate(request, username=username, password=password)
        if user is None:
            return api_response(
                ok=False,
                message="Invalid credentials",
                status=status.HTTP_401_UNAUTHORIZED,
            )

        owner = Owner.objects.filter(user=user).select_related("user").first()
        if owner is None:
            return api_response(
                ok=False,
                message="Owner access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)
        refresh = RefreshToken.for_user(user)
        refresh["role"] = "owner"
        access = refresh.access_token
        access["role"] = "owner"
        display_name = owner.user.get_full_name() or owner.user.get_username()
        return api_response(
            ok=True,
            message="Login success",
            data={
                "name": display_name,
                "owner_id": owner.id,
                "refresh": str(refresh),
                "access": str(access),
                "role": "owner",
            },
        )
