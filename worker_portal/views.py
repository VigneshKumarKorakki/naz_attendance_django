from django.contrib.auth import authenticate, login, logout, get_user_model
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.views.decorators.http import require_POST

from accounts.models.worker import Worker

import json
from django.utils.dateparse import parse_date
from django.utils.timezone import now
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from shifts.models import Shift
from shifts.serializers import WorkerShiftUpsertSerializer, ShiftSerializer
from accounts.serializers import WorkerRegistrationSerializer


User = get_user_model()


@ensure_csrf_cookie
def login_view(request):
    display_name = ""
    if request.user.is_authenticated:
        worker = Worker.objects.filter(user=request.user).first()
        display_name = (
            (str(worker) if worker else None)
            or request.user.get_full_name()
            or request.user.get_username()
        )
    return render(
        request,
        "worker_portal/index.html",
        {
            "is_authenticated": request.user.is_authenticated,
            "display_name": display_name,
        },
    )

@require_POST
@login_required
def worker_shift_upsert(request):
    try:
        payload = json.loads(request.body.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    serializer = WorkerShiftUpsertSerializer(data=payload)
    if not serializer.is_valid():
        return JsonResponse({"ok": False, "message": "Invalid data", "errors": serializer.errors}, status=400)

    # Use logged-in user's worker profile
    try:
        worker = request.user.worker
    except AttributeError:
        # In case the user is a superuser or staff without a linked Worker profile
        # fallback for testing or return error
        worker_id = payload.get("id")
        if worker_id:
            try:
                worker = Worker.objects.get(id=worker_id)
            except Worker.DoesNotExist:
                return JsonResponse({"ok": False, "message": "Worker not found"}, status=404)
        else:
            return JsonResponse({"ok": False, "message": "User has no linked worker profile"}, status=400)

    data = serializer.validated_data
    attendance_date = data["attendance_date"]
    shift_type = data.get("shift_type")
    status_value = data.get("status", Shift.Status.PRESENT)
    
    worker_start_location = data.get("worker_start_location")
    worker_end_location = data.get("worker_end_location")

    # FETCH ONLY if shift_type is not provided
    if not shift_type:
        shift = Shift.objects.filter(recorded_by_worker=worker, attendance_date=attendance_date).first()
        if not shift:
            return JsonResponse({"ok": True, "data": None})
        return JsonResponse(
            {
                "ok": True,
                "data": ShiftSerializer(shift).data,
            }
        )

    # UPDATING DEFAULTS
    defaults = {
        "shift_type": shift_type,
        "status": status_value,
    }

    if worker_start_location is not None:
        defaults["worker_start_location"] = worker_start_location
    if worker_end_location is not None:
        defaults["worker_end_location"] = worker_end_location

    action = data.get("action", "start")
    
    if action == "start":
        current_time = data.get("worker_start_date_time") or now()
        if status_value != "present":
            current_time = None
            
        defaults["worker_start_date_time"] = current_time
        defaults["start_date_time"] = current_time

    elif action == "end":
        current_time = data.get("worker_end_date_time") or now()

        defaults["worker_end_date_time"] = current_time
        defaults["end_date_time"] = current_time
        
        # Calculate hours if we have a start time
        existing_shift = Shift.objects.filter(
            recorded_by_worker=worker, 
            attendance_date=attendance_date
        ).first()

        if existing_shift and existing_shift.worker_start_date_time:
            duration = current_time - existing_shift.worker_start_date_time
            total_seconds = duration.total_seconds()
            hours_worked = round(total_seconds / 3600, 2)
            defaults["hours"] = hours_worked

    absence_reason = data.get("absence_reason")
    if absence_reason:
        defaults["absence_reason"] = absence_reason

    # UPSERT shift
    shift, created = Shift.objects.update_or_create(
        recorded_by_worker=worker,
        attendance_date=attendance_date,
        defaults=defaults,
    )

    return JsonResponse(
        {
            "ok": True,
            "created": created,
            "data": ShiftSerializer(shift).data
        }
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

@csrf_exempt
@require_POST
def worker_register(request):
    try:
        payload = json.loads(request.body.decode())
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    serializer = WorkerRegistrationSerializer(data=payload)
    if not serializer.is_valid():
        return JsonResponse({"ok": False, "message": "Invalid data", "errors": serializer.errors}, status=400)

    data = serializer.validated_data
    username = data["username"]
    password = data["password"]

    # create auth user
    user = User.objects.create_user(
        username=username,
        password=password,
        first_name=data["first_name"],
        last_name=data["last_name"],
    )

    # create worker row
    worker = Worker.objects.create(
        user=user,
        emirates_id=data["emirates_id"],
        date_of_birth=data["date_of_birth"],
        whatsapp_number=data["whatsapp_number"],
        company_name=data["company_name"],
        company_phone=data["company_phone"],
        is_active=True,
    )

    return JsonResponse(
        {
            "ok": True,
            "worker_id": str(worker.id),
            "username": username,
        },
        status=201,
    )
