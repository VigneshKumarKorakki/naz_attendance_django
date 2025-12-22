"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

if os.getenv("DJANGO_ENV") == "prod":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.prod")  # noqa
else:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.dev")  # noqa


application = get_wsgi_application()
