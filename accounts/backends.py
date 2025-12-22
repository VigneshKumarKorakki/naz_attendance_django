from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q


class UsernameEmailPhoneBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get("email") or kwargs.get("phone")
        if username is None or password is None:
            return None

        UserModel = get_user_model()
        try:
            user = UserModel.objects.get(
                Q(username__iexact=username)
                | Q(email__iexact=username)
                | Q(phone__iexact=username)
            )
        except UserModel.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
