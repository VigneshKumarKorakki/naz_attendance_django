from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from model_utils.models import SoftDeletableModel, SoftDeletableManager


class SoftDeletableUserManager(UserManager, SoftDeletableManager):
    pass


class User(SoftDeletableModel, AbstractUser):
    objects = SoftDeletableUserManager()

    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True, unique=True)

    def __str__(self) -> str:
        return self.get_username()
