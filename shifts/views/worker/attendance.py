from django.utils.dateparse import parse_date
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shifts.models import Shift
from accounts.models.worker import Worker
from shifts.serializers import WorkerShiftUpsertSerializer, ShiftSerializer


class WorkerAttendanceUpsertView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        worker = Worker.objects.filter(user=request.user).first()
        if not worker:
            return Response({"ok": False, "message": "Worker not found"}, status=403)

        serializer = WorkerShiftUpsertSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"ok": False, "message": "Invalid data", "errors": serializer.errors}, status=400)

        data = serializer.validated_data
        attendance_date = data["attendance_date"]
        
        defaults = {
            "shift_type": data.get("shift_type"),
            "status": data.get("status", Shift.Status.PRESENT),
            "absence_reason": data.get("absence_reason"),
        }

        if data.get("worker_start_location") is not None:
            defaults["worker_start_location"] = data["worker_start_location"]
        if data.get("worker_end_location") is not None:
            defaults["worker_end_location"] = data["worker_end_location"]
        
        action = data.get("action", "start")
        if action == "start":
            current_time = data.get("worker_start_date_time") or now()
            defaults["worker_start_date_time"] = current_time
            defaults["start_date_time"] = current_time
        elif action == "end":
            current_time = data.get("worker_end_date_time") or now()
            defaults["worker_end_date_time"] = current_time
            defaults["end_date_time"] = current_time

        shift, created = Shift.objects.update_or_create(
            attendance_date=attendance_date,
            recorded_by_worker=worker,
            defaults=defaults,
        )

        return Response({"ok": True, "data": ShiftSerializer(shift).data})


class WorkerAttendanceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        worker = Worker.objects.filter(user=request.user).first()
        attendance_date = parse_date(request.data.get("attendance_date"))

        shift = Shift.objects.filter(
            attendance_date=attendance_date,
            recorded_by_worker=worker,
        ).first()

        if not shift:
            return Response({"ok": True, "data": None})

        return Response(
            {
                "ok": True,
                "data": ShiftSerializer(shift).data,
            }
        )

class WorkerAttendanceHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        worker = Worker.objects.filter(user=request.user).first()
        if not worker:
            return Response({"ok": False, "message": "Worker not found"}, status=403)
        
        # Optionally filter by month/year if needed
        # For now, let's return all shifts
        shifts = Shift.objects.filter(recorded_by_worker=worker).order_by("-attendance_date")
        return Response({
            "ok": True,
            "data": ShiftSerializer(shifts, many=True).data
        })
