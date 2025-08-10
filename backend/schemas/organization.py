from datetime import datetime
from pydantic import BaseModel


class OrganizationDashboardStats(BaseModel):
    total_elections: int
    total_candidates: int
    total_votes: int
    recent_elections: list["RecentElection"]


class RecentElection(BaseModel):
    id: int
    title: str
    status: str
    types: str
    total_vote_count: int
    starts_at: datetime
    ends_at: datetime
    created_at: datetime
    number_of_candidates: int

    class Config:
        from_attributes = True


# Update forward reference
OrganizationDashboardStats.model_rebuild()
