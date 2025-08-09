from datetime import datetime, timedelta
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
    
    # Build query conditions
    conditions = [Notification.organization_id == current_user.id]
    
    if is_read is not None:
        conditions.append(Notification.is_read == is_read)
    
    if notification_type is not None:
        conditions.append(Notification.type == notification_type)
    
    if priority is not None:
        conditions.append(Notification.priority == priority)
    
    if election_id is not None:
        conditions.append(Notification.election_id == election_id)
    
    if days_ago is not None:
        cutoff_date = datetime.utcnow() - timedelta(days=days_ago)
        conditions.append(Notification.created_at >= cutoff_date)
    
    # Execute query
    query = (
        select(Notification)
        .where(and_(*conditions))
        .options(selectinload(Notification.election))
        .order_by(desc(Notification.created_at))
        .offset(offset)
        .limit(limit)
    )
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    # Enhance notifications with additional data
    enhanced_notifications = []
    for notification in notifications:
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
            "election_title": notification.election.title if notification.election else None,
            "candidate_name": None  # Will be populated below if needed
        }
        
        # Get candidate name if candidate_id is present
        if notification.candidate_id:
            candidate_result = await db.execute(
                select(Candidate).where(Candidate.hashed_national_id == notification.candidate_id)
            )
            candidate = candidate_result.scalar_one_or_none()
            if candidate:
                notification_dict["candidate_name"] = candidate.name
        
        enhanced_notifications.append(NotificationRead(**notification_dict))
    
    return enhanced_notifications


@router.get("/summary", response_model=NotificationSummary)
async def get_notifications_summary(
    db: db_dependency,
    current_user: organization_dependency
):
    """Get summary statistics for notifications"""
    
    notification_service = NotificationService(db)
    summary_data = await notification_service.get_notifications_summary(current_user.id)
    
    return NotificationSummary(**summary_data)


@router.get("/{notification_id}", response_model=NotificationRead)
async def get_notification(
    notification_id: int,
    db: db_dependency,
    current_user: organization_dependency
):
    """Get a specific notification by ID"""
    
    result = await db.execute(
        select(Notification)
        .where(
            Notification.id == notification_id,
            Notification.organization_id == current_user.id
        )
        .options(selectinload(Notification.election))
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
        "election_title": notification.election.title if notification.election else None,
        "candidate_name": candidate_name
    }
    
    return NotificationRead(**notification_data)


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
        .options(selectinload(Notification.election))
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
            notification.read_at = datetime.utcnow()
        elif field == "is_read" and not value and notification.is_read:
            # Mark as unread
            notification.is_read = False
            notification.read_at = None
        else:
            setattr(notification, field, value)
    
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
        "election_title": notification.election.title if notification.election else None,
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


@router.get("/types/available", response_model=List[str])
async def get_available_notification_types():
    """Get list of available notification types"""
    return [notification_type.value for notification_type in NotificationType]


@router.get("/priorities/available", response_model=List[str])
async def get_available_priorities():
    """Get list of available notification priorities"""
    return [priority.value for priority in NotificationPriority]
