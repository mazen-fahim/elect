from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy import and_, func, desc
from models.election import Election
from models.candidate_participation import CandidateParticipation
from models.candidate import Candidate
from models.voting_process import VotingProcess
from models.voter import Voter
from typing import List, Dict, Any


class ElectionResultsService:
    """Service for calculating and retrieving election results"""
    
    @staticmethod
    async def get_election_results(election_id: int, db) -> Dict[str, Any]:
        """
        Get comprehensive election results including:
        - Election information
        - Candidate rankings with vote counts and percentages
        - Total votes cast
        - Voter turnout statistics
        - Winner determination
        """
        try:
            # Get election details
            election_result = await db.execute(
                select(Election).where(Election.id == election_id)
            )
            election = election_result.scalar_one_or_none()
            
            if not election:
                raise ValueError("Election not found")
            
            # Check if election has finished
            now = datetime.now(timezone.utc)
            if now <= election.ends_at:
                raise ValueError("Election has not finished yet")
            
            # Get total votes cast
            total_votes_result = await db.execute(
                select(func.count(VotingProcess.voter_hashed_national_id))
                .where(VotingProcess.election_id == election_id)
            )
            total_votes_cast = total_votes_result.scalar() or 0
            
            # Get total eligible voters
            total_eligible_voters_result = await db.execute(
                select(func.count(Voter.voter_hashed_national_id))
                .where(Voter.election_id == election_id)
            )
            total_eligible_voters = total_eligible_voters_result.scalar() or 0
            
            # Calculate voter turnout
            voter_turnout_percentage = 0
            if total_eligible_voters > 0:
                voter_turnout_percentage = (total_votes_cast / total_eligible_voters) * 100
            
            # Get candidates with their vote counts, ordered by votes (descending)
            candidates_result = await db.execute(
                select(
                    Candidate,
                    CandidateParticipation.vote_count,
                    CandidateParticipation.has_won,
                    CandidateParticipation.rank
                )
                .join(CandidateParticipation, CandidateParticipation.candidate_hashed_national_id == Candidate.hashed_national_id)
                .where(CandidateParticipation.election_id == election_id)
                .order_by(desc(CandidateParticipation.vote_count))
            )
            
            candidates_data = candidates_result.all()
            
            # Calculate percentages and rankings
            candidates_with_stats = []
            for i, (candidate, vote_count, has_won, rank) in enumerate(candidates_data):
                vote_percentage = 0
                if total_votes_cast > 0:
                    vote_percentage = (vote_count / total_votes_cast) * 100
                
                # Determine position (1st, 2nd, 3rd, etc.)
                position = i + 1
                
                # Determine if this candidate is a winner
                is_winner = has_won if has_won is not None else (position == 1 and vote_count > 0)
                
                candidates_with_stats.append({
                    "position": position,
                    "hashed_national_id": candidate.hashed_national_id,
                    "name": candidate.name,
                    "party": candidate.party,
                    "symbol_name": candidate.symbol_name,
                    "symbol_icon_url": candidate.symbol_icon_url,
                    "photo_url": candidate.photo_url,
                    "vote_count": vote_count or 0,
                    "vote_percentage": round(vote_percentage, 2),
                    "is_winner": is_winner,
                    "rank": rank
                })
            
            # Determine winners (candidates with the highest vote count)
            if candidates_with_stats:
                max_votes = candidates_with_stats[0]["vote_count"]
                winners = [c for c in candidates_with_stats if c["vote_count"] == max_votes and c["vote_count"] > 0]
            else:
                winners = []
            
            # Calculate additional statistics
            stats = {
                "total_votes_cast": total_votes_cast,
                "total_eligible_voters": total_eligible_voters,
                "voter_turnout_percentage": round(voter_turnout_percentage, 2),
                "number_of_candidates": len(candidates_with_stats),
                "number_of_winners": len(winners),
                "election_duration_hours": round((election.ends_at - election.starts_at).total_seconds() / 3600, 1)
            }
            
            return {
                "election_info": {
                    "id": election.id,
                    "title": election.title,
                    "types": election.types,
                    "starts_at": election.starts_at,
                    "ends_at": election.ends_at,
                    "created_at": election.created_at,
                    "num_of_votes_per_voter": election.num_of_votes_per_voter,
                    "potential_number_of_voters": election.potential_number_of_voters
                },
                "results": {
                    "candidates": candidates_with_stats,
                    "winners": winners,
                    "statistics": stats
                }
            }
            
        except Exception as e:
            print(f"Error getting election results: {str(e)}")
            raise
    
    @staticmethod
    async def update_candidate_rankings(election_id: int, db) -> int:
        """
        Update candidate rankings and winner status based on final vote counts.
        This should be called when an election finishes.
        """
        try:
            # Get candidates ordered by vote count
            candidates_result = await db.execute(
                select(
                    CandidateParticipation.candidate_hashed_national_id,
                    CandidateParticipation.vote_count
                )
                .where(CandidateParticipation.election_id == election_id)
                .order_by(desc(CandidateParticipation.vote_count))
            )
            
            candidates_data = candidates_result.all()
            
            if not candidates_data:
                return 0
            
            # Find the highest vote count
            max_votes = candidates_data[0][1] or 0
            
            updated_count = 0
            
            # Update rankings and winner status
            for i, (candidate_id, vote_count) in enumerate(candidates_data):
                participation_result = await db.execute(
                    select(CandidateParticipation)
                    .where(
                        and_(
                            CandidateParticipation.candidate_hashed_national_id == candidate_id,
                            CandidateParticipation.election_id == election_id
                        )
                    )
                )
                
                participation = participation_result.scalar_one_or_none()
                if participation:
                    # Update rank (1st, 2nd, 3rd, etc.)
                    participation.rank = i + 1
                    
                    # Update winner status (all candidates with max votes are winners)
                    participation.has_won = (vote_count == max_votes and vote_count > 0)
                    
                    updated_count += 1
            
            await db.commit()
            return updated_count
            
        except Exception as e:
            print(f"Error updating candidate rankings: {str(e)}")
            await db.rollback()
            raise
