import os

from .base import *  # noqa

# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "devattendance"),
        "USER": os.getenv("DB_USER", "attendance"),
        "PASSWORD": os.getenv("DB_PASSWORD", "attendance"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}


DEBUG = True  # noqa
# ALLOWED_HOSTS = ["localhost", "127.0.0.1", "naz.localhost"]  # noqa
ALLOWED_HOSTS = []  # noqa

# CORS settings for local frontend dev
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Static file settings for development (local)
STATIC_ROOT = BASE_DIR / "core" / "staticfiles"  # noqa
STATIC_URL = "/static/"  # noqa
STATICFILES_DIRS = []

# Media settings for development (local)
MEDIA_URL = "/media/"  # noqa
MEDIA_ROOT = BASE_DIR / "core" / "mediafiles"  # noqa
