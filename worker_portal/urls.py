from django.urls import path

from worker_portal import views

urlpatterns = [
    path("worker/", views.login_view, name="worker-login"),
    path("worker/login/", views.worker_login, name="worker-login-submit"),
    path("worker/logout/", views.worker_logout, name="worker-logout"),
    path("worker/service-worker.js", views.service_worker, name="worker-service-worker"),
    path("worker/register/", views.worker_register, name="worker-register"),
    path("worker/shift-upsert/", views.worker_shift_upsert, name="worker-shift-upsert"),
]
