from django.http import FileResponse, JsonResponse
from django.shortcuts import render
from django.contrib.staticfiles import finders


def service_worker(request):
    response = render(request, "worker_portal/service-worker.js")
    response["Content-Type"] = "application/javascript"
    return response


def manifest(request):
    manifest_path = finders.find("worker_portal/manifest.json")
    if not manifest_path:
        return JsonResponse({"ok": False, "message": "manifest.json not found"}, status=404)
    return FileResponse(
        open(manifest_path, "rb"), content_type="application/manifest+json"
    )
