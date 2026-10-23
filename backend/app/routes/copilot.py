from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.copilot_service import process_copilot_query

router = APIRouter(prefix="/api/copilot", tags=["AI Copilot & Bedrock"])

class CopilotRequest(BaseModel):
    question: Optional[str] = None
    query: Optional[str] = None
    facility_id: Optional[str] = 'all'
    facilityId: Optional[str] = 'all'

@router.post("/query")
def copilot_query(req: CopilotRequest):
    user_prompt = (req.question or req.query or '').strip()
    if not user_prompt:
        raise HTTPException(status_code=400, detail="question or query parameter cannot be empty.")
        
    fac_id = req.facility_id if req.facility_id != 'all' else (req.facilityId or 'all')
    return process_copilot_query(user_prompt, fac_id)
