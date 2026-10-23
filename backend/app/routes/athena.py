from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.aws.athena import execute_athena_query

router = APIRouter(prefix="/api/athena", tags=["Amazon Athena Console"])

class QueryRequest(BaseModel):
    sqlQuery: str
    maxResults: Optional[int] = 100

@router.post("/execute")
def execute_query(req: QueryRequest):
    if not req.sqlQuery or len(req.sqlQuery.strip()) == 0:
        raise HTTPException(status_code=400, detail="sqlQuery cannot be empty.")
        
    return execute_athena_query(req.sqlQuery.strip(), req.maxResults or 100)
