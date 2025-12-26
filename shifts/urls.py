from django.urls import path

from shifts.views.staff.shift import StaffShiftDetailView, StaffShiftUpsertView

urlpatterns = [
    path("api/v1/staff/shifts/", StaffShiftUpsertView.as_view(), name="staff-shift-upsert"),
    path(
        "api/v1/staff/shifts/<uuid:shift_id>/",
        StaffShiftDetailView.as_view(),
        name="staff-shift-detail",
    ),
]
