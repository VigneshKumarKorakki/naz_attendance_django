from django.contrib.auth import authenticate, login, logout, get_user_model
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.views.decorators.http import require_POST

from accounts.models.worker import Worker


User = get_user_model()


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
    display_name = (
        (str(worker) if worker else None)
        or user.get_full_name()
        or user.get_username()
    )
    return JsonResponse({"ok": True, "name": display_name})


@require_POST
def worker_logout(request):
    logout(request)
    return JsonResponse({"ok": True})


def service_worker(request):
    response = render(request, "worker_portal/service-worker.js")
    response["Content-Type"] = "application/javascript"
    return response


# ---------- NEW: registration endpoint ----------

@csrf_exempt  # if you wire CSRF token from JS correctly, you can remove this
@require_POST
def worker_register(request):
    """
    Expects JSON with:
    full_name, emirates_id, date_of_birth (YYYY-MM-DD),
    whatsapp_number, company_name, company_phone,
    username, password
    """
    import json
    from django.utils.dateparse import parse_date

    try:
        payload = json.loads(request.body.decode())
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    required = [
        # "full_name",
        "first_name",
        "last_name",
        "emirates_id",
        "date_of_birth",
        "whatsapp_number",
        "company_name",
        "company_phone",
        "username",
        "password",
    ]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return JsonResponse(
            {"ok": False, "message": f"Missing fields: {', '.join(missing)}"},
            status=400,
        )

    username = payload["username"]
    password = payload["password"]

    # avoid duplicate username
    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse(
            {"ok": False, "message": "Username already exists"}, status=400
        )

    # create auth user
    user = User.objects.create_user(
        username=username,
        password=password,
        first_name=payload["first_name"],
        last_name=payload["last_name"],
    )

    # create worker row
    worker = Worker.objects.create(
        user=user,
        emirates_id=payload["emirates_id"],
        date_of_birth=parse_date(payload["date_of_birth"]),
        whatsapp_number=payload["whatsapp_number"],
        company_name=payload["company_name"],
        company_phone=payload["company_phone"],
        is_active=True,  # adjust to your model defaults
    )

    return JsonResponse(
        {
            "ok": True,
            "worker_id": str(worker.id),
            "username": username,
        },
        status=201,
    )
