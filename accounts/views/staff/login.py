from django.contrib.auth import authenticate, login
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from accounts.models.staff import Staff
from core.responses import api_response


class StaffLoginSerializer(serializers.Serializer):
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


class StaffLoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = StaffLoginSerializer

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

        staff = Staff.objects.filter(user=user).select_related("company").first()
        if staff is None or not staff.is_active:
            return api_response(
                ok=False,
                message="Staff access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)
        display_name = (str(staff) if staff else None) or user.get_full_name() or user.get_username()
        return api_response(
            ok=True,
            message="Login success",
            data={
                "name": display_name,
                "staff_id": staff.id,
                "company_id": staff.company_id,
            },
        )
