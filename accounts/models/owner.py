from django.conf import settings
from django.db import models

from core.models import BaseModel


class Owner(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owner",
    )
    contact_phone = models.CharField(max_length=30, blank=True)

    def __str__(self) -> str:
        return self.user.get_username()
