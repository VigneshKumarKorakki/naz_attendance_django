# Re-export view functions for easy imports.
from .auth import login_view, worker_login, worker_logout  # noqa: F401
from .attendance import worker_shift_upsert, worker_register  # noqa: F401
from .pwa import service_worker, manifest  # noqa: F401
