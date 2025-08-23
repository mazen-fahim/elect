import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

# Type alias for notification data to avoid MissingGreenlet errors
NotificationData = Dict[str, Any]

from models.notification import Notification, NotificationType, NotificationPriority
from models.organization import Organization
from models.election import Election
from models.candidate import Candidate
from schemas.notification import (
    NotificationCreate, 
    ElectionNotificationData,
    CandidateNotificationData, 
    VoterNotificationData,
    SystemNotificationData
)


class NotificationService:
    """Service for creating and managing notifications"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_notification(
        self, 
        organization_id: int, 
        notification_type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        election_id: Optional[int] = None,
        candidate_id: Optional[str] = None,
        voter_id: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> NotificationData:
        """Create a new notification"""
        
        notification_data = NotificationCreate(
            organization_id=organization_id,
            type=notification_type,
            priority=priority,
            title=title,
            message=message,
            election_id=election_id,
            candidate_id=candidate_id,
            voter_id=voter_id,
            additional_data=json.dumps(additional_data) if additional_data else None
        )
        
        notification = Notification(**notification_data.model_dump())
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        
        # Extract data to avoid MissingGreenlet errors
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
            "additional_data": notification.additional_data,
            "created_at": notification.created_at,
            "read_at": notification.read_at
        }
        
        return notification_data

    # Election-related notifications
    async def create_election_started_notification(
        self, 
        organization_id: int, 
        election_data: ElectionNotificationData
    ) -> NotificationData:
        """Create notification when an election starts"""
        
        title = f"Election Started: {election_data.election_title}"
        message = (
            f"The election '{election_data.election_title}' has officially started "
            f"at {election_data.start_time.strftime('%Y-%m-%d %H:%M:%S UTC')}. "
            f"Voting is now open."
        )
        
        additional_data_dict = {
            "election_id": election_data.election_id,
            "election_title": election_data.election_title,
            "start_time": election_data.start_time.isoformat() if election_data.start_time else None,
            "end_time": election_data.end_time.isoformat() if election_data.end_time else None
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.ELECTION_STARTED,
            title=title,
            message=message,
            priority=NotificationPriority.HIGH,
            election_id=election_data.election_id,
            additional_data=additional_data_dict
        )

    async def create_election_ended_notification(
        self, 
        organization_id: int, 
        election_data: ElectionNotificationData
    ) -> NotificationData:
        """Create notification when an election ends"""
        
        if election_data.winner_candidate_id and election_data.winner_candidate_name:
            title = f"Election Ended: {election_data.election_title} - Winner Declared"
            message = (
                f"The election '{election_data.election_title}' has concluded "
                f"at {election_data.end_time.strftime('%Y-%m-%d %H:%M:%S UTC')}. "
                f"Winner: {election_data.winner_candidate_name} "
                f"with {election_data.total_votes or 0} total votes cast."
            )
        else:
            title = f"Election Ended: {election_data.election_title}"
            message = (
                f"The election '{election_data.election_title}' has concluded "
                f"at {election_data.end_time.strftime('%Y-%m-%d %H:%M:%S UTC')}. "
                f"Total votes cast: {election_data.total_votes or 0}."
            )
        
        additional_data_dict = {
            "election_id": election_data.election_id,
            "election_title": election_data.election_title,
            "end_time": election_data.end_time.isoformat() if election_data.end_time else None,
            "winner_candidate_id": election_data.winner_candidate_id,
            "winner_candidate_name": election_data.winner_candidate_name,
            "total_votes": election_data.total_votes
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.ELECTION_ENDED,
            title=title,
            message=message,
            priority=NotificationPriority.HIGH,
            election_id=election_data.election_id,
            candidate_id=election_data.winner_candidate_id,
            additional_data=additional_data_dict
        )

    async def create_election_created_notification(
        self, 
        organization_id: int, 
        election_data: ElectionNotificationData
    ) -> NotificationData:
        """Create notification when an election is created"""
        
        title = f"New Election Created: {election_data.election_title}"
        message = (
            f"A new election '{election_data.election_title}' has been created. "
            f"Scheduled to start: {election_data.start_time.strftime('%Y-%m-%d %H:%M:%S UTC')}, "
            f"End: {election_data.end_time.strftime('%Y-%m-%d %H:%M:%S UTC')}."
        )
        
        additional_data_dict = {
            "election_id": election_data.election_id,
            "election_title": election_data.election_title,
            "start_time": election_data.start_time.isoformat() if election_data.start_time else None,
            "end_time": election_data.end_time.isoformat() if election_data.end_time else None,
            "action": "created"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.ELECTION_CREATED,
            title=title,
            message=message,
            priority=NotificationPriority.MEDIUM,
            election_id=election_data.election_id,
            additional_data=additional_data_dict
        )

    async def create_election_updated_notification(
        self, 
        organization_id: int, 
        election_data: ElectionNotificationData,
        changes_made: List[str]
    ) -> NotificationData:
        """Create notification when an election is updated"""
        
        title = f"Election Updated: {election_data.election_title}"
        changes_text = ", ".join(changes_made) if changes_made else "configuration"
        message = (
            f"The election '{election_data.election_title}' has been updated. "
            f"Changes made to: {changes_text}."
        )
        
        additional_data_dict = {
            "election_id": election_data.election_id,
            "election_title": election_data.election_title,
            "changes_made": changes_made,
            "action": "updated"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.ELECTION_UPDATED,
            title=title,
            message=message,
            priority=NotificationPriority.MEDIUM,
            election_id=election_data.election_id,
            additional_data=additional_data_dict
        )

    async def create_election_deleted_notification(
        self, 
        organization_id: int, 
        election_title: str,
        election_id: Optional[int] = None
    ) -> NotificationData:
        """Create notification when an election is deleted"""
        
        title = f"Election Deleted: {election_title}"
        message = f"The election '{election_title}' has been permanently deleted."
        
        additional_data_dict = {
            "election_id": election_id,
            "election_title": election_title,
            "action": "deleted"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.ELECTION_DELETED,
            title=title,
            message=message,
            priority=NotificationPriority.MEDIUM,
            election_id=None,  # Set to None since election is deleted
            additional_data=additional_data_dict
        )

    # Candidate-related notifications
    async def create_candidate_added_notification(
        self, 
        organization_id: int, 
        candidate_data: CandidateNotificationData
    ) -> NotificationData:
        """Create notification when a candidate is added"""
        
        title = f"New Candidate Added: {candidate_data.candidate_name}"
        message = (
            f"A new candidate '{candidate_data.candidate_name}' has been added"
            + (f" to election '{candidate_data.election_title}'" if candidate_data.election_title else "") + "."
        )
        
        additional_data_dict = {
            "candidate_id": candidate_data.candidate_id,
            "candidate_name": candidate_data.candidate_name,
            "election_id": candidate_data.election_id,
            "election_title": candidate_data.election_title,
            "action": "added"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.CANDIDATE_ADDED,
            title=title,
            message=message,
            priority=NotificationPriority.MEDIUM,
            election_id=candidate_data.election_id,
            candidate_id=candidate_data.candidate_id,
            additional_data=additional_data_dict
        )

    async def create_candidate_updated_notification(
        self, 
        organization_id: int, 
        candidate_data: CandidateNotificationData
    ) -> NotificationData:
        """Create notification when a candidate is updated"""
        
        title = f"Candidate Updated: {candidate_data.candidate_name}"
        changes_text = ", ".join(candidate_data.changes_made) if candidate_data.changes_made else "profile information"
        message = (
            f"Candidate '{candidate_data.candidate_name}' has been updated. "
            f"Changes made to: {changes_text}."
        )
        
        additional_data_dict = {
            "candidate_id": candidate_data.candidate_id,
            "candidate_name": candidate_data.candidate_name,
            "election_id": candidate_data.election_id,
            "election_title": candidate_data.election_title,
            "changes_made": candidate_data.changes_made,
            "action": "updated"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.CANDIDATE_UPDATED,
            title=title,
            message=message,
            priority=NotificationPriority.LOW,
            election_id=candidate_data.election_id,
            candidate_id=candidate_data.candidate_id,
            additional_data=additional_data_dict
        )

    async def create_candidate_deleted_notification(
        self, 
        organization_id: int, 
        candidate_data: CandidateNotificationData
    ) -> NotificationData:
        """Create notification when a candidate is deleted"""
        
        title = f"Candidate Deleted: {candidate_data.candidate_name}"
        message = (
            f"Candidate '{candidate_data.candidate_name}' has been removed"
            + (f" from election '{candidate_data.election_title}'" if candidate_data.election_title else "") + "."
        )
        
        additional_data_dict = {
            "candidate_id": candidate_data.candidate_id,
            "candidate_name": candidate_data.candidate_name,
            "election_id": candidate_data.election_id,
            "election_title": candidate_data.election_title,
            "action": "deleted"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.CANDIDATE_DELETED,
            title=title,
            message=message,
            priority=NotificationPriority.MEDIUM,
            election_id=candidate_data.election_id,
            candidate_id=None,  # Set to None since candidate is deleted
            additional_data=additional_data_dict
        )

    # Voter-related notifications
    async def create_vote_cast_notification(
        self, 
        organization_id: int, 
        voter_data: VoterNotificationData,
        candidate_name: str
    ) -> NotificationData:
        """Create notification when a vote is cast"""
        
        title = f"Vote Cast in {voter_data.election_title}"
        message = (
            f"A vote has been cast in election '{voter_data.election_title}' "
            f"for candidate '{candidate_name}'."
        )
        
        additional_data_dict = {
            "voter_id": voter_data.voter_id,
            "election_id": voter_data.election_id,
            "election_title": voter_data.election_title,
            "candidate_voted_for": candidate_name,
            "action": "vote_cast"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.VOTE_CAST,
            title=title,
            message=message,
            priority=NotificationPriority.LOW,
            election_id=voter_data.election_id,
            voter_id=voter_data.voter_id,
            additional_data=additional_data_dict
        )

    # System notifications
    async def create_system_notification(
        self, 
        organization_id: int, 
        system_data: SystemNotificationData,
        notification_type: NotificationType = NotificationType.SYSTEM_MAINTENANCE
    ) -> NotificationData:
        """Create system-related notifications"""
        
        if notification_type == NotificationType.SYSTEM_MAINTENANCE:
            title = "System Maintenance Scheduled"
            message = (
                f"System maintenance is scheduled for "
                f"{system_data.maintenance_start.strftime('%Y-%m-%d %H:%M:%S UTC')} "
                f"to {system_data.maintenance_end.strftime('%Y-%m-%d %H:%M:%S UTC')}. "
                f"Some features may be temporarily unavailable."
            )
            priority = NotificationPriority.MEDIUM
        else:  # SECURITY_ALERT
            title = "Security Alert"
            message = "A security alert has been detected. Please review your account activity."
            priority = NotificationPriority.URGENT
        
        additional_data_dict = {
            "system_component": system_data.system_component,
            "maintenance_start": system_data.maintenance_start.isoformat() if system_data.maintenance_start else None,
            "maintenance_end": system_data.maintenance_end.isoformat() if system_data.maintenance_end else None,
            "affected_features": system_data.affected_features
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            additional_data=additional_data_dict
        )

    # CSV/File operation notifications
    async def create_csv_upload_notification(
        self, 
        organization_id: int,
        file_name: str,
        success: bool,
        record_count: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> NotificationData:
        """Create notification for CSV upload operations"""
        
        if success:
            title = f"CSV Upload Successful: {file_name}"
            message = f"Successfully uploaded and processed {record_count or 0} records from {file_name}."
            notification_type = NotificationType.CSV_UPLOAD_SUCCESS
            priority = NotificationPriority.MEDIUM
        else:
            title = f"CSV Upload Failed: {file_name}"
            message = f"Failed to process {file_name}. Error: {error_message or 'Unknown error'}."
            notification_type = NotificationType.CSV_UPLOAD_FAILED
            priority = NotificationPriority.HIGH
        
        additional_data_dict = {
            "file_name": file_name,
            "success": success,
            "record_count": record_count,
            "error_message": error_message,
            "action": "csv_upload"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            additional_data=additional_data_dict
        )

    # Authentication notifications
    async def create_login_notification(
        self, 
        organization_id: int,
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> NotificationData:
        """Create notification for login attempts"""
        
        if success:
            title = "Successful Login"
            message = f"Organization successfully logged in from {ip_address or 'unknown IP'}."
            notification_type = NotificationType.USER_LOGIN
            priority = NotificationPriority.LOW
        else:
            title = "Failed Login Attempt"
            message = f"Failed login attempt from {ip_address or 'unknown IP'}."
            notification_type = NotificationType.LOGIN_ATTEMPT_FAILED
            priority = NotificationPriority.MEDIUM
        
        additional_data_dict = {
            "success": success,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "login_attempt"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            additional_data=additional_data_dict
        )

    # Dashboard access notifications
    async def create_dashboard_access_notification(
        self, 
        organization_id: int,
        page_name: str,
        ip_address: Optional[str] = None
    ) -> NotificationData:
        """Create notification for dashboard access"""
        
        title = f"Dashboard Accessed: {page_name}"
        message = f"Organization accessed the {page_name} dashboard page."
        
        additional_data_dict = {
            "page_name": page_name,
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "dashboard_access"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.DASHBOARD_ACCESSED,
            title=title,
            message=message,
            priority=NotificationPriority.LOW,
            additional_data=additional_data_dict
        )

    # Bulk operation notifications
    async def create_bulk_operation_notification(
        self, 
        organization_id: int,
        operation_type: str,
        status: str,  # started, completed, failed
        record_count: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> NotificationData:
        """Create notification for bulk operations"""
        
        if status == "started":
            title = f"Bulk Operation Started: {operation_type}"
            message = f"Started bulk {operation_type} operation."
            notification_type = NotificationType.BULK_OPERATION_STARTED
            priority = NotificationPriority.LOW
        elif status == "completed":
            title = f"Bulk Operation Completed: {operation_type}"
            message = f"Successfully completed bulk {operation_type} operation. Processed {record_count or 0} records."
            notification_type = NotificationType.BULK_OPERATION_COMPLETED
            priority = NotificationPriority.MEDIUM
        else:  # failed
            title = f"Bulk Operation Failed: {operation_type}"
            message = f"Bulk {operation_type} operation failed. Error: {error_message or 'Unknown error'}."
            notification_type = NotificationType.BULK_OPERATION_FAILED
            priority = NotificationPriority.HIGH
        
        additional_data_dict = {
            "operation_type": operation_type,
            "status": status,
            "record_count": record_count,
            "error_message": error_message,
            "action": "bulk_operation"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            additional_data=additional_data_dict
        )

    # API call notifications
    async def create_api_call_notification(
        self, 
        organization_id: int,
        endpoint: str,
        method: str,
        success: bool,
        response_code: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> NotificationData:
        """Create notification for API calls"""
        
        if success:
            title = f"API Call Successful: {method} {endpoint}"
            message = f"Successfully called {method} {endpoint} (Status: {response_code})."
            notification_type = NotificationType.API_CALL_MADE
            priority = NotificationPriority.LOW
        else:
            title = f"API Call Failed: {method} {endpoint}"
            message = f"Failed to call {method} {endpoint}. Error: {error_message or 'Unknown error'}."
            notification_type = NotificationType.API_CALL_FAILED
            priority = NotificationPriority.MEDIUM
        
        additional_data_dict = {
            "endpoint": endpoint,
            "method": method,
            "success": success,
            "response_code": response_code,
            "error_message": error_message,
            "action": "api_call"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            additional_data=additional_data_dict
        )

    # System error notifications
    async def create_system_error_notification(
        self, 
        organization_id: int,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> NotificationData:
        """Create notification for system errors"""
        
        title = f"System Error: {error_type}"
        message = f"System error encountered: {error_message}"
        
        additional_data_dict = {
            "error_type": error_type,
            "error_message": error_message,
            "context": context,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "system_error"
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.SYSTEM_ERROR,
            title=title,
            message=message,
            priority=NotificationPriority.HIGH,
            additional_data=additional_data_dict
        )

    # Feature usage notifications
    async def create_feature_usage_notification(
        self, 
        organization_id: int,
        feature_name: str,
        action: str,
        details: Optional[Dict[str, Any]] = None
    ) -> NotificationData:
        """Create notification for feature usage"""
        
        title = f"Feature Used: {feature_name}"
        message = f"Used feature '{feature_name}' - {action}."
        
        additional_data_dict = {
            "feature_name": feature_name,
            "action": action,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return await self.create_notification(
            organization_id=organization_id,
            notification_type=NotificationType.FEATURE_USED,
            title=title,
            message=message,
            priority=NotificationPriority.LOW,
            additional_data=additional_data_dict
        )

    # Utility methods
    async def mark_as_read(self, notification_id: int, organization_id: int) -> bool:
        """Mark a notification as read"""
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.organization_id == organization_id
            )
        )
        notification = result.scalar_one_or_none()
        
        if notification:
            notification.mark_as_read()
            await self.db.commit()
            return True
        return False

    async def mark_all_as_read(self, organization_id: int) -> int:
        """Mark all notifications as read for an organization"""
        result = await self.db.execute(
            select(Notification).where(
                Notification.organization_id == organization_id,
                Notification.is_read == False
            )
        )
        notifications = result.scalars().all()
        
        count = 0
        for notification in notifications:
            notification.mark_as_read()
            count += 1
        
        await self.db.commit()
        return count

    async def get_notifications_summary(self, organization_id: int) -> Dict[str, int]:
        """Get summary statistics for notifications"""
        
        # Total notifications
        total_result = await self.db.execute(
            select(Notification).where(Notification.organization_id == organization_id)
        )
        total_notifications = len(total_result.scalars().all())
        
        # Unread notifications
        unread_result = await self.db.execute(
            select(Notification).where(
                Notification.organization_id == organization_id,
                Notification.is_read == False
            )
        )
        unread_count = len(unread_result.scalars().all())
        
        # Urgent notifications
        urgent_result = await self.db.execute(
            select(Notification).where(
                Notification.organization_id == organization_id,
                Notification.priority == NotificationPriority.URGENT,
                Notification.is_read == False
            )
        )
        urgent_count = len(urgent_result.scalars().all())
        
        # Today's notifications
        today = datetime.now(timezone.utc).date()
        today_result = await self.db.execute(
            select(Notification).where(
                Notification.organization_id == organization_id,
                Notification.created_at >= today
            )
        )
        today_count = len(today_result.scalars().all())
        
        # Election-related notifications
        election_result = await self.db.execute(
            select(Notification).where(
                Notification.organization_id == organization_id,
                Notification.election_id.isnot(None)
            )
        )
        election_related_count = len(election_result.scalars().all())
        
        return {
            "total_notifications": total_notifications,
            "unread_count": unread_count,
            "urgent_count": urgent_count,
            "today_count": today_count,
            "election_related_count": election_related_count
        }
