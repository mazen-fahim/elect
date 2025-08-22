import json
import hashlib
import aiohttp
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status

from models.election import Election
from models.voter import Voter
from models.candidate import Candidate
from models.candidate_participation import CandidateParticipation
from schemas.api_election import VoterVerificationRequest, VoterVerificationResponse, CandidateInfo
from core.shared import Country


class APIElectionService:
    """Service for handling API-based election voter verification"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.logger = logging.getLogger(__name__)
    
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
        
        # Check if this is a dummy service endpoint (internal call)
        if "dummy-service" in election.api_endpoint:
            # Handle dummy service internally without HTTP request
            return await self._verify_voter_via_dummy_service(election, voter_national_id)
        
        # Prepare the request payload for external API
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
    
    async def _verify_voter_via_dummy_service(
        self,
        election: Election,
        voter_national_id: str
    ) -> VoterVerificationResponse:
        """
        Verify voter eligibility via internal dummy service without HTTP request
        """
        try:
            from models.dummy_voter import DummyVoter
            from models.dummy_candidate import DummyCandidate
            from sqlalchemy.future import select
            from sqlalchemy import and_
            import json
            
            # Hash the national ID for lookup
            hashed_id = self._hash_identifier(voter_national_id)
            
            # Look up voter in the specific election
            voter_result = await self.db.execute(
                select(DummyVoter).where(
                    and_(
                        DummyVoter.voter_hashed_national_id == hashed_id,
                        DummyVoter.election_id == election.id
                    )
                )
            )
            voter = voter_result.scalar_one_or_none()
            
            if not voter:
                return VoterVerificationResponse(
                    is_eligible=False,
                    error_message="Voter not found in our system for this election"
                )
            
            # Get eligible candidates for this voter in this election
            eligible_candidates = []
            if voter.eligible_candidates:
                candidate_ids = json.loads(voter.eligible_candidates)
                candidates_result = await self.db.execute(
                    select(DummyCandidate).where(
                        and_(
                            DummyCandidate.hashed_national_id.in_(candidate_ids),
                            DummyCandidate.election_id == election.id
                        )
                    )
                )
                candidates = candidates_result.scalars().all()
                
                # Convert to CandidateInfo objects
                for candidate in candidates:
                    eligible_candidates.append(CandidateInfo(
                        hashed_national_id=candidate.hashed_national_id,
                        name=candidate.name,
                        district=candidate.district,
                        governorate=candidate.governorate,
                        country=candidate.country,
                        party=candidate.party,
                        symbol_icon_url=candidate.symbol_icon_url,
                        symbol_name=candidate.symbol_name,
                        photo_url=candidate.photo_url,
                        birth_date=candidate.birth_date.isoformat() if candidate.birth_date else None,
                        description=candidate.description
                    ))
            
            # Ensure voter has a phone number
            if not voter.phone_number:
                return VoterVerificationResponse(
                    is_eligible=False,
                    error_message="Voter does not have a phone number registered"
                )
            
            return VoterVerificationResponse(
                is_eligible=True,
                phone_number=voter.phone_number,
                eligible_candidates=eligible_candidates
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error verifying voter via dummy service: {str(e)}"
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
        
        existing_voter = existing_voter.scalar_one_or_none()
        
        if existing_voter:
            # Voter already exists, update their information if needed
            existing_voter.phone_number = api_response.phone_number
            existing_voter.is_api_voter = True
            
            # Update eligible candidates if provided
            if api_response.eligible_candidates:
                eligible_candidate_ids = await self._create_candidates_from_api(
                    election_id, 
                    api_response.eligible_candidates
                )
                existing_voter.eligible_candidates = json.dumps(eligible_candidate_ids) if eligible_candidate_ids else None
            
            await self.db.flush()
            return existing_voter
        
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
        # Get the election to find the organization ID
        from sqlalchemy.future import select
        election_result = await self.db.execute(
            select(Election).where(Election.id == election_id)
        )
        election = election_result.scalar_one_or_none()
        
        if not election:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Election not found"
            )
        
        # Store organization_id to avoid accessing expired ORM object
        organization_id = election.organization_id
        
        candidate_ids = []
        
        for candidate_info in candidates_info:
            # Check if candidate already exists
            existing_candidate_result = await self.db.execute(
                select(Candidate).where(
                    Candidate.hashed_national_id == candidate_info.hashed_national_id
                )
            )
            existing_candidate = existing_candidate_result.scalar_one_or_none()
            
            if existing_candidate:
                candidate = existing_candidate
            else:
                # Parse birth date if provided
                birth_date = None
                if candidate_info.birth_date:
                    birth_date = datetime.fromisoformat(candidate_info.birth_date.replace("Z", "+00:00"))
                
                # Convert country string to Country enum
                try:
                    country_enum = Country(candidate_info.country)
                except ValueError:
                    self.logger.warning(f"Invalid country value: {candidate_info.country}, using default")
                    country_enum = Country.United_States  # Default fallback
                
                # Create new candidate
                candidate = Candidate(
                    hashed_national_id=candidate_info.hashed_national_id,
                    name=candidate_info.name,
                    district=candidate_info.district,
                    governorate=candidate_info.governorate,
                    country=country_enum,
                    party=candidate_info.party,
                    symbol_icon_url=candidate_info.symbol_icon_url,
                    symbol_name=candidate_info.symbol_name,
                    photo_url=candidate_info.photo_url,
                    birth_date=birth_date,
                    description=candidate_info.description,
                    organization_id=organization_id  # Use stored organization ID
                )
                self.db.add(candidate)
            
            # Check if candidate participation already exists
            from sqlalchemy import and_
            existing_participation_result = await self.db.execute(
                select(CandidateParticipation).where(
                    and_(
                        CandidateParticipation.candidate_hashed_national_id == candidate.hashed_national_id,
                        CandidateParticipation.election_id == election_id
                    )
                )
            )
            existing_participation = existing_participation_result.scalar_one_or_none()
            
            if not existing_participation:
                # Create candidate participation in election
                participation = CandidateParticipation(
                    candidate_hashed_national_id=candidate.hashed_national_id,
                    election_id=election_id
                )
                self.db.add(participation)
            
            candidate_ids.append(candidate.hashed_national_id)
        
        # Flush all changes at once
        await self.db.flush()
        
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
