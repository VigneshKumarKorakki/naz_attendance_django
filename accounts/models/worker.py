from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from accounts.models.company import Company
from core.models import BaseModel


class Worker(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="worker",
        null=True,
        blank=True,
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="workers",
        null=True,
        blank=True,
        limit_choices_to={"is_self": True},
    )
    full_name = models.CharField(max_length=255)
    emirates_id = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    whatsapp_number = models.CharField(max_length=30, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    company_phone = models.CharField(max_length=30, blank=True)
    employee_code = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.full_name

    def clean(self) -> None:
        if self.user_id is None or self.company_id is None:
            return
        if self.company.owner_id != self.user_id:
            raise ValidationError({"user": "User must be the owner of the company."})
