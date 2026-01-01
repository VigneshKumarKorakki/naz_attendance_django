from rest_framework import serializers
from accounts.models.worker import Worker
from accounts.models.staff import Staff
from shifts.models import Shift

class WorkerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = Worker
        fields = [
            "id", 
            "emirates_id", 
            "whatsapp_number", 
            "company_name", 
            "company_phone", 
            "employee_code", 
            "is_active",
            "full_name"
        ]

class WorkerShiftUpsertSerializer(serializers.Serializer):
    attendance_date = serializers.DateField(required=True)
    shift_type = serializers.ChoiceField(choices=Shift.ShiftType.choices, required=False)
    status = serializers.ChoiceField(choices=Shift.Status.choices, required=False)
    absence_reason = serializers.ChoiceField(choices=Shift.AbsenceReason.choices, required=False, allow_null=True)
    worker_start_date_time = serializers.DateTimeField(required=False, allow_null=True)
    worker_end_date_time = serializers.DateTimeField(required=False, allow_null=True)
    worker_start_location = serializers.JSONField(required=False, allow_null=True)
    worker_end_location = serializers.JSONField(required=False, allow_null=True)
    action = serializers.ChoiceField(choices=["start", "end"], required=False, default="start")

class ShiftSerializer(serializers.ModelSerializer):
    recorded_by_worker_name = serializers.CharField(source="recorded_by_worker.__str__", read_only=True, default=None)
    recorded_by_staff_name = serializers.CharField(source="recorded_by_staff.__str__", read_only=True, default=None)

    class Meta:
        model = Shift
        fields = "__all__"
