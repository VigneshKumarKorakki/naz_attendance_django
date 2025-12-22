# Attendance Backend (Multi-Tenant)

This project uses Django + Postgres with `django-tenants` (schema-per-tenant).

## Requirements

- Python 3.11+ (3.13 ok)
- PostgreSQL

## Install

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Environment

Set environment variables (example for dev):

```bash
export DJANGO_SETTINGS_MODULE=core.settings.dev
export DB_NAME=devattendance
export DB_USER=attendance
export DB_PASSWORD=attendance
export DB_HOST=localhost
export DB_PORT=5432
```

## Database Setup (PostgreSQL)

Run once as a superuser:

```sql
CREATE USER attendance WITH PASSWORD 'attendance';
CREATE DATABASE devattendance OWNER attendance;
GRANT ALL PRIVILEGES ON DATABASE devattendance TO attendance;
```

## Migrations (Fresh DB)

Shared/public schema first:

```bash
python manage.py makemigrations tenants
python manage.py migrate --schema=public
```

Tenant schemas:

```bash
python manage.py migrate_schemas
```

## Create a Tenant

```bash
python manage.py shell
```

```python
from tenants.models import Client, Domain

tenant = Client(schema_name="naz", name="Naz Tenant")
tenant.save()
Domain(domain="naz.localhost", tenant=tenant, is_primary=True).save()
```

## Run (Dev)

```bash
python manage.py runserver
```

## Admin

Create a superuser in the public schema (tenant management):

```bash
python manage.py createsuperuser
```

Create a superuser in a tenant schema (tenant data):

```bash
python manage.py tenant_command createsuperuser --schema=tenant1
```

Admin URLs:

- Public: `http://localhost:8000/admin/` (public domain)
- Tenant: `http://tenant1.localhost:8000/admin/`

## Production Notes

- Use `core/settings/prod.py` with `DEBUG = False`
- Set `ALLOWED_HOSTS`
- Use a strong `SECRET_KEY` from env
- Use a real Postgres user/password
- Run `python manage.py collectstatic`
- Use a WSGI server (gunicorn/uvicorn) and a reverse proxy (nginx)

Example `core/settings/prod.py` skeleton:

```python
from .base import *  # noqa
import os

DEBUG = False
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

SECRET_KEY = os.getenv("SECRET_KEY")
```
