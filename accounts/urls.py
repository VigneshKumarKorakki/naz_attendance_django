from django.urls import path

from accounts.views.owner.login import OwnerLoginView
from accounts.views.staff.login import StaffLoginView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("api/v1/owner/login/", OwnerLoginView.as_view(), name="owner-login"),
    path("api/v1/staff/login/", StaffLoginView.as_view(), name="staff-login"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
]
