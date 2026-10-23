from fastapi import APIRouter
from app.aws.s3 import check_s3_bucket_status
from app.aws.glue import fetch_glue_tables
from app.config import settings

router = APIRouter(prefix="/api/health", tags=["Health & AWS Status"])

@router.get("")
def get_health_status():
    s3_status = check_s3_bucket_status()
    glue_status = fetch_glue_tables()
    
    return {
        "status": "online",
        "service": "Medical Operations Intelligence Backend API",
        "region": settings.AWS_DATA_REGION,
        "glueDatabase": settings.AWS_GLUE_DATABASE,
        "s3Bucket": settings.AWS_S3_BUCKET,
        "athenaWorkgroup": settings.AWS_ATHENA_WORKGROUP,
        "awsServices": {
            "s3": s3_status["status"],
            "glue": glue_status["status"],
            "athena": "ready",
            "bedrock": "ready"
        },
        "aiProvider": {
            "active": settings.AI_PROVIDER,
            "providerName": "Google Gemini" if settings.AI_PROVIDER == "gemini" else "Amazon Bedrock",
            "model": settings.GEMINI_MODEL if settings.AI_PROVIDER == "gemini" else settings.AWS_BEDROCK_MODEL,
            "configured": bool(settings.GEMINI_API_KEY) if settings.AI_PROVIDER == "gemini" else bool(settings.AWS_ACCESS_KEY_ID or settings.AWS_BEDROCK_MODEL)
        }
    }
