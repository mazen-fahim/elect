from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc, and_, or_

from core.dependencies import db_dependency, organization_dependency
from models.notification import Notification, NotificationType, NotificationPriority
from models.election import Election
from models.candidate import Candidate
from models.user import UserRole
from schemas.notification import (
    NotificationRead, 
    NotificationUpdate, 
    NotificationSummary, 
    NotificationMarkAllReadRequest,
    NotificationFilter
)
from services.notification import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=List[NotificationRead])
async def get_notifications(
    db: db_dependency,
    current_user: organization_dependency,
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    notification_type: Optional[NotificationType] = Query(None, description="Filter by notification type"),
    priority: Optional[NotificationPriority] = Query(None, description="Filter by priority"),
    election_id: Optional[int] = Query(None, description="Filter by election ID"),
    days_ago: Optional[int] = Query(None, description="Filter notifications from last N days"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip")
):
    """Get notifications for the current organization with filtering options"""
    
    try:
        # Get the correct organization ID for the current user
        organization_id = current_user.id
        
        # If user is an organization admin, we need to get their organization ID
        if current_user.role == UserRole.organization_admin:
            from models.organization_admin import OrganizationAdmin
            result = await db.execute(
                select(OrganizationAdmin).where(OrganizationAdmin.user_id == current_user.id)
            )
            mapping = result.scalar_one_or_none()
            if mapping:
                organization_id = mapping.organization_user_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Organization admin not linked to any organization"
                )
        
        # Build query conditions
        conditions = [Notification.organization_id == organization_id]
        
        if is_read is not None:
            conditions.append(Notification.is_read == is_read)
        
        if notification_type is not None:
            conditions.append(Notification.type == notification_type)
        
        if priority is not None:
            conditions.append(Notification.priority == priority)
        
        if election_id is not None:
            conditions.append(Notification.election_id == election_id)
        
        if days_ago is not None:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
            conditions.append(Notification.created_at >= cutoff_date)
        
        # Execute query - don't use selectinload for election to avoid broken relationship issues
        query = (
            select(Notification)
            .where(and_(*conditions))
            .order_by(desc(Notification.created_at))
            .offset(offset)
            .limit(limit)
        )
        
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        # Enhance notifications with additional data
        enhanced_notifications = []
        for notification in notifications:
            # Get candidate name if candidate_id is present
            candidate_name = None
            if notification.candidate_id:
                candidate_result = await db.execute(
                    select(Candidate).where(Candidate.hashed_national_id == notification.candidate_id)
                )
                candidate = candidate_result.scalar_one_or_none()
                if candidate:
                    candidate_name = candidate.name
            
            # Safely get election title - handle case where election might have been deleted
            election_title = None
            if notification.election_id:
                try:
                    election_result = await db.execute(
                        select(Election).where(Election.id == notification.election_id)
                    )
                    election = election_result.scalar_one_or_none()
                    if election:
                        election_title = election.title
                except Exception:
                    # If there's an issue accessing election, set to None
                    election_title = None
            
            notification_dict = {
                "id": notification.id,
                "organization_id": notification.organization_id,
                "type": notification.type,
                "priority": notification.priority,
                "title": notification.title,
                "message": notification.message,
                "election_id": notification.election_id,
                "candidate_id": notification.candidate_id,
                "voter_id": notification.voter_id,
                "additional_data": notification.additional_data,
                "is_read": notification.is_read,
                "created_at": notification.created_at,
                "read_at": notification.read_at,
                "age_hours": notification.age_hours,
                "is_urgent": notification.is_urgent,
                "is_election_related": notification.is_election_related,
                "election_title": election_title,
                "candidate_name": candidate_name
            }
            
            enhanced_notifications.append(NotificationRead(**notification_dict))
        
        return enhanced_notifications
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_notifications: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load notifications: {str(e)}"
        )


@router.get("/summary", response_model=NotificationSummary)
async def get_notifications_summary(
    db: db_dependency,
    current_user: organization_dependency
):
    """Get summary statistics for notifications"""
    
    try:
        # Get the correct organization ID for the current user
        organization_id = current_user.id
        
        # If user is an organization admin, we need to get their organization ID
        if current_user.role == UserRole.organization_admin:
            from models.organization_admin import OrganizationAdmin
            result = await db.execute(
                select(OrganizationAdmin).where(OrganizationAdmin.user_id == current_user.id)
            )
            mapping = result.scalar_one_or_none()
            if mapping:
                organization_id = mapping.organization_user_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Organization admin not linked to any organization"
                )
        
        notification_service = NotificationService(db)
        summary_data = await notification_service.get_notifications_summary(organization_id)
        
        return NotificationSummary(**summary_data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_notifications_summary: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load notification summary: {str(e)}"
        )


@router.get("/{notification_id}", response_model=NotificationRead)
async def get_notification(
    notification_id: int,
    db: db_dependency,
    current_user: organization_dependency
):
    """Get a specific notification by ID"""
    
    try:
        # Get the correct organization ID for the current user
        organization_id = current_user.id
        
        # If user is an organization admin, we need to get their organization ID
        if current_user.role == UserRole.organization_admin:
            from models.organization_admin import OrganizationAdmin
            result = await db.execute(
                select(OrganizationAdmin).where(OrganizationAdmin.user_id == current_user.id)
            )
            mapping = result.scalar_one_or_none()
            if mapping:
                organization_id = mapping.organization_user_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Organization admin not linked to any organization"
                )
        
        result = await db.execute(
            select(Notification)
            .where(
                Notification.id == notification_id,
                Notification.organization_id == organization_id
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        # Get candidate name if candidate_id is present
        candidate_name = None
        if notification.candidate_id:
            candidate_result = await db.execute(
                select(Candidate).where(Candidate.hashed_national_id == notification.candidate_id)
            )
            candidate = candidate_result.scalar_one_or_none()
            if candidate:
                candidate_name = candidate.name
        
        # Safely get election title - handle case where election might have been deleted
        election_title = None
        if notification.election_id:
            try:
                election_result = await db.execute(
                    select(Election).where(Election.id == notification.election_id)
                )
                election = election_result.scalar_one_or_none()
                if election:
                    election_title = election.title
            except Exception:
                # If there's an issue accessing election, set to None
                election_title = None
        
        notification_data = {
            "id": notification.id,
            "organization_id": notification.organization_id,
            "type": notification.type,
            "priority": notification.priority,
            "title": notification.title,
            "message": notification.message,
            "election_id": notification.election_id,
            "candidate_id": notification.candidate_id,
            "voter_id": notification.voter_id,
            "metadata": notification.metadata,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
            "read_at": notification.read_at,
            "age_hours": notification.age_hours,
            "is_urgent": notification.is_urgent,
            "is_election_related": notification.is_election_related,
            "election_title": election_title,
            "candidate_name": candidate_name
        }
        
        return NotificationRead(**notification_data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load notification: {str(e)}"
        )


@router.patch("/{notification_id}", response_model=NotificationRead)
async def update_notification(
    notification_id: int,
    notification_data: NotificationUpdate,
    db: db_dependency,
    current_user: organization_dependency
):
    """Update a notification (mainly for marking as read/unread)"""
    
    result = await db.execute(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.organization_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Update fields
    update_data = notification_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "is_read" and value and not notification.is_read:
            # Mark as read
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
        elif field == "is_read" and not value and notification.is_read:
            # Mark as unread
            notification.is_read = False
            notification.read_at = None
        else:
            setattr(notification, field, value)
    
    # Store values before commit to avoid expired ORM object issues
    election_title = None
    if notification.election_id:
        try:
            election_result = await db.execute(
                select(Election).where(Election.id == notification.election_id)
            )
            election = election_result.scalar_one_or_none()
            if election:
                election_title = election.title
        except Exception:
            # If there's an issue accessing election, set to None
            election_title = None
    
    await db.commit()
    await db.refresh(notification)
    
    # Get candidate name if candidate_id is present
    candidate_name = None
    if notification.candidate_id:
        candidate_result = await db.execute(
            select(Candidate).where(Candidate.hashed_national_id == notification.candidate_id)
        )
        candidate = candidate_result.scalar_one_or_none()
        if candidate:
            candidate_name = candidate.name
    
    notification_data = {
        "id": notification.id,
        "organization_id": notification.organization_id,
        "type": notification.type,
        "priority": notification.priority,
        "title": notification.title,
        "message": notification.message,
        "election_id": notification.election_id,
        "candidate_id": notification.candidate_id,
        "voter_id": notification.voter_id,
        "metadata": notification.metadata,
        "is_read": notification.is_read,
        "created_at": notification.created_at,
        "read_at": notification.read_at,
        "age_hours": notification.age_hours,
        "is_urgent": notification.is_urgent,
        "is_election_related": notification.is_election_related,
        "election_title": election_title,
        "candidate_name": candidate_name
    }
    
    return NotificationRead(**notification_data)


@router.patch("/mark-all-read", response_model=dict)
async def mark_all_notifications_read(
    request: NotificationMarkAllReadRequest,
    db: db_dependency,
    current_user: organization_dependency
):
    """Mark all notifications as read for the current organization"""
    
    if not request.mark_all_read:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="mark_all_read must be true"
        )
    
    notification_service = NotificationService(db)
    count = await notification_service.mark_all_as_read(current_user.id)
    
    return {
        "message": f"Marked {count} notifications as read",
        "notifications_marked": count
    }


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: db_dependency,
    current_user: organization_dependency
):
    """Delete a notification"""
    
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.organization_id == current_user.id
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    await db.delete(notification)
    await db.commit()
    
    return {"message": "Notification deleted successfully"}


@router.get("/test", response_model=dict)
async def test_notification_endpoint():
    """Test endpoint to check if notifications are working"""
    try:
        return {"status": "success", "message": "Notification endpoint is working"}
    except Exception as e:
        print(f"Error in test endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test endpoint failed: {str(e)}"
        )

@router.get("/debug", response_model=dict)
async def debug_notification_endpoint(
    db: db_dependency,
    current_user: organization_dependency
):
    """Debug endpoint to check dependencies and basic functionality"""
    try:
        # Test basic dependency resolution
        user_info = {
            "id": current_user.id,
            "role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
            "email": getattr(current_user, 'email', 'N/A')
        }
        
        # Test database connection
        db_test = "Database connection OK"
        try:
            await db.execute("SELECT 1")
        except Exception as db_error:
            db_test = f"Database error: {str(db_error)}"
        
        return {
            "status": "success", 
            "message": "Debug endpoint working",
            "user_info": user_info,
            "database_test": db_test
        }
    except Exception as e:
        print(f"Error in debug endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Debug endpoint failed: {str(e)}"
        )

@router.get("/types/available", response_model=List[str])
async def get_notifications_types():
    """Get list of available notification types"""
    try:
        return [notification_type.value for notification_type in NotificationType]
    except Exception as e:
        print(f"Error getting notification types: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notification types: {str(e)}"
        )


@router.get("/priorities/available", response_model=List[str])
async def get_available_priorities():
    """Get list of available notification priorities"""
    return [priority.value for priority in NotificationPriority]
