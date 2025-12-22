from django.conf import settings
from django.db import models
from model_utils.models import SoftDeletableModel

from core.models import BaseModel


class Company(SoftDeletableModel, BaseModel):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="companies",
    )
    is_self = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.name
