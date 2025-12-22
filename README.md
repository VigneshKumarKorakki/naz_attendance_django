# Attendance Backend

Django backend for attendance tracking with user accounts and a worker portal UI.

## Requirements

- Python 3.11+
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

Quick verify (optional):

```bash
psql -h localhost -U attendance -d devattendance
```

## Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

## Run (Dev)

```bash
python manage.py runserver
```

Worker portal: `http://localhost:8000/worker/`

## Admin

```bash
python manage.py createsuperuser
```

Admin URL: `http://localhost:8000/admin/`

## Settings

`manage.py` loads `core.settings.dev` by default. If you set `DJANGO_ENV=prod`,
it will look for `core.settings.prod`, which you should create for production
settings (DEBUG off, ALLOWED_HOSTS set, SECRET_KEY from env, etc.).
