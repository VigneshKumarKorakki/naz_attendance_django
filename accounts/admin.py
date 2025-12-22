from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from accounts.models import Company, Owner, Staff, User, Worker


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "phone", "is_staff", "is_active")
    search_fields = ("username", "email", "phone")
    fieldsets = UserAdmin.fieldsets + (("Contact", {"fields": ("phone",)}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Contact", {"fields": ("phone",)}),)


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ("user", "contact_phone", "created", "modified")
    search_fields = ("user__username", "user__email")


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ("full_name", "company", "is_active", "created", "modified")
    search_fields = ("full_name", "employee_code", "company__name")


@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ("full_name", "company", "is_active", "created", "modified")
    search_fields = ("full_name", "employee_code", "company__name")


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "is_self", "created", "modified")
    search_fields = ("name", "owner__username", "owner__email")
