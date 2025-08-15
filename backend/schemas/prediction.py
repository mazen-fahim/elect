from typing import Dict, List
from pydantic import BaseModel

class VotesPerHour(BaseModel):
    hour: str  # ISO formatted hour string
    count: int

class PredictionOutSchema(BaseModel):
    # 1. Total registered voters in the election
    total_registered_voters: int

    # 2. Number of actual voters who voted
    actual_voters_count: int

    # 3. Number of votes per candidate
    votes_per_candidate: Dict[str, int]

    # 4. Number of registered voters per candidate
    registered_per_candidate: Dict[str, int]

    # 5. Votes count per hour
    votes_per_hour: List[VotesPerHour]

    # 6. Participation percentage in election
    participation_percentage: float

    # Predicted actual voters by AI model
    predicted_actual_voters: float

    class Config:
        orm_mode = True
