from rest_framework.response import Response


def api_response(*, ok, message="", data=None, errors=None, status=200):
    payload = {"ok": ok, "message": message}
    if data is not None:
        payload["data"] = data
    if errors is not None:
        payload["errors"] = errors
    return Response(payload, status=status)
