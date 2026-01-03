from rest_framework import serializers
from django.contrib.auth import get_user_model
from accounts.models.worker import Worker

User = get_user_model()

class WorkerRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    phone = serializers.CharField(required=True)
    emirates_id = serializers.CharField(required=True)
    date_of_birth = serializers.DateField(required=True)
    whatsapp_number = serializers.CharField(required=True)
    company_name = serializers.CharField(required=True)
    company_phone = serializers.CharField(required=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_phone(self, value):
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Phone number already exists")
        return value
