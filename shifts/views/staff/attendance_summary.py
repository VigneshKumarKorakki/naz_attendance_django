from calendar import monthrange

from django.utils.dateparse import parse_date
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models.worker import Worker
from shifts.models import Shift


class StaffWorkerAttendanceSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        if not year or not month:
            return Response(
                {"ok": False, "message": "year and month are required"}, status=400
            )
        try:
            year_int = int(year)
            month_int = int(month)
            if month_int < 1 or month_int > 12:
                raise ValueError
        except (TypeError, ValueError):
            return Response(
                {"ok": False, "message": "Invalid year or month"}, status=400
            )

        days_in_month = monthrange(year_int, month_int)[1]
        day_keys = [str(day) for day in range(1, days_in_month + 1)]

        shifts = (
            Shift.objects.select_related("recorded_by_worker", "recorded_by_worker__user")
            .filter(
                recorded_by_worker__isnull=False,
                attendance_date__year=year_int,
                attendance_date__month=month_int,
            )
            .order_by("attendance_date")
        )

        worker_map = {}
        for shift in shifts:
            worker = shift.recorded_by_worker
            if not worker:
                continue
            entry = worker_map.get(worker.id)
            if not entry:
                entry = {
                    "worker_id": str(worker.id),
                    "employee_code": worker.employee_code,
                    "employee_name": str(worker),
                    "days": {key: "" for key in day_keys},
                    "absence_reasons": {key: "" for key in day_keys},
                    "total_present": 0,
                    "total_absent": 0,
                }
                worker_map[worker.id] = entry

            day_key = str(shift.attendance_date.day)
            status = shift.status or ""
            entry["days"][day_key] = status
            entry["absence_reasons"][day_key] = shift.absence_reason or ""
            if status == Shift.Status.PRESENT:
                entry["total_present"] += 1
            elif status == Shift.Status.ABSENT or shift.absence_reason:
                entry["total_absent"] += 1

        # Include workers with no shifts for the month
        workers = (
            Worker.objects.select_related("user")
            .order_by("user__first_name", "user__last_name", "employee_code")
        )
        for worker in workers:
            if worker.id in worker_map:
                continue
            worker_map[worker.id] = {
                "worker_id": str(worker.id),
                "employee_code": worker.employee_code,
                "employee_name": str(worker),
                "days": {key: "" for key in day_keys},
                "absence_reasons": {key: "" for key in day_keys},
                "total_present": 0,
                "total_absent": 0,
            }

        data = sorted(worker_map.values(), key=lambda row: row["employee_name"] or "")

        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get("page_size", 25))
        page = paginator.paginate_queryset(data, request)
        paginated = paginator.get_paginated_response(page).data

        return Response(
            {
                "ok": True,
                "year": year_int,
                "month": month_int,
                "days": list(range(1, days_in_month + 1)),
                "count": paginated.get("count"),
                "next": paginated.get("next"),
                "previous": paginated.get("previous"),
                "results": paginated.get("results"),
            }
        )
