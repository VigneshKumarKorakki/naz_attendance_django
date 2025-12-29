from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from shifts.models import Shift
from django.utils import timezone

class WorkerShiftUpsertView(APIView):
    def post(self, request):
        worker = request.user.worker  # assuming request.user is linked to Worker
        data = request.data

        shift_type = data.get("shift_type")
        attendance_date = data.get("attendance_date") or timezone.now().date()
        status_value = data.get("status", "present")

        # create or update shift
        shift, created = Shift.objects.update_or_create(
            recorded_by_worker=worker,
            attendance_date=attendance_date,
            defaults={"shift_type": shift_type, "status": status_value},
        )

        return Response({
            "id": shift.id,
            "shift_type": shift.shift_type,
            "attendance_date": shift.attendance_date,
            "status": shift.status,
            "created": created
        }, status=status.HTTP_200_OK)

