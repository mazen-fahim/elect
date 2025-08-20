from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.future import select

from core.dependencies import db_dependency, organization_dependency
from models import User
from models.organization import Organization
from models.organization_admin import OrganizationAdmin
from models.user import UserRole
from services.auth import AuthService
from services.notification import NotificationService
from services.email import EmailService
from models.notification import NotificationType


router = APIRouter(prefix="/organization-admins", tags=["Organization Admins"])


class OrganizationAdminCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class OrganizationAdminRead(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str
    created_at: datetime


class OrganizationAdminSelfUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class OrganizationAdminSelfUpdateResponse(BaseModel):
    user_id: int
    email: EmailStr
    first_name: str
    last_name: str


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
        admin_users.append(OrganizationAdminRead(user_id=u.id, email=u.email, first_name=u.first_name, last_name=u.last_name, created_at=a.created_at))
    return admin_users


@router.post("/", response_model=OrganizationAdminRead, status_code=status.HTTP_201_CREATED)
async def create_org_admin(
    payload: OrganizationAdminCreate,
    db: db_dependency,
    current_org_user: organization_dependency,
    background_tasks: BackgroundTasks,
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
        first_name=payload.first_name,
        last_name=payload.last_name,
        role=UserRole.organization_admin,
        created_at=datetime.now(timezone.utc),
        last_access_at=datetime.now(timezone.utc),
        # Org admins must verify email before becoming active
        is_active=False,
    )
    db.add(new_user)
    await db.flush()

    org_admin = OrganizationAdmin(
        user_id=new_user.id,
        organization_user_id=current_org_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(org_admin)
    
    # Store the values before commit to avoid expired object issues
    user_id = new_user.id
    user_email = new_user.email
    user_first_name = new_user.first_name
    user_last_name = new_user.last_name
    admin_created_at = org_admin.created_at
    
    await db.commit()

    # Send verification email to the new org admin (non-blocking)
    try:
        email_service = EmailService(db)
        await email_service.send_verification_email(new_user, background_tasks)
    except Exception as _e:
        # Don't fail creation if email dispatch fails; logs will contain details
        pass
    
    return OrganizationAdminRead(
        user_id=user_id, 
        email=user_email, 
        first_name=user_first_name, 
        last_name=user_last_name, 
        created_at=admin_created_at
    )


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

    # Get the user record
    ures = await db.execute(select(User).where(User.id == user_id))
    user = ures.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Delete the organization admin record first
        await db.delete(admin)
        
        # Delete the user record
        await db.delete(user)
        
        await db.commit()
    except Exception as e:
        await db.rollback()
        print(f"Error deleting organization admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to delete organization admin. Please try again."
        )
    
    return


@router.put("/me", response_model=OrganizationAdminSelfUpdateResponse)
async def update_self(
    payload: OrganizationAdminSelfUpdate,
    db: db_dependency,
    current_user: organization_dependency,
):
    # Only organization_admin can update self
    if current_user.role != UserRole.organization_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only organization admins can update themselves"
        )

    # Load full user record
    res = await db.execute(select(User).where(User.id == current_user.id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes: list[str] = []

    # Update first_name if provided
    if payload.first_name and payload.first_name != user.first_name:
        user.first_name = payload.first_name
        changes.append("first_name")

    # Update last_name if provided
    if payload.last_name and payload.last_name != user.last_name:
        user.last_name = payload.last_name
        changes.append("last_name")

    # Update email if provided and unique
    if payload.email and payload.email != user.email:
        existing = await db.execute(select(User).where(User.email == str(payload.email)))
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = str(payload.email)
        changes.append("email")

    # Update password if provided
    if payload.password:
        auth = AuthService(db)
        user.password = auth.get_password_hash(payload.password)
        changes.append("password")

    # Store the values before commit to avoid expired object issues
    user_id = user.id
    user_email = user.email
    user_first_name = user.first_name
    user_last_name = user.last_name

    await db.commit()

    # Notify the organization boss (organization_user_id) about the update
    # Map this admin to its organization_user_id
    mapping_res = await db.execute(select(OrganizationAdmin).where(OrganizationAdmin.user_id == user_id))
    mapping = mapping_res.scalar_one_or_none()
    if mapping:
        try:
            notifier = NotificationService(db)
            title = "Organization Admin Updated Profile"
            message = f"Admin user {user_email} updated: {', '.join(changes) if changes else 'no changes'}"
            await notifier.create_notification(
                organization_id=mapping.organization_user_id,
                notification_type=NotificationType.ORGANIZATION_SETTINGS_CHANGED,
                title=title,
                message=message,
                additional_data={"admin_user_id": user_id, "changes": changes},
            )
        except Exception:
            # Do not block the update on notification errors
            pass

    return OrganizationAdminSelfUpdateResponse(
        user_id=user_id, 
        email=user_email, 
        first_name=user_first_name, 
        last_name=user_last_name
    )


@router.put("/{user_id}", response_model=OrganizationAdminSelfUpdateResponse)
async def update_org_admin(
    user_id: int,
    payload: OrganizationAdminSelfUpdate,
    db: db_dependency,
    current_org_user: organization_dependency,
):
    # Only the boss organization can update an org admin
    if current_org_user.role != UserRole.organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization can update admins")

    # Ensure the admin belongs to this organization
    mapping_res = await db.execute(
        select(OrganizationAdmin).where(
            OrganizationAdmin.user_id == user_id,
            OrganizationAdmin.organization_user_id == current_org_user.id,
        )
    )
    mapping = mapping_res.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="Organization admin not found")

    # Load user
    ures = await db.execute(select(User).where(User.id == user_id))
    user = ures.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Apply updates
    if payload.first_name and payload.first_name != user.first_name:
        user.first_name = payload.first_name

    if payload.last_name and payload.last_name != user.last_name:
        user.last_name = payload.last_name

    if payload.email and payload.email != user.email:
        existing = await db.execute(select(User).where(User.email == str(payload.email)))
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = str(payload.email)

    if payload.password:
        auth = AuthService(db)
        user.password = auth.get_password_hash(payload.password)

    # Store the values before commit to avoid expired object issues
    user_id = user.id
    user_email = user.email
    user_first_name = user.first_name
    user_last_name = user.last_name

    await db.commit()

    return OrganizationAdminSelfUpdateResponse(
        user_id=user_id, 
        email=user_email, 
        first_name=user_first_name, 
        last_name=user_last_name
    )
