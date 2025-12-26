from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from accounts.models.staff import Staff
from accounts.models.worker import Worker
from core.models import BaseModel


class Shift(BaseModel):
    class ShiftType(models.TextChoices):
        DAY = "day", "Day"
        NIGHT = "night", "Night"

    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"

    class AbsenceReason(models.TextChoices):
        SICK = "sick", "Sick"
        SITE_OUT = "site_out", "Site Out"
        NO_WORK = "no_work", "No Work"
        SAFETY = "safety", "Safety"
        TRAINING = "training", "Training"

    attendance_date = models.DateField()
    shift_type = models.CharField(max_length=10, choices=ShiftType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    absence_reason = models.CharField(
        max_length=20,
        choices=AbsenceReason.choices,
        null=True,
        blank=True,
    )
    hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    start_date_time = models.DateTimeField(null=True, blank=True)
    end_date_time = models.DateTimeField(null=True, blank=True)
    worker_start_date_time = models.DateTimeField(null=True, blank=True)
    worker_end_date_time = models.DateTimeField(null=True, blank=True)
    staff_start_date_time = models.DateTimeField(null=True, blank=True)
    staff_end_date_time = models.DateTimeField(null=True, blank=True)
    recorded_by_worker = models.ForeignKey(
        Worker,
        on_delete=models.SET_NULL,
        related_name="recorded_shifts",
        null=True,
        blank=True,
    )
    recorded_by_staff = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        related_name="recorded_shifts",
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recorded_by_worker", "attendance_date"],
                condition=Q(recorded_by_worker__isnull=False),
                name="uniq_attendance_worker_date",
            ),
            models.UniqueConstraint(
                fields=["recorded_by_staff", "attendance_date"],
                condition=Q(recorded_by_staff__isnull=False),
                name="uniq_attendance_staff_date",
            ),
        ]
        ordering = ["-attendance_date", "recorded_by_worker", "recorded_by_staff"]

    def __str__(self) -> str:
        if self.recorded_by_worker_id:
            name = str(self.recorded_by_worker)
        else:
            name = str(self.recorded_by_staff)
        return f"{name} • {self.attendance_date}"

    def clean(self) -> None:
        if self.recorded_by_worker_id and self.recorded_by_staff_id:
            raise ValidationError("Attendance can be linked to a worker or staff, not both.")
        if not self.recorded_by_worker_id and not self.recorded_by_staff_id:
            raise ValidationError("Attendance must be linked to a worker or staff.")
        if self.status == self.Status.PRESENT and self.absence_reason:
            raise ValidationError({"absence_reason": "Absence reason requires absent status."})
        if self.status == self.Status.ABSENT and not self.absence_reason:
            raise ValidationError({"absence_reason": "Absence reason is required for absent status."})

    def save(self, *args, **kwargs):
        previous = None
        if self.pk:
            previous = (
                Shift.objects.filter(pk=self.pk)
                .values(
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
                    "recorded_by_worker_id",
                    "recorded_by_staff_id",
                )
                .first()
            )
        super().save(*args, **kwargs)
        if not previous:
            return
        current = {
            "attendance_date": self.attendance_date,
            "shift_type": self.shift_type,
            "status": self.status,
            "absence_reason": self.absence_reason,
            "hours": self.hours,
            "start_date_time": self.start_date_time,
            "end_date_time": self.end_date_time,
            "worker_start_date_time": self.worker_start_date_time,
            "worker_end_date_time": self.worker_end_date_time,
            "staff_start_date_time": self.staff_start_date_time,
            "staff_end_date_time": self.staff_end_date_time,
        }
        if any(previous[key] != current[key] for key in current):
            ShiftAudit.objects.create(
                shift=self,
                recorded_by_worker_id=previous["recorded_by_worker_id"],
                recorded_by_staff_id=previous["recorded_by_staff_id"],
                attendance_date=previous["attendance_date"],
                shift_type=previous["shift_type"],
                status=previous["status"],
                absence_reason=previous["absence_reason"],
                hours=previous["hours"],
                start_date_time=previous["start_date_time"],
                end_date_time=previous["end_date_time"],
                worker_start_date_time=previous["worker_start_date_time"],
                worker_end_date_time=previous["worker_end_date_time"],
                staff_start_date_time=previous["staff_start_date_time"],
                staff_end_date_time=previous["staff_end_date_time"],
            )


class ShiftAudit(BaseModel):
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name="changes",
    )
    recorded_by_worker = models.ForeignKey(
        Worker,
        on_delete=models.SET_NULL,
        related_name="shift_audits",
        null=True,
        blank=True,
    )
    recorded_by_staff = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        related_name="shift_audits",
        null=True,
        blank=True,
    )
    attendance_date = models.DateField()
    shift_type = models.CharField(max_length=10, choices=Shift.ShiftType.choices)
    status = models.CharField(max_length=20, choices=Shift.Status.choices)
    absence_reason = models.CharField(
        max_length=20,
        choices=Shift.AbsenceReason.choices,
        null=True,
        blank=True,
    )
    hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    start_date_time = models.DateTimeField(null=True, blank=True)
    end_date_time = models.DateTimeField(null=True, blank=True)
    worker_start_date_time = models.DateTimeField(null=True, blank=True)
    worker_end_date_time = models.DateTimeField(null=True, blank=True)
    staff_start_date_time = models.DateTimeField(null=True, blank=True)
    staff_end_date_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created"]

    def __str__(self) -> str:
        return f"{self.shift} • {self.status}"
