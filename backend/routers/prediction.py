from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

from database import get_db
from services.prediction import PredictionService 
from schemas.prediction import PredictionOutSchema

router = APIRouter(prefix="/prediction", tags=["prediction"])

@router.get("/prediction", response_model=PredictionOutSchema)
async def get_prediction_statistics(
    election_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint to retrieve election statistics including:
    1. Total registered voters
    2. Actual voters count
    3. Votes per candidate
    4. Registered voters per candidate
    5. Votes count per hour
    6. Participation percentage
    7. Predicted actual voters count by AI model
    """
    service = PredictionService(db)
    try:
        prediction_data = await service.get_prediction_statistics(election_id)
        return prediction_data
    except Exception as e:
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get prediction statistics: {e}"
        )
