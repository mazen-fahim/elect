from datetime import datetime, timezone
from typing import List, Optional, Annotated
import json
import hashlib
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.future import select
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import db_dependency, admin_dependency
from models.dummy_candidate import DummyCandidate
from models.dummy_voter import DummyVoter
from schemas.api_election import (
    VoterVerificationRequest,
    VoterVerificationResponse,
    CandidateInfo,
    DummyCandidateCreate,
    DummyVoterCreate,
    DummyCandidateOut,
    DummyVoterOut
)

router = APIRouter(prefix="/dummy-service", tags=["dummy-service"])


def _hash_identifier(value: str) -> str:
    """Hash a national ID to create a hashed identifier"""
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def _format_phone_number(phone_number: str) -> str:
    """Auto-detect and add appropriate country code to phone number"""
    # Remove any existing + or country code
    clean_number = phone_number.strip().replace('+', '')
    
    # Common country code patterns
    country_codes = {
        # Egypt
        '10': '+2010', '11': '+2011', '12': '+2012', '15': '+2015',
        # Saudi Arabia
        '50': '+96650', '51': '+96651', '53': '+96653', '54': '+96654', '55': '+96655', '56': '+96656', '57': '+96657', '58': '+96658', '59': '+96659',
        # UAE
        '50': '+97150', '51': '+97151', '52': '+97152', '54': '+97154', '55': '+97155', '56': '+97156',
        # Jordan
        '77': '+96277', '78': '+96278', '79': '+96279',
        # Lebanon
        '3': '+9613', '70': '+96170', '71': '+96171', '76': '+96176', '78': '+96178', '79': '+96179',
        # Kuwait
        '50': '+96550', '51': '+96551', '60': '+96560', '65': '+96565', '66': '+96566', '69': '+96569',
        # Qatar
        '3': '+9743', '5': '+9745', '6': '+9746', '7': '+9747',
        # Bahrain
        '3': '+9733', '6': '+9736', '7': '+9737', '9': '+9739',
        # Oman
        '9': '+9689',
        # Iraq
        '7': '+9647',
        # Syria
        '9': '+9639',
        # Yemen
        '7': '+9677',
        # Palestine
        '5': '+9705', '9': '+9709',
        # Sudan
        '9': '+2499',
        # Libya
        '9': '+2189',
        # Tunisia
        '2': '+2162', '9': '+2169',
        # Algeria
        '5': '+2135', '6': '+2136', '7': '+2137',
        # Morocco
        '6': '+2126', '7': '+2127',
        # USA/Canada
        '1': '+1',
        # UK
        '7': '+447', '4': '+444',
        # Germany
        '15': '+4915', '16': '+4916', '17': '+4917',
        # France
        '6': '+336', '7': '+337',
        # Italy
        '3': '+393', '8': '+398',
        # Spain
        '6': '+346', '7': '+347',
        # Netherlands
        '6': '+316', '7': '+317',
        # Belgium
        '4': '+324', '5': '+325',
        # Switzerland
        '7': '+417', '8': '+418',
        # Austria
        '6': '+436', '7': '+437',
        # Sweden
        '7': '+467',
        # Norway
        '4': '+474', '9': '+479',
        # Denmark
        '2': '+452', '3': '+453', '4': '+454',
        # Finland
        '4': '+3584', '5': '+3585',
        # Poland
        '5': '+485', '6': '+486', '7': '+487', '8': '+488',
        # Czech Republic
        '6': '+4206', '7': '+4207',
        # Hungary
        '2': '+362', '3': '+363', '6': '+366', '7': '+367',
        # Romania
        '7': '+407',
        # Bulgaria
        '8': '+3598', '9': '+3599',
        # Greece
        '6': '+306', '9': '+309',
        # Turkey
        '5': '+905', '6': '+906',
        # Russia
        '9': '+79',
        # Ukraine
        '3': '+3803', '5': '+3805', '6': '+3806', '7': '+3807', '8': '+3808', '9': '+3809',
        # Belarus
        '2': '+3752', '3': '+3753', '4': '+3754', '5': '+3755', '6': '+3756', '7': '+3757', '8': '+3758', '9': '+3759',
        # Kazakhstan
        '7': '+77', '8': '+78',
        # Uzbekistan
        '9': '+9989',
        # Azerbaijan
        '5': '+9945', '6': '+9946', '7': '+9947', '8': '+9948', '9': '+9949',
        # Georgia
        '5': '+9955', '5': '+9955', '7': '+9957', '8': '+9958', '9': '+9959',
        # Armenia
        '9': '+3749',
        # Moldova
        '6': '+3736', '7': '+3737',
        # Latvia
        '2': '+3712',
        # Lithuania
        '6': '+3706',
        # Estonia
        '5': '+3725',
        # India
        '6': '+916', '7': '+917', '8': '+918', '9': '+919',
        # China
        '1': '+861', '3': '+863', '5': '+865', '6': '+866', '7': '+867', '8': '+868', '9': '+869',
        # Japan
        '7': '+817', '8': '+818', '9': '+819',
        # South Korea
        '1': '+821', '2': '+822', '3': '+823', '4': '+824', '5': '+825', '6': '+826', '7': '+827', '8': '+828', '9': '+829',
        # Australia
        '4': '+614',
        # New Zealand
        '2': '+642',
        # Brazil
        '1': '+551', '2': '+552', '3': '+553', '4': '+554', '5': '+555', '6': '+556', '7': '+557', '8': '+558', '9': '+559',
        # Argentina
        '9': '+549',
        # Chile
        '9': '+569',
        # Colombia
        '3': '+573',
        # Mexico
        '1': '+521', '2': '+522', '3': '+523', '4': '+524', '5': '+525', '6': '+526', '7': '+527', '8': '+528', '9': '+529',
        # Peru
        '9': '+519',
        # Venezuela
        '4': '+584',
        # South Africa
        '6': '+276', '7': '+277', '8': '+278',
        # Nigeria
        '7': '+2347', '8': '+2348', '9': '+2349',
        # Kenya
        '7': '+2547',
        # Egypt (more specific patterns)
        '100': '+20100', '101': '+20101', '102': '+20102', '103': '+20103', '104': '+20104', '105': '+20105', '106': '+20106', '107': '+20107', '108': '+20108', '109': '+20109',
        '110': '+20110', '111': '+20111', '112': '+20112', '113': '+20113', '114': '+20114', '115': '+20115', '116': '+20116', '117': '+20117', '118': '+20118', '119': '+20119',
        '120': '+20120', '121': '+20121', '122': '+20122', '123': '+20123', '124': '+20124', '125': '+20125', '126': '+20126', '127': '+20127', '128': '+20128', '129': '+20129',
        '130': '+20130', '131': '+20131', '132': '+20132', '133': '+20133', '134': '+20134', '135': '+20135', '136': '+20136', '137': '+20137', '138': '+20138', '139': '+20139',
        '140': '+20140', '141': '+20141', '142': '+20142', '143': '+20143', '144': '+20144', '145': '+20145', '146': '+20146', '147': '+20147', '148': '+20148', '149': '+20149',
        '150': '+20150', '151': '+20151', '152': '+20152', '153': '+20153', '154': '+20154', '155': '+20155', '156': '+20156', '157': '+20157', '158': '+20158', '159': '+20159',
        '160': '+20160', '161': '+20161', '162': '+20162', '163': '+20163', '164': '+20164', '165': '+20165', '166': '+20166', '167': '+20167', '168': '+20168', '169': '+20169',
        '170': '+20170', '171': '+20171', '172': '+20172', '173': '+20173', '174': '+20174', '175': '+20175', '176': '+20176', '177': '+20177', '178': '+20178', '179': '+20179',
        '180': '+20180', '181': '+20181', '182': '+20182', '183': '+20183', '184': '+20184', '185': '+20185', '186': '+20186', '187': '+20187', '188': '+20188', '189': '+20189',
        '190': '+20190', '191': '+20191', '192': '+20192', '193': '+20193', '194': '+20194', '195': '+20195', '196': '+20196', '197': '+20197', '198': '+20198', '199': '+20199',
    }
    
    # Check if number already has a country code
    if clean_number.startswith(('1', '2', '3', '4', '5', '6', '7', '8', '9')) and len(clean_number) >= 10:
        # Try to match country code patterns
        for prefix, country_code in country_codes.items():
            if clean_number.startswith(prefix):
                return country_code + clean_number[len(prefix):]
        
        # Default to Egypt (+20) for common Egyptian patterns
        if clean_number.startswith(('10', '11', '12', '15')) and len(clean_number) == 10:
            return '+20' + clean_number
        
        # Default to USA/Canada (+1) for 10-digit numbers
        if len(clean_number) == 10:
            return '+1' + clean_number
    
    # If no pattern matches, return as is (user should specify manually)
    return phone_number


@router.post("/verify-voter", response_model=VoterVerificationResponse)
async def verify_voter_eligibility(
    request: VoterVerificationRequest,
    db: db_dependency,
    _: admin_dependency
):
    """
    Dummy service endpoint that simulates an organization's voter verification API.
    This endpoint checks if a voter exists in our dummy database and returns their eligibility.
    """
    try:
        # Hash the national ID for lookup
        hashed_id = _hash_identifier(request.voter_national_id)
        
        # Look up voter in the specific election
        voter_result = await db.execute(
            select(DummyVoter).where(
                and_(
                    DummyVoter.voter_hashed_national_id == hashed_id,
                    DummyVoter.election_id == request.election_id
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
            # If specific candidates are specified, use those
            candidate_ids = json.loads(voter.eligible_candidates)
            candidates_result = await db.execute(
                select(DummyCandidate).where(
                    and_(
                        DummyCandidate.hashed_national_id.in_(candidate_ids),
                        DummyCandidate.election_id == request.election_id
                    )
                )
            )
            candidates = candidates_result.scalars().all()
        else:
            # If no specific candidates specified, default to all candidates in the election
            candidates_result = await db.execute(
                select(DummyCandidate).where(
                    DummyCandidate.election_id == request.election_id
                )
            )
            candidates = candidates_result.scalars().all()
        
        # Convert to CandidateInfo objects
        for candidate in candidates:
            eligible_candidates.append(CandidateInfo(
                hashed_national_id=candidate.hashed_national_id,
                name=candidate.name,
                district=candidate.governorate,
                governorate=candidate.governorate,
                country=candidate.country,
                party=candidate.party,
                symbol_icon_url=candidate.symbol_icon_url,
                symbol_name=candidate.symbol_name,
                photo_url=candidate.photo_url,
                birth_date=candidate.birth_date.isoformat() if candidate.birth_date else None,
                description=candidate.description
            ))
        
        return VoterVerificationResponse(
            is_eligible=True,
            phone_number=voter.phone_number,
            eligible_candidates=eligible_candidates
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying voter: {str(e)}"
        )


@router.post("/verify-voter/public", response_model=VoterVerificationResponse)
async def verify_voter_eligibility_public(
    request: VoterVerificationRequest,
    db: db_dependency
):
    """
    Public dummy service endpoint that simulates an external organization's voter verification API.
    This endpoint is accessible without authentication for testing purposes.
    """
    try:
        # Hash the national ID for lookup
        hashed_id = _hash_identifier(request.voter_national_id)
        
        # Look up voter in the specific election
        voter_result = await db.execute(
            select(DummyVoter).where(
                and_(
                    DummyVoter.voter_hashed_national_id == hashed_id,
                    DummyVoter.election_id == request.election_id
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
            # If specific candidates are specified, use those
            candidate_ids = json.loads(voter.eligible_candidates)
            candidates_result = await db.execute(
                select(DummyCandidate).where(
                    and_(
                        DummyCandidate.hashed_national_id.in_(candidate_ids),
                        DummyCandidate.election_id == request.election_id
                    )
                )
            )
            candidates = candidates_result.scalars().all()
        else:
            # If no specific candidates specified, default to all candidates in the election
            candidates_result = await db.execute(
                select(DummyCandidate).where(
                    DummyCandidate.election_id == request.election_id
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
        
        return VoterVerificationResponse(
            is_eligible=True,
            phone_number=voter.phone_number,
            eligible_candidates=eligible_candidates
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying voter: {str(e)}"
        )


@router.post("/candidates", response_model=DummyCandidateOut, status_code=status.HTTP_201_CREATED)
async def create_dummy_candidate(
    candidate_data: DummyCandidateCreate,
    db: db_dependency,
    _: admin_dependency
):
    """Create a dummy candidate for testing"""
    try:
        # Parse birth date if provided
        birth_date = None
        if candidate_data.birth_date:
            birth_date = datetime.fromisoformat(candidate_data.birth_date.replace("Z", "+00:00"))
        
        # Hash the national ID before storing
        hashed_national_id = _hash_identifier(candidate_data.hashed_national_id)
        
        # Check if candidate already exists
        existing_result = await db.execute(
            select(DummyCandidate).where(DummyCandidate.hashed_national_id == hashed_national_id)
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate with this ID already exists"
            )
        
        # Create new candidate
        new_candidate = DummyCandidate(
            hashed_national_id=hashed_national_id,
            name=candidate_data.name,
            district=candidate_data.district,
            governorate=candidate_data.governorate,
            country=candidate_data.country,
            party=candidate_data.party,
            symbol_icon_url=candidate_data.symbol_icon_url,
            symbol_name=candidate_data.symbol_name,
            photo_url=candidate_data.photo_url,
            birth_date=birth_date,
            description=candidate_data.description,
            election_id=candidate_data.election_id
        )
        
        db.add(new_candidate)
        await db.commit()
        await db.refresh(new_candidate)
        
        return DummyCandidateOut(
            hashed_national_id=new_candidate.hashed_national_id,
            name=new_candidate.name,
            district=new_candidate.district,
            governorate=new_candidate.governorate,
            country=new_candidate.country,
            party=new_candidate.party,
            symbol_icon_url=new_candidate.symbol_icon_url,
            symbol_name=new_candidate.symbol_name,
            photo_url=new_candidate.photo_url,
            birth_date=new_candidate.birth_date.isoformat() if new_candidate.birth_date else None,
            description=new_candidate.description,
            created_at=new_candidate.created_at.isoformat(),
            election_id=new_candidate.election_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating candidate: {str(e)}"
        )


@router.post("/voters", response_model=DummyVoterOut, status_code=status.HTTP_201_CREATED)
async def create_dummy_voter(
    voter_data: DummyVoterCreate,
    db: db_dependency,
    _: admin_dependency
):
    """Create a dummy voter for testing"""
    try:
        # Hash the national ID before storing
        hashed_id = _hash_identifier(voter_data.voter_hashed_national_id)
        
        # Check if voter already exists
        existing_result = await db.execute(
            select(DummyVoter).where(DummyVoter.voter_hashed_national_id == hashed_id)
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voter with this ID already exists"
            )
        
        # Format phone number with country code
        formatted_phone = _format_phone_number(voter_data.phone_number)
        
        # Create new voter
        new_voter = DummyVoter(
            voter_hashed_national_id=hashed_id,
            phone_number=formatted_phone,
            governerate=voter_data.governerate,
            district=voter_data.district,
            eligible_candidates=json.dumps(voter_data.eligible_candidates) if voter_data.eligible_candidates else None,
            election_id=voter_data.election_id
        )
        
        db.add(new_voter)
        await db.commit()
        await db.refresh(new_voter)
        
        return DummyVoterOut(
            voter_hashed_national_id=new_voter.voter_hashed_national_id,
            phone_number=new_voter.phone_number,
            governerate=new_voter.governerate,
            district=new_voter.district,
            eligible_candidates=json.loads(new_voter.eligible_candidates) if new_voter.eligible_candidates else None,
            created_at=new_voter.created_at.isoformat(),
            election_id=new_voter.election_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating voter: {str(e)}"
        )


@router.get("/candidates", response_model=List[DummyCandidateOut])
async def list_dummy_candidates(
    db: db_dependency,
    _: admin_dependency
):
    """List all dummy candidates"""
    result = await db.execute(
        select(DummyCandidate)
        .order_by(DummyCandidate.created_at.desc())
    )
    candidates = result.scalars().all()
    
    return [
        DummyCandidateOut(
            hashed_national_id=c.hashed_national_id,
            name=c.name,
            district=c.district,
            governorate=c.governorate,
            country=c.country,
            party=c.party,
            symbol_icon_url=c.symbol_icon_url,
            symbol_name=c.symbol_name,
            photo_url=c.photo_url,
            birth_date=c.birth_date.isoformat() if c.birth_date else None,
            description=c.description,
            created_at=c.created_at.isoformat(),
            election_id=c.election_id
        )
        for c in candidates
    ]


@router.get("/candidates/{candidate_id}", response_model=DummyCandidateOut)
async def get_dummy_candidate(
    candidate_id: str,
    db: db_dependency,
    _: admin_dependency
):
    """Get a specific dummy candidate by ID"""
    result = await db.execute(
        select(DummyCandidate).where(DummyCandidate.hashed_national_id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    return DummyCandidateOut(
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
        description=candidate.description,
        created_at=candidate.created_at.isoformat(),
        election_id=candidate.election_id
    )


@router.get("/voters", response_model=List[DummyVoterOut])
async def list_dummy_voters(
    db: db_dependency,
    _: admin_dependency
):
    """List all dummy voters"""
    result = await db.execute(
        select(DummyVoter)
        .order_by(DummyVoter.created_at.desc())
    )
    voters = result.scalars().all()
    
    return [
        DummyVoterOut(
            voter_hashed_national_id=v.voter_hashed_national_id,
            phone_number=v.phone_number,
            governerate=v.governerate,
            district=v.district,
            eligible_candidates=json.loads(v.eligible_candidates) if v.eligible_candidates else None,
            created_at=v.created_at.isoformat(),
            election_id=v.election_id
        )
        for v in voters
    ]


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dummy_candidate(
    candidate_id: str,
    db: db_dependency,
    _: admin_dependency
):
    """Delete a dummy candidate"""
    result = await db.execute(
        select(DummyCandidate).where(DummyCandidate.hashed_national_id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    await db.delete(candidate)
    await db.commit()


@router.delete("/voters/{voter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dummy_voter(
    voter_id: str,
    db: db_dependency,
    _: admin_dependency
):
    """Delete a dummy voter"""
    result = await db.execute(
        select(DummyVoter).where(DummyVoter.voter_hashed_national_id == voter_id)
    )
    voter = result.scalar_one_or_none()
    
    if not voter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voter not found"
        )
    
    await db.delete(voter)
    await db.commit()
