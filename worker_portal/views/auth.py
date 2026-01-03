from django.contrib.auth import authenticate, get_user_model, login, logout
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from accounts.models.worker import Worker

User = get_user_model()


@ensure_csrf_cookie
def login_view(request):
    display_name = ""
    worker_id = ""
    if request.user.is_authenticated:
        worker = Worker.objects.filter(user=request.user).first()
        display_name = (
            (str(worker) if worker else None)
            or request.user.get_full_name()
            or request.user.get_username()
        )
        worker_id = str(worker.id) if worker else ""
    return render(
        request,
        "worker_portal/index.html",
        {
            "is_authenticated": request.user.is_authenticated,
            "display_name": display_name,
            "worker_id": worker_id,
            "show_last_updated": getattr(settings, "WORKER_PORTAL_SHOW_LAST_UPDATED", True),
        },
    )


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
    display_name = (
        (str(worker) if worker else None)
        or user.get_full_name()
        or user.get_username()
    )
    return JsonResponse(
        {
            "ok": True,
            "name": display_name,
            "worker_id": str(worker.id) if worker else "",
        }
    )


@require_POST
@login_required
def worker_logout(request):
    logout(request)
    return JsonResponse({"ok": True})
