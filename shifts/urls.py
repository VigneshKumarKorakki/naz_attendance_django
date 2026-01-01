from django.urls import path

from shifts.views.staff.shift import (
    StaffShiftDetailView,
    StaffShiftUpsertView,

)
from shifts.views.worker.attendance import WorkerAttendanceUpsertView, WorkerAttendanceHistoryView

urlpatterns = [
    # ================= STAFF =================
    path(
        "api/v1/staff/shifts/",
        StaffShiftUpsertView.as_view(),
        name="staff-shift-upsert",
    ),
    path(
        "api/v1/staff/shifts/<uuid:shift_id>/",
        StaffShiftDetailView.as_view(),
        name="staff-shift-detail",
    ),

    path(
        "api/v1/worker/attendance/",
        WorkerAttendanceUpsertView.as_view(),
        name="worker-attendance-upsert",
    ),
    path(
        "api/v1/worker/attendance-history/",
        WorkerAttendanceHistoryView.as_view(),
        name="worker-attendance-history",
    )

    path("api/v1/staff/workers/", StaffWorkerListView.as_view(), name="staff-worker-list"),
    path(
        "api/v1/staff/workers/<uuid:worker_id>/",
        StaffWorkerDetailView.as_view(),
        name="staff-worker-detail",
    ),
]
