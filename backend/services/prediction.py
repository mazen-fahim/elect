import os
import joblib
from typing import Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.voter import Voter
from models.voting_process import VotingProcess
from models.candidate_participation import CandidateParticipation
from models.candidate_voter_mapping import CandidateVoterMapping

class PredictionService:
    def __init__(self, db: AsyncSession, model_path: str = "../ai/models/participation_model.pkl"):
        """
        Initialize the service by loading the pre-trained model.
        """
        self.db = db
        self.model_path = model_path
        self.model = self._load_model()

    def _load_model(self):
        """
        Load the trained model from the specified file path.
        Raise FileNotFoundError if the model file does not exist.
        """
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found at {self.model_path}")
        return joblib.load(self.model_path)

    def prepare_features(self, election_data: Dict[str, Any]) -> list:
        """
        Prepare the input feature vector from the raw election data dictionary.
        This includes registered voters, vote datetime, and votes/registrations per candidate.
        """
        features = []
        features.append(election_data.get("registered_voters"))
        features.append(election_data.get("vote_datetime"))
        
        max_candidates = 10
        for i in range(max_candidates):
            features.append(election_data.get(f"votes_per_candidate_{i+1}", 0))
            features.append(election_data.get(f"registered_per_candidate_{i+1}", 0))
        return features

    async def get_prediction_statistics(self, election_id: int) -> Dict[str, Any]:
        """
        Retrieve the six key election statistics along with predicted actual voters.
        """

        # 1. Total registered voters in the election
        total_registered_voters = await self.db.scalar(
            select(func.count()).select_from(Voter).where(Voter.election_id == election_id)
        )

        # 2. Number of actual voters who voted
        actual_voters_count = await self.db.scalar(
            select(func.count()).select_from(VotingProcess).where(VotingProcess.election_id == election_id)
        )

        # 3. Number of votes per candidate
        votes_per_candidate_rows = await self.db.execute(
            select(
                CandidateParticipation.candidate_hashed_national_id,
                CandidateParticipation.vote_count
            ).where(CandidateParticipation.election_id == election_id)
        )
        votes_per_candidate = {row[0]: row[1] for row in votes_per_candidate_rows}

        # 4. Number of registered voters per candidate
        registered_per_candidate_rows = await self.db.execute(
            select(
                CandidateVoterMapping.candidate_hashed_national_id,
                func.count(CandidateVoterMapping.voter_hashed_national_id)
            ).where(CandidateVoterMapping.election_id == election_id)
            .group_by(CandidateVoterMapping.candidate_hashed_national_id)
        )
        registered_per_candidate = {row[0]: row[1] for row in registered_per_candidate_rows}

        # 5. Votes count per hour (group by hour)
        votes_per_hour_rows = await self.db.execute(
            select(
                func.date_trunc('hour', VotingProcess.created_at).label('hour'),
                func.count()
            ).where(VotingProcess.election_id == election_id)
            .group_by('hour').order_by('hour')
        )
        votes_per_hour = [{"hour": row[0].isoformat(), "count": row[1]} for row in votes_per_hour_rows]

        # 6. Participation percentage = actual voters / total registered * 100
        participation_percentage = (
            (actual_voters_count / total_registered_voters) * 100
            if total_registered_voters and total_registered_voters > 0 else 0
        )

        # Prepare data for AI prediction model
        election_data = {
            "registered_voters": total_registered_voters,
            "vote_datetime": 0,  # example static value or replace with current timestamp
        }

        # Fill votes and registered counts per candidate for AI features
        max_candidates = 10
        for idx in range(max_candidates):
            candidate_key = list(votes_per_candidate.keys())[idx] if idx < len(votes_per_candidate) else None
            votes = votes_per_candidate.get(candidate_key, 0)
            registered = registered_per_candidate.get(candidate_key, 0)
            election_data[f"votes_per_candidate_{idx+1}"] = votes
            election_data[f"registered_per_candidate_{idx+1}"] = registered

        # Predict actual voters count using AI model
        predicted_actual_voters = self.model.predict([self.prepare_features(election_data)])[0]

        return {
            "total_registered_voters": total_registered_voters,
            "actual_voters_count": actual_voters_count,
            "votes_per_candidate": votes_per_candidate,
            "registered_per_candidate": registered_per_candidate,
            "votes_per_hour": votes_per_hour,
            "participation_percentage": participation_percentage,
            "predicted_actual_voters": predicted_actual_voters,
        }
