from django.urls import path

from accounts.views.staff.login import StaffLoginView

urlpatterns = [
    path("api/v1/staff/login/", StaffLoginView.as_view(), name="staff-login"),
]
