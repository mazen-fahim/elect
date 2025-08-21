import json
import hashlib
import aiohttp
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status

from models.election import Election
from models.voter import Voter
from models.candidate import Candidate
from models.candidate_participation import CandidateParticipation
from schemas.api_election import VoterVerificationRequest, VoterVerificationResponse, CandidateInfo


class APIElectionService:
    """Service for handling API-based election voter verification"""
    
    def __init__(self, db_session):
        self.db = db_session
    
    def _hash_identifier(self, value: str) -> str:
        """Hash a national ID to create a hashed identifier"""
        return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()
    
    async def verify_voter_via_api(
        self, 
        election: Election, 
        voter_national_id: str
    ) -> VoterVerificationResponse:
        """
        Verify voter eligibility by calling the organization's API endpoint
        """
        if not election.api_endpoint:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This election does not have an API endpoint configured"
            )
        
        # Prepare the request payload
        request_data = VoterVerificationRequest(
            voter_national_id=voter_national_id,
            election_id=election.id,
            election_title=election.title
        )
        
        try:
            # Make HTTP request to organization's API
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    election.api_endpoint,
                    json=request_data.model_dump(),
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"Organization API returned status {response.status}"
                        )
                    
                    response_data = await response.json()
                    return VoterVerificationResponse(**response_data)
                    
        except aiohttp.ClientError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to connect to organization API: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error verifying voter: {str(e)}"
            )
    
    async def create_voter_from_api_response(
        self,
        election_id: int,
        voter_national_id: str,
        api_response: VoterVerificationResponse
    ) -> Voter:
        """
        Create a voter record from the API response and store eligible candidates
        """
        if not api_response.is_eligible:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=api_response.error_message or "Voter is not eligible for this election"
            )
        
        if not api_response.phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization API did not provide phone number"
            )
        
        # Hash the national ID
        hashed_id = self._hash_identifier(voter_national_id)
        
        # Check if voter already exists
        from sqlalchemy.future import select
        existing_voter = await self.db.execute(
            select(Voter).where(
                Voter.voter_hashed_national_id == hashed_id,
                Voter.election_id == election_id
            )
        )
        
        if existing_voter.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voter already exists for this election"
            )
        
        # Create candidates if provided by the API
        eligible_candidate_ids = []
        if api_response.eligible_candidates:
            eligible_candidate_ids = await self._create_candidates_from_api(
                election_id, 
                api_response.eligible_candidates
            )
        
        # Create the voter record
        voter = Voter(
            voter_hashed_national_id=hashed_id,
            phone_number=api_response.phone_number,
            election_id=election_id,
            is_api_voter=True,
            eligible_candidates=json.dumps(eligible_candidate_ids) if eligible_candidate_ids else None
        )
        
        self.db.add(voter)
        await self.db.flush()
        
        return voter
    
    async def _create_candidates_from_api(
        self,
        election_id: int,
        candidates_info: List[CandidateInfo]
    ) -> List[str]:
        """
        Create candidates from API response and return their IDs
        """
        candidate_ids = []
        
        for candidate_info in candidates_info:
            # Check if candidate already exists
            from sqlalchemy.future import select
            existing_candidate = await self.db.execute(
                select(Candidate).where(
                    Candidate.hashed_national_id == candidate_info.hashed_national_id
                )
            )
            
            if existing_candidate.scalar_one_or_none():
                candidate = existing_candidate.scalar_one()
            else:
                # Parse birth date if provided
                birth_date = None
                if candidate_info.birth_date:
                    birth_date = datetime.fromisoformat(candidate_info.birth_date.replace("Z", "+00:00"))
                
                # Create new candidate
                candidate = Candidate(
                    hashed_national_id=candidate_info.hashed_national_id,
                    name=candidate_info.name,
                    district=candidate_info.district,
                    governorate=candidate_info.governorate,
                    country=candidate_info.country,
                    party=candidate_info.party,
                    symbol_icon_url=candidate_info.symbol_icon_url,
                    symbol_name=candidate_info.symbol_name,
                    photo_url=candidate_info.photo_url,
                    birth_date=birth_date,
                    description=candidate_info.description,
                    organization_id=1  # Default organization ID for API candidates
                )
                self.db.add(candidate)
                await self.db.flush()
            
            # Create candidate participation in election
            participation = CandidateParticipation(
                candidate_hashed_national_id=candidate.hashed_national_id,
                election_id=election_id
            )
            self.db.add(participation)
            
            candidate_ids.append(candidate.hashed_national_id)
        
        return candidate_ids
    
    async def get_voter_eligible_candidates(
        self,
        voter: Voter
    ) -> List[Dict[str, Any]]:
        """
        Get the list of candidates that a voter is eligible to vote for
        """
        if not voter.eligible_candidates:
            return []
        
        try:
            candidate_ids = json.loads(voter.eligible_candidates)
        except (json.JSONDecodeError, TypeError):
            return []
        
        if not candidate_ids:
            return []
        
        # Get candidate details
        from sqlalchemy.future import select
        candidates_result = await self.db.execute(
            select(Candidate).where(Candidate.hashed_national_id.in_(candidate_ids))
        )
        candidates = candidates_result.scalars().all()
        
        return [
            {
                "hashed_national_id": c.hashed_national_id,
                "name": c.name,
                "district": c.district,
                "governorate": c.governorate,
                "country": c.country,
                "party": c.party,
                "symbol_icon_url": c.symbol_icon_url,
                "symbol_name": c.symbol_name,
                "photo_url": c.photo_url,
                "birth_date": c.birth_date.isoformat() if c.birth_date else None,
                "description": c.description
            }
            for c in candidates
        ]
