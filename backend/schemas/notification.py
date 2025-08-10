from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from models.notification import NotificationType, NotificationPriority


class NotificationBase(BaseModel):
    """Base notification schema"""
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.MEDIUM
    title: str = Field(..., max_length=255)
    message: str
    election_id: Optional[int] = None
    candidate_id: Optional[str] = None
    voter_id: Optional[str] = None
    additional_data: Optional[str] = None


class NotificationCreate(NotificationBase):
    """Schema for creating a notification"""
    organization_id: int


class NotificationUpdate(BaseModel):
    """Schema for updating a notification"""
    is_read: Optional[bool] = None
    priority: Optional[NotificationPriority] = None
    title: Optional[str] = Field(None, max_length=255)
    message: Optional[str] = None
    additional_data: Optional[str] = None


class NotificationRead(NotificationBase):
    """Schema for reading a notification"""
    id: int
    organization_id: int
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    
    # Additional computed fields
    age_hours: Optional[float] = None
    is_urgent: Optional[bool] = None
    is_election_related: Optional[bool] = None
    
    # Related entity information
    election_title: Optional[str] = None
    candidate_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationSummary(BaseModel):
    """Schema for notification summary/stats"""
    total_notifications: int
    unread_count: int
    urgent_count: int
    today_count: int
    election_related_count: int


class NotificationMarkAllReadRequest(BaseModel):
    """Schema for marking all notifications as read"""
    mark_all_read: bool = True


class NotificationFilter(BaseModel):
    """Schema for filtering notifications"""
    is_read: Optional[bool] = None
    type: Optional[NotificationType] = None
    priority: Optional[NotificationPriority] = None
    election_id: Optional[int] = None
    days_ago: Optional[int] = None  # Filter notifications from last N days
    limit: Optional[int] = Field(50, ge=1, le=100)
    offset: Optional[int] = Field(0, ge=0)


# Specific notification creation schemas for different types
class ElectionNotificationData(BaseModel):
    """Data specific to election notifications"""
    election_id: int
    election_title: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    winner_candidate_id: Optional[str] = None
    winner_candidate_name: Optional[str] = None
    total_votes: Optional[int] = None


class CandidateNotificationData(BaseModel):
    """Data specific to candidate notifications"""
    candidate_id: str
    candidate_name: str
    election_id: Optional[int] = None
    election_title: Optional[str] = None
    changes_made: Optional[list[str]] = None  # List of fields that were changed


class VoterNotificationData(BaseModel):
    """Data specific to voter notifications"""
    voter_id: str
    election_id: Optional[int] = None
    election_title: Optional[str] = None
    phone_number: Optional[str] = None


class SystemNotificationData(BaseModel):
    """Data specific to system notifications"""
    system_component: Optional[str] = None
    maintenance_start: Optional[datetime] = None
    maintenance_end: Optional[datetime] = None
    affected_features: Optional[list[str]] = None
