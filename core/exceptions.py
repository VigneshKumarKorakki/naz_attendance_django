from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return Response(
            {"ok": False, "message": "Server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    message = "Request failed"
    data = response.data
    if isinstance(data, dict):
        if "detail" in data:
            detail = data.get("detail")
            message = detail if isinstance(detail, str) else message
            errors = data
        else:
            errors = data
    else:
        errors = {"detail": data}

    response.data = {
        "ok": False,
        "message": message,
        "errors": errors,
    }
    return response
