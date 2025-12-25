from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from accounts.models.company import Company
from core.models import BaseModel


class Staff(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff",
        null=True,
        blank=True,
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="staffs",
    )
    employee_code = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        if self.user_id:
            full_name = self.user.get_full_name().strip()
            return full_name or self.user.get_username()
        return self.employee_code or "Staff"

    def clean(self) -> None:
        if self.user_id is None or self.company_id is None:
            return
