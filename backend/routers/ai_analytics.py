"""
AI Analytics Router
Provides endpoints for AI-powered election analytics and insights
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any

from core.dependencies import get_db, get_current_user
from models.user import User, UserRole
from models.election import Election
from models.candidate import Candidate
from models.voter import Voter
from models.candidate_participation import CandidateParticipation
from services.ai_analytics import rag_service

router = APIRouter(prefix="/ai-analytics", tags=["AI Analytics"])

@router.get("/election/{election_id}")
async def get_election_analytics(
    election_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI-powered analytics for a specific election"""
    try:
        # Check if user has access to elections
        if current_user.role not in [UserRole.organization, UserRole.organization_admin]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # For organization users, their user ID is the organization ID
        # For organization admins, we need to get their managed organization ID
        if current_user.role == UserRole.organization:
            org_id = current_user.id
        else:
            # For organization_admin, get the organization they manage
            from models.organization_admin import OrganizationAdmin
            admin_result = await db.execute(
                select(OrganizationAdmin).where(OrganizationAdmin.user_id == current_user.id)
            )
            admin = admin_result.scalar_one_or_none()
            
            if not admin:
                raise HTTPException(status_code=400, detail="Organization admin not found")
            
            org_id = admin.organization_user_id
        
        # Get election data
        election_result = await db.execute(
            select(Election).where(Election.id == election_id)
        )
        election = election_result.scalar_one_or_none()
        
        if not election:
            raise HTTPException(status_code=404, detail="Election not found")
        
        # Check if user has access to this election
        if election.organization_id != org_id:
            raise HTTPException(status_code=403, detail="Access denied to this election")
        
        # Get candidates
        candidates_result = await db.execute(
            select(Candidate).where(Candidate.election_id == election_id)
        )
        candidates = candidates_result.scalars().all()
        
        # Get total voters
        voters_result = await db.execute(
            select(func.count(Voter.voter_hashed_national_id))
            .where(Voter.election_id == election_id)
        )
        total_voters = voters_result.scalar() or 0
        
        # Prepare election data for AI analysis
        election_data = {
            "id": election.id,
            "title": election.title,
            "type": election.type,
            "status": election.status,
            "total_voters": total_voters,
            "total_votes": election.total_vote_count,
            "candidates": [
                {
                    "id": c.hashed_national_id,
                    "name": c.name,
                    "party": c.party,
                    "district": c.district,
                    "governorate": c.governorate
                }
                for c in candidates
            ]
        }
        
        # Get AI analytics
        analytics = await rag_service.get_election_analytics(election_data)
        
        return {
            "success": True,
            "data": {
                "election_id": analytics.election_id,
                "total_voters": analytics.total_voters,
                "total_votes": analytics.total_votes,
                "turnout_percentage": analytics.turnout_percentage,
                "top_candidates": analytics.top_candidates,
                "ai_insights": analytics.insights,
                "ai_recommendations": analytics.recommendations
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analytics: {str(e)}")

@router.get("/organization")
async def get_organization_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get analytics across all elections for the organization"""
    try:
        # Get organization ID from user
        if current_user.role not in [UserRole.organization, UserRole.organization_admin]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # For organization users, their user ID is the organization ID
        # For organization admins, we need to get their managed organization ID
        if current_user.role == UserRole.organization:
            org_id = current_user.id
        else:
            # For organization_admin, get the organization they manage
            from models.organization_admin import OrganizationAdmin
            admin_result = await db.execute(
                select(OrganizationAdmin).where(OrganizationAdmin.user_id == current_user.id)
            )
            admin = admin_result.scalar_one_or_none()
            
            if not admin:
                raise HTTPException(status_code=400, detail="Organization admin not found")
            
            org_id = admin.organization_user_id
        
        # Get all elections for the organization
        elections_result = await db.execute(
            select(Election).where(Election.organization_id == org_id)
        )
        elections = elections_result.scalars().all()
        
        if not elections:
            return {
                "success": True,
                "data": {
                    "total_elections": 0,
                    "total_votes": 0,
                    "average_turnout": 0,
                    "ai_insights": ["No elections found for analysis"],
                    "ai_recommendations": ["Create your first election to get started"]
                }
            }
        
        # Calculate basic metrics
        total_elections = len(elections)
        total_votes = sum(e.total_vote_count for e in elections)
        total_potential_voters = sum(e.potential_number_of_voters for e in elections)
        average_turnout = (total_votes / total_potential_voters * 100) if total_potential_voters > 0 else 0
        
        # Get AI insights for organization
        org_context = f"""
        Organization has {total_elections} elections
        Total votes across all elections: {total_votes}
        Average turnout: {average_turnout:.1f}%
        """
        
        insights = await rag_service._get_ai_insights(org_context)
        recommendations = await rag_service._get_ai_recommendations(org_context)
        
        return {
            "success": True,
            "data": {
                "total_elections": total_elections,
                "total_votes": total_votes,
                "average_turnout": round(average_turnout, 2),
                "ai_insights": insights,
                "ai_recommendations": recommendations
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting organization analytics: {str(e)}")


