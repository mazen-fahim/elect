from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from core.base import Base


class NotificationType(str, Enum):
    # Election lifecycle notifications
    ELECTION_STARTED = "election_started"
    ELECTION_ENDED = "election_ended"
    ELECTION_CREATED = "election_created"
    ELECTION_UPDATED = "election_updated"
    ELECTION_DELETED = "election_deleted"
    ELECTION_PUBLISHED = "election_published"
    ELECTION_UNPUBLISHED = "election_unpublished"
    ELECTION_PAUSED = "election_paused"
    ELECTION_RESUMED = "election_resumed"
    
    # Candidate notifications
    CANDIDATE_ADDED = "candidate_added"
    CANDIDATE_UPDATED = "candidate_updated"
    CANDIDATE_DELETED = "candidate_deleted"
    CANDIDATE_APPROVED = "candidate_approved"
    CANDIDATE_REJECTED = "candidate_rejected"
    CANDIDATE_BULK_IMPORTED = "candidate_bulk_imported"
    CANDIDATE_PARTICIPATION_ADDED = "candidate_participation_added"
    CANDIDATE_PARTICIPATION_REMOVED = "candidate_participation_removed"
    
    # Voter notifications
    VOTER_ADDED = "voter_added"
    VOTER_UPDATED = "voter_updated"
    VOTER_DELETED = "voter_deleted"
    VOTER_BULK_IMPORTED = "voter_bulk_imported"
    VOTER_REGISTERED = "voter_registered"
    VOTER_UNREGISTERED = "voter_unregistered"
    VOTER_VERIFIED = "voter_verified"
    VOTER_VERIFICATION_FAILED = "voter_verification_failed"
    
    # Voting process notifications
    VOTE_CAST = "vote_cast"
    VOTE_UPDATED = "vote_updated"
    VOTE_CANCELLED = "vote_cancelled"
    VOTING_THRESHOLD_REACHED = "voting_threshold_reached"
    VOTING_MILESTONE_REACHED = "voting_milestone_reached"
    VOTING_IRREGULARITY_DETECTED = "voting_irregularity_detected"
    
    # File operations
    CSV_UPLOAD_SUCCESS = "csv_upload_success"
    CSV_UPLOAD_FAILED = "csv_upload_failed"
    CSV_VALIDATION_ERROR = "csv_validation_error"
    FILE_PROCESSED = "file_processed"
    BULK_OPERATION_STARTED = "bulk_operation_started"
    BULK_OPERATION_COMPLETED = "bulk_operation_completed"
    BULK_OPERATION_FAILED = "bulk_operation_failed"
    
    # Authentication & Security
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    LOGIN_ATTEMPT_FAILED = "login_attempt_failed"
    PASSWORD_CHANGED = "password_changed"
    PASSWORD_RESET_REQUESTED = "password_reset_requested"
    PASSWORD_RESET_COMPLETED = "password_reset_completed"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    SECURITY_ALERT = "security_alert"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    
    # Organization management
    ORGANIZATION_UPDATED = "organization_updated"
    ORGANIZATION_SETTINGS_CHANGED = "organization_settings_changed"
    ORGANIZATION_PROFILE_UPDATED = "organization_profile_updated"
    API_ENDPOINT_CHANGED = "api_endpoint_changed"
    
    # System notifications
    SYSTEM_MAINTENANCE = "system_maintenance"
    SYSTEM_UPDATE = "system_update"
    SYSTEM_ERROR = "system_error"
    DATABASE_BACKUP = "database_backup"
    PERFORMANCE_ALERT = "performance_alert"
    
    # API & Integration
    API_CALL_MADE = "api_call_made"
    API_CALL_FAILED = "api_call_failed"
    API_RATE_LIMIT_EXCEEDED = "api_rate_limit_exceeded"
    WEBHOOK_SENT = "webhook_sent"
    WEBHOOK_FAILED = "webhook_failed"
    EXTERNAL_SERVICE_ERROR = "external_service_error"
    
    # Data & Analytics
    REPORT_GENERATED = "report_generated"
    DATA_EXPORT_COMPLETED = "data_export_completed"
    DATA_IMPORT_COMPLETED = "data_import_completed"
    ANALYTICS_MILESTONE = "analytics_milestone"
    
    # UI/UX Events
    DASHBOARD_ACCESSED = "dashboard_accessed"
    PAGE_VISITED = "page_visited"
    FEATURE_USED = "feature_used"
    ERROR_ENCOUNTERED = "error_encountered"
    
    # Compliance & Audit
    AUDIT_LOG_CREATED = "audit_log_created"
    COMPLIANCE_CHECK_PASSED = "compliance_check_passed"
    COMPLIANCE_CHECK_FAILED = "compliance_check_failed"
    DATA_RETENTION_POLICY_APPLIED = "data_retention_policy_applied"


class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.user_id"), nullable=False, index=True)
    
    # Notification details
    type = Column(String(50), nullable=False, index=True)
    priority = Column(String(20), default=NotificationPriority.MEDIUM)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Related entities (optional foreign keys for context)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=True)
    candidate_id = Column(String(255), nullable=True)  # hashed_national_id
    voter_id = Column(String(255), nullable=True)      # voter_hashed_national_id
    
    # Metadata
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), index=True)
    read_at = Column(DateTime, nullable=True)
    
    # Additional data (JSON-like string for flexible data storage)
    additional_data = Column(Text, nullable=True)  # JSON string for additional context
    
    # Relationships
    organization = relationship("Organization", back_populates="notifications", foreign_keys=[organization_id])
    election = relationship("Election", back_populates="notifications", foreign_keys=[election_id])

    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.type}, organization_id={self.organization_id})>"

    @property
    def is_urgent(self) -> bool:
        return self.priority == NotificationPriority.URGENT

    @property
    def is_election_related(self) -> bool:
        return self.election_id is not None

    @property
    def age_hours(self) -> float:
        """Returns the age of the notification in hours."""
        return (datetime.now(timezone.utc) - self.created_at).total_seconds() / 3600

    def mark_as_read(self):
        """Mark the notification as read."""
        self.is_read = True
        self.read_at = datetime.now(timezone.utc)
