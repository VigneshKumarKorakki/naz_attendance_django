import json

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from accounts.models.worker import Worker
from accounts.serializers import WorkerRegistrationSerializer
from shifts.models import Shift
from shifts.serializers import ShiftSerializer, WorkerShiftUpsertSerializer

User = get_user_model()


@require_POST
@login_required
def worker_shift_upsert(request):
    try:
        payload = json.loads(request.body.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    serializer = WorkerShiftUpsertSerializer(data=payload)
    if not serializer.is_valid():
        return JsonResponse(
            {"ok": False, "message": "Invalid data", "errors": serializer.errors},
            status=400,
        )

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
            return JsonResponse(
                {"ok": False, "message": "User has no linked worker profile"},
                status=400,
            )

    data = serializer.validated_data
    attendance_date = data["attendance_date"]
    shift_type = data.get("shift_type")
    status_value = data.get("status", Shift.Status.PRESENT)

    worker_start_location = data.get("worker_start_location")
    worker_end_location = data.get("worker_end_location")

    # FETCH ONLY if shift_type is not provided
    if not shift_type:
        shift = Shift.objects.filter(
            recorded_by_worker=worker, attendance_date=attendance_date
        ).first()
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
            recorded_by_worker=worker, attendance_date=attendance_date
        ).first()

        if existing_shift and existing_shift.worker_start_date_time:
            duration = current_time - existing_shift.worker_start_date_time
            total_seconds = duration.total_seconds()
            hours_worked = round(total_seconds / 3600, 2)
            defaults["hours"] = hours_worked

    elif action == "location":
        # Location-only update; do not touch time fields.
        pass

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
        {"ok": True, "created": created, "data": ShiftSerializer(shift).data}
    )


@csrf_exempt
@require_POST
def worker_register(request):
    try:
        payload = json.loads(request.body.decode())
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    serializer = WorkerRegistrationSerializer(data=payload)
    if not serializer.is_valid():
        return JsonResponse(
            {"ok": False, "message": "Invalid data", "errors": serializer.errors},
            status=400,
        )

    data = serializer.validated_data
    password = data["password"]
    phone = data["phone"]
    raw_name = f"{data['first_name']}{data['last_name']}"
    base_username = "".join(raw_name.split()).lower() or "user"
    username = base_username
    suffix = 1
    while User.objects.filter(username__iexact=username).exists():
        username = f"{base_username}{suffix}"
        suffix += 1

    # create auth user
    user = User.objects.create_user(
        username=username,
        password=password,
        first_name=data["first_name"],
        last_name=data["last_name"],
        phone=phone,
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
