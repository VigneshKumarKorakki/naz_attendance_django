from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from accounts.models.worker import Worker

@ensure_csrf_cookie
def login_view(request):
    return render(request, "worker_portal/index.html")


@require_POST
def worker_login(request):
    username = request.POST.get("login")
    password = request.POST.get("password")
    if not username or not password:
        return JsonResponse({"ok": False, "message": "Missing credentials"}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"ok": False, "message": "Invalid credentials"}, status=401)

    login(request, user)
    worker = Worker.objects.filter(user=user).first()
    display_name = (str(worker) if worker else None) or user.get_full_name() or user.get_username()
    return JsonResponse({"ok": True, "name": display_name})


@require_POST
def worker_logout(request):
    logout(request)
    return JsonResponse({"ok": True})


def service_worker(request):
    response = render(request, "worker_portal/service-worker.js")
    response["Content-Type"] = "application/javascript"
    return response
