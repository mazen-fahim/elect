from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.future import select
from core.dependencies import db_dependency
from services.election_results import ElectionResultsService
from models.election import Election
from datetime import datetime, timezone

router = APIRouter(prefix="/results", tags=["election_results"])


@router.get("/election/{election_id}")
async def get_election_results(election_id: int, db: db_dependency):
    """
    Get comprehensive election results for a finished election.
    Only accessible after the election has ended.
    """
    try:
        results = await ElectionResultsService.get_election_results(election_id, db)
        return results
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve election results: {str(e)}"
        )


@router.get("/election/{election_id}/summary")
async def get_election_summary(election_id: int, db: db_dependency):
    """
    Get a brief summary of election results including:
    - Winner(s)
    - Total votes
    - Voter turnout
    """
    try:
        # Check if election exists and has finished
        election_result = await db.execute(
            select(Election).where(Election.id == election_id)
        )
        election = election_result.scalar_one_or_none()
        
        if not election:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Election not found"
            )
        
        now = datetime.now(timezone.utc)
        if now <= election.ends_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Election has not finished yet"
            )
        
        # Get basic results for summary
        results = await ElectionResultsService.get_election_results(election_id, db)
        
        # Return only summary information
        summary = {
            "election_id": election_id,
            "election_title": results["election_info"]["title"],
            "winners": [
                {
                    "name": winner["name"],
                    "party": winner["party"],
                    "vote_count": winner["vote_count"],
                    "vote_percentage": winner["vote_percentage"]
                }
                for winner in results["results"]["winners"]
            ],
            "total_votes_cast": results["results"]["statistics"]["total_votes_cast"],
            "voter_turnout_percentage": results["results"]["statistics"]["voter_turnout_percentage"],
            "number_of_candidates": results["results"]["statistics"]["number_of_candidates"]
        }
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve election summary: {str(e)}"
        )


@router.post("/election/{election_id}/finalize")
async def finalize_election_results(election_id: int, db: db_dependency):
    """
    Finalize election results by updating candidate rankings and winner status.
    This endpoint can be called manually or automatically when an election ends.
    """
    try:
        # Check if election exists and has finished
        election_result = await db.execute(
            select(Election).where(Election.id == election_id)
        )
        election = election_result.scalar_one_or_none()
        
        if not election:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Election not found"
            )
        
        now = datetime.now(timezone.utc)
        if now <= election.ends_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Election has not finished yet"
            )
        
        # Update candidate rankings and winner status
        updated_count = await ElectionResultsService.update_candidate_rankings(election_id, db)
        
        return {
            "message": "Election results finalized successfully",
            "election_id": election_id,
            "candidates_updated": updated_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to finalize election results: {str(e)}"
        )
