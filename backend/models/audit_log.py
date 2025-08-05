from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON

from . import Base

class VoteAuditLog(Base):
    __tablename__ = "vote_audit_logs"
    
    id = Column(Integer, primary_key=True)
    action = Column(String(50), nullable=False)
    voter_hash = Column(String(200), nullable=False)
    election_id = Column(Integer, nullable=False)
    candidate_id = Column(String(200))
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON)