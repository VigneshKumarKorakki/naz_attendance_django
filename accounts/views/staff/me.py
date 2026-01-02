from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from accounts.models.staff import Staff
from core.responses import api_response


class StaffMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        staff = Staff.objects.filter(user=request.user).select_related("company").first()
        if staff is None or not staff.is_active:
            return api_response(
                ok=False,
                message="Staff access denied",
                status=status.HTTP_403_FORBIDDEN,
            )

        display_name = (str(staff) if staff else None) or request.user.get_full_name() or request.user.get_username()
        groups = list(request.user.groups.values_list("name", flat=True))
        permissions = sorted(request.user.get_all_permissions())
        return api_response(
            ok=True,
            message="Profile loaded",
            data={
                "name": display_name,
                "staff_id": staff.id,
                "company_id": staff.company_id,
                "role": "staff",
                "groups": groups,
                "permissions": permissions,
            },
        )
