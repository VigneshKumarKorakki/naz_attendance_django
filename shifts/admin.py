from django.contrib import admin

from shifts.models import Shift, ShiftAudit


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = (
        "attendance_date",
        "shift_type",
        "status",
        "absence_reason",
        "recorded_by_worker",
        "recorded_by_staff",
        "hours",
        "created",
    )
    list_filter = ("shift_type", "status", "absence_reason", "attendance_date")
    search_fields = (
        "recorded_by_worker__user__username",
        "recorded_by_worker__user__email",
        "recorded_by_staff__user__username",
        "recorded_by_staff__user__email",
    )
    date_hierarchy = "attendance_date"
    autocomplete_fields = ("recorded_by_worker", "recorded_by_staff")


@admin.register(ShiftAudit)
class ShiftAuditAdmin(admin.ModelAdmin):
    list_display = (
        "shift",
        "attendance_date",
        "shift_type",
        "status",
        "absence_reason",
        "recorded_by_worker",
        "recorded_by_staff",
        "created",
    )
    list_filter = ("shift_type", "status", "absence_reason", "attendance_date")
    search_fields = (
        "shift__recorded_by_worker__user__username",
        "shift__recorded_by_worker__user__email",
        "shift__recorded_by_staff__user__username",
        "shift__recorded_by_staff__user__email",
    )
    date_hierarchy = "attendance_date"
    autocomplete_fields = ("shift", "recorded_by_worker", "recorded_by_staff")
    readonly_fields = (
        "shift",
        "recorded_by_worker",
        "recorded_by_staff",
        "attendance_date",
        "shift_type",
        "status",
        "absence_reason",
        "hours",
        "start_date_time",
        "end_date_time",
        "worker_start_date_time",
        "worker_end_date_time",
        "staff_start_date_time",
        "staff_end_date_time",
        "worker_start_location",
        "worker_end_location",
        "created",
        "modified",
    )
