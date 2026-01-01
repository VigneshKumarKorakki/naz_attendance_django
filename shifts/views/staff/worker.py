from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.models.staff import Staff
from accounts.models.worker import Worker
from core.responses import api_response


class StaffWorkerSerializer(serializers.ModelSerializer):
    worker_id = serializers.UUIDField(source="id", read_only=True)
    worker_code = serializers.CharField(source="employee_code", read_only=True)
    worker_name = serializers.SerializerMethodField()
    nationality = serializers.SerializerMethodField()
    worker_phone = serializers.SerializerMethodField()
    trade = serializers.SerializerMethodField()
    labor_card_expiry_date = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = Worker
        fields = [
            "worker_id",
            "worker_code",
            "worker_name",
            "nationality",
            "worker_phone",
            "trade",
            "labor_card_expiry_date",
            "company_name",
        ]

    def get_worker_name(self, obj):
        if obj.user_id:
            full_name = obj.user.get_full_name().strip()
            return full_name or obj.user.get_username()
        return obj.employee_code or "Worker"

    def get_worker_phone(self, obj):
        if obj.user_id and obj.user.phone:
            return obj.user.phone
        return obj.whatsapp_number or None

    def get_company_name(self, obj):
        if obj.company_id:
            return obj.company.name
        return obj.company_name or None

    def get_nationality(self, obj):
        return None

    def get_trade(self, obj):
        return None

    def get_labor_card_expiry_date(self, obj):
        return None


class StaffWorkerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff = Staff.objects.filter(user=request.user, is_active=True).first()
        if staff is None:
            return api_response(
                ok=False,
                message="Staff access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        workers = Worker.objects.select_related("user", "company").order_by("created")
        return api_response(
            ok=True,
            message="Worker list",
            data=StaffWorkerSerializer(workers, many=True).data,
        )


class StaffWorkerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, worker_id):
        staff = Staff.objects.filter(user=request.user, is_active=True).first()
        if staff is None:
            return api_response(
                ok=False,
                message="Staff access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        worker = (
            Worker.objects.select_related("user", "company")
            .filter(id=worker_id)
            .first()
        )
        if worker is None:
            return api_response(
                ok=False,
                message="Worker not found",
                status=status.HTTP_404_NOT_FOUND,
            )

        return api_response(
            ok=True,
            message="Worker detail",
            data=StaffWorkerSerializer(worker).data,
        )
