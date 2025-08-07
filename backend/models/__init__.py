from sqlalchemy.orm import DeclarativeBase, DeclarativeMeta, declarative_base

from .candidate import Candidate
from .candidate_participation import CandidateParticipation
from .election import Election
from .email_verification_token import EmailVerificationToken
from .organization import Organization
from .organization_admin import OrganizationAdmin
from .user import User
from .verification_token import VerificationToken
from .voter import Voter
from .voting_process import VotingProcess

Base = declarative_base()  # pyright: ignore[reportAny]

__all__ = [
    "Base",
    "Candidate",
    "CandidateParticipation",
    "Election",
    "Organization",
    "OrganizationAdmin",
    "User",
    "Voter",
    "VotingProcess",
]
