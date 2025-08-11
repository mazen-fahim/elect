from datetime import datetime, timezone
import json
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.future import select

from core.dependencies import db_dependency, organization_dependency
from models.approval_request import (
    ApprovalRequest,
    ApprovalStatus,
    ApprovalTargetType,
    ApprovalAction,
)
from models.user import UserRole
from models.election import Election
from models.candidate import Candidate
from models.candidate_participation import CandidateParticipation


router = APIRouter(prefix="/approvals", tags=["Approvals"])


class ApprovalRead(BaseModel):
    id: int
    target_type: str
    action: str
    target_id: str
    status: str
    created_at: datetime


class ApprovalDecision(BaseModel):
    approve: bool


@router.get("/", response_model=List[ApprovalRead])
async def list_pending_approvals(db: db_dependency, current_user: organization_dependency):
    # Only boss organization can see approvals
    if current_user.role != UserRole.organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization can view approvals")

    res = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.organization_user_id == current_user.id,
            ApprovalRequest.status == ApprovalStatus.pending,
        )
    )
    approvals = res.scalars().all()
    return [
        ApprovalRead(
            id=a.id,
            target_type=a.target_type.value,
            action=a.action.value,
            target_id=a.target_id,
            status=a.status.value,
            created_at=a.created_at,
        )
        for a in approvals
    ]


@router.post("/{approval_id}/decision", status_code=status.HTTP_204_NO_CONTENT)
async def decide_approval(
    approval_id: int, decision: ApprovalDecision, db: db_dependency, current_user: organization_dependency
):
    if current_user.role != UserRole.organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organization can decide approvals")

    res = await db.execute(
        select(ApprovalRequest).where(
            ApprovalRequest.id == approval_id,
            ApprovalRequest.organization_user_id == current_user.id,
        )
    )
    approval = res.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")

    if approval.status != ApprovalStatus.pending:
        raise HTTPException(status_code=400, detail="Approval already decided")

    approval.status = ApprovalStatus.approved if decision.approve else ApprovalStatus.rejected
    approval.decided_at = datetime.now(timezone.utc)
    approval.decided_by_user_id = current_user.id

    # Apply staged actions on approval
    if decision.approve and approval.payload:
        payload = json.loads(approval.payload)
        if approval.target_type == ApprovalTargetType.election and approval.action == ApprovalAction.create:
            # Create Election
            # Parse dates
            def _parse_dt(value: str) -> datetime:
                if isinstance(value, str):
                    return datetime.fromisoformat(value.replace("Z", "+00:00"))
                return value

            new_election = Election(
                title=payload["title"],
                types=payload["types"],
                organization_id=approval.organization_user_id,
                starts_at=_parse_dt(payload["starts_at"]),
                ends_at=_parse_dt(payload["ends_at"]),
                num_of_votes_per_voter=payload["num_of_votes_per_voter"],
                potential_number_of_voters=payload["potential_number_of_voters"],
                method=(payload.get("method") or "api"),
                api_endpoint=payload.get("api_endpoint"),
                status="upcoming",
            )
            db.add(new_election)
            await db.flush()

        elif approval.target_type == ApprovalTargetType.candidate and approval.action == ApprovalAction.create:
            # Create Candidate (files not handled here)
            from core.shared import Country

            def _parse_dt(value: str) -> datetime:
                if isinstance(value, str):
                    return datetime.fromisoformat(value.replace("Z", "+00:00"))
                return value

            def _parse_country(value: str) -> Country:
                return Country(value)

            new_candidate = Candidate(
                hashed_national_id=payload["hashed_national_id"],
                name=payload["name"],
                country=_parse_country(payload["country"]),
                birth_date=_parse_dt(payload["birth_date"]),
                party=payload.get("party"),
                symbol_name=payload.get("symbol_name"),
                description=payload.get("description"),
                organization_id=approval.organization_user_id,
            )
            if payload.get("district"):
                new_candidate.district = payload["district"]
            if payload.get("governorate"):
                new_candidate.governorate = payload["governorate"]
            db.add(new_candidate)
            await db.flush()

            # Link to elections
            election_ids = list(dict.fromkeys(payload.get("election_ids", [])))
            for eid in election_ids:
                db.add(
                    CandidateParticipation(
                        candidate_hashed_national_id=new_candidate.hashed_national_id, election_id=eid
                    )
                )

    await db.commit()
    return
