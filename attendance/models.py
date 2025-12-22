from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from accounts.models.staff import Staff
from accounts.models.worker import Worker
from core.models import BaseModel


class Attendance(BaseModel):
    class ShiftType(models.TextChoices):
        DAY = "day", "Day"
        NIGHT = "night", "Night"
        OT = "ot", "Over Time"

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        SICK = "sick", "Sick"
        SITE_OUT = "site_out", "Site Out"
        NO_WORK = "no_work", "No Work"
        SAFETY = "safety", "Safety"
        TRAINING = "training", "Training"

    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name="attendances",
        null=True,
        blank=True,
    )
    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name="attendances",
        null=True,
        blank=True,
    )
    attendance_date = models.DateField()
    shift_type = models.CharField(max_length=10, choices=ShiftType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    worker_start_date = models.DateField(null=True, blank=True)
    worker_end_date = models.DateField(null=True, blank=True)
    staff_start_date = models.DateField(null=True, blank=True)
    staff_end_date = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["worker", "attendance_date"],
                condition=Q(worker__isnull=False),
                name="uniq_attendance_worker_date",
            ),
            models.UniqueConstraint(
                fields=["staff", "attendance_date"],
                condition=Q(staff__isnull=False),
                name="uniq_attendance_staff_date",
            ),
        ]
        ordering = ["-attendance_date", "worker"]

    def __str__(self) -> str:
        name = self.worker.full_name if self.worker_id else self.staff.full_name
        return f"{name} • {self.attendance_date}"

    def clean(self) -> None:
        if self.worker_id and self.staff_id:
            raise ValidationError("Attendance can be linked to a worker or staff, not both.")
        if not self.worker_id and not self.staff_id:
            raise ValidationError("Attendance must be linked to a worker or staff.")
