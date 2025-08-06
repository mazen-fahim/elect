from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import User, Organization
from ..schemas.register import OrganizationCreate
from core.auth.security import get_password_hash, verify_password


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register_organization(self, org_data: OrganizationCreate) -> Organization:
        # Check if email already exists
        if self.db.query(User).filter(User.email == org_data.email).first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Create user
        user = User(
            email=org_data.email,
            password=get_password_hash(org_data.password),
            role="organization",
            is_active=True,
            created_at=datetime.now(),
            last_access_at=datetime.now(),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Create organization
        org = Organization(
            name=org_data.name,
            email=org_data.email,
            phone=org_data.phone,
            address=org_data.address,
            org_type=org_data.org_type.value,
            description=org_data.description,
            website=org_data.website,
            contact_person=org_data.contact_person,
            status="pending",
            user_id=user.id,
            created_at=datetime.now(),
        )
        self.db.add(org)
        self.db.commit()
        self.db.refresh(org)

        return org

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.password):
            return None
        return user
