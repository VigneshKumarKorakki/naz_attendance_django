from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.models.staff import Staff
from core.responses import api_response
from shifts.models import Shift


class StaffShiftUpsertSerializer(serializers.Serializer):
    attendance_date = serializers.DateField(required=True)
    shift_type = serializers.ChoiceField(choices=Shift.ShiftType.choices, required=False)
    status = serializers.ChoiceField(choices=Shift.Status.choices, required=False)
    absence_reason = serializers.ChoiceField(choices=Shift.AbsenceReason.choices, required=False)
    hours = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    start_date_time = serializers.DateTimeField(required=False)
    end_date_time = serializers.DateTimeField(required=False)
    staff_start_date_time = serializers.DateTimeField(required=False)
    staff_end_date_time = serializers.DateTimeField(required=False)


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = "__all__"


class StaffShiftUpsertView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StaffShiftUpsertSerializer

    def get(self, request):
        staff = Staff.objects.filter(user=request.user, is_active=True).first()
        if staff is None:
            return api_response(
                ok=False,
                message="Staff access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        shifts = Shift.objects.all().order_by("-attendance_date")
        return api_response(
            ok=True,
            message="Shift list",
            data=ShiftSerializer(shifts, many=True).data,
        )

    def patch(self, request):
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return api_response(
                ok=False,
                message="Missing or invalid data",
                errors=serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff = Staff.objects.filter(user=request.user, is_active=True).first()
        if staff is None:
            return api_response(
                ok=False,
                message="Staff access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        attendance_date = serializer.validated_data["attendance_date"]
        shift = Shift.objects.filter(
            recorded_by_staff=staff,
            attendance_date=attendance_date,
        ).first()

        if shift is None:
            if "shift_type" not in serializer.validated_data or "status" not in serializer.validated_data:
                return api_response(
                    ok=False,
                    message="shift_type and status are required to create a shift",
                    status=status.HTTP_400_BAD_REQUEST,
                )
            shift = Shift(
                recorded_by_staff=staff,
                attendance_date=attendance_date,
            )

        for field, value in serializer.validated_data.items():
            if field == "attendance_date":
                continue
            setattr(shift, field, value)

        shift.full_clean()
        shift.save()

        return api_response(
            ok=True,
            message="Shift saved",
            data=ShiftSerializer(shift).data,
        )


class StaffShiftDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, shift_id):
        staff = Staff.objects.filter(user=request.user, is_active=True).first()
        if staff is None:
            return api_response(
                ok=False,
                message="Staff access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        shift = Shift.objects.filter(id=shift_id).first()
        if shift is None:
            return api_response(
                ok=False,
                message="Shift not found",
                status=status.HTTP_404_NOT_FOUND,
            )

        return api_response(
            ok=True,
            message="Shift detail",
            data=ShiftSerializer(shift).data,
        )

    def delete(self, request, shift_id):
        staff = Staff.objects.filter(user=request.user, is_active=True).first()
        if staff is None:
            return api_response(
                ok=False,
                message="Staff access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        shift = Shift.objects.filter(id=shift_id).first()
        if shift is None:
            return api_response(
                ok=False,
                message="Shift not found",
                status=status.HTTP_404_NOT_FOUND,
            )

        if shift.recorded_by_worker_id is not None:
            return api_response(
                ok=False,
                message="Cannot delete worker-recorded shift",
                status=status.HTTP_409_CONFLICT,
            )

        if shift.recorded_by_staff_id != staff.id:
            return api_response(
                ok=False,
                message="Cannot delete another staff's shift",
                status=status.HTTP_403_FORBIDDEN,
            )

        shift.delete()
        return api_response(
            ok=True,
            message="Shift deleted",
        )
