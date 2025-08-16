from .auth import router as auth
from .candidate import router as candidate
from .election import router as election
from .notification import router as notification
from .organization import router as organization
from .organization_admin import router as organization_admin
from .system_admin import router as system_admin
from .approval import router as approval
from .voter import router as voter
from .voting_process import router as voting_process
from .home import router as home

__all__ = [
    "auth",
    "candidate",
    "election",
    "notification",
    "organization",
    "organization_admin",
    "system_admin",
    "approval",
    "voter",
    "voting_process",
    "home",
]
