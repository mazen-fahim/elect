from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.future import select

from core.dependencies import db_dependency, organization_dependency
from models import User
from models.organization import Organization
from models.organization_admin import OrganizationAdmin
from models.user import UserRole
from services.auth import AuthService


router = APIRouter(prefix="/organization-admins", tags=["Organization Admins"])


class OrganizationAdminCreate(BaseModel):
    email: EmailStr
    password: str


class OrganizationAdminRead(BaseModel):
    user_id: int
    email: EmailStr
    created_at: datetime


@router.get("/", response_model=List[OrganizationAdminRead])
async def list_org_admins(db: db_dependency, current_org_user: organization_dependency):
    # Only the boss organization can list
    if current_org_user.role != UserRole.organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization can list admins")

    res = await db.execute(
        select(OrganizationAdmin).where(OrganizationAdmin.organization_user_id == current_org_user.id)
    )
    admins = res.scalars().all()

    # Load their users
    admin_users: list[OrganizationAdminRead] = []
    for a in admins:
        ures = await db.execute(select(User).where(User.id == a.user_id))
        u = ures.scalar_one()
        admin_users.append(OrganizationAdminRead(user_id=u.id, email=u.email, created_at=a.created_at))
    return admin_users


@router.post("/", response_model=OrganizationAdminRead, status_code=status.HTTP_201_CREATED)
async def create_org_admin(
    payload: OrganizationAdminCreate, db: db_dependency, current_org_user: organization_dependency
):
    # Only boss can add admins
    if current_org_user.role != UserRole.organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization can add admins")

    # Ensure organization exists
    org_res = await db.execute(select(Organization).where(Organization.user_id == current_org_user.id))
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Create user with role organization_admin
    auth = AuthService(db)
    password_hash = auth.get_password_hash(payload.password)

    # Unique email
    existing_res = await db.execute(select(User).where(User.email == str(payload.email)))
    if existing_res.scalars().first():
        raise HTTPException(status_code=400, detail="Email already in use")

    new_user = User(
        email=str(payload.email),
        password=password_hash,
        role=UserRole.organization_admin,
        created_at=datetime.now(timezone.utc),
        last_access_at=datetime.now(timezone.utc),
        is_active=True,
    )
    db.add(new_user)
    await db.flush()

    org_admin = OrganizationAdmin(
        user_id=new_user.id,
        organization_user_id=current_org_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(org_admin)
    await db.commit()
    return OrganizationAdminRead(user_id=new_user.id, email=new_user.email, created_at=org_admin.created_at)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_org_admin(user_id: int, db: db_dependency, current_org_user: organization_dependency):
    if current_org_user.role != UserRole.organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization can remove admins")

    res = await db.execute(
        select(OrganizationAdmin).where(
            OrganizationAdmin.user_id == user_id,
            OrganizationAdmin.organization_user_id == current_org_user.id,
        )
    )
    admin = res.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=404, detail="Organization admin not found")

    # Also deactivate user
    ures = await db.execute(select(User).where(User.id == user_id))
    user = ures.scalar_one_or_none()
    if user:
        user.is_active = False

    await db.delete(admin)
    await db.commit()
    return
