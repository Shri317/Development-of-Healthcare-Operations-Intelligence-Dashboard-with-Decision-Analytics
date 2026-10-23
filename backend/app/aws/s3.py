import logging
from typing import Dict, Any
from app.aws.session import get_s3_client
from app.config import settings

logger = logging.getLogger(__name__)

def check_s3_bucket_status() -> Dict[str, Any]:
    """
    Checks connection to S3 bucket and retrieves sample objects.
    """
    try:
        s3 = get_s3_client()
        response = s3.list_objects_v2(Bucket=settings.AWS_S3_BUCKET, MaxKeys=50)
        contents = response.get('Contents', [])
        
        files = [
            {
                'key': obj.get('Key'),
                'size': obj.get('Size'),
                'lastModified': obj.get('LastModified').isoformat() if obj.get('LastModified') else None
            }
            for obj in contents
        ]
        
        return {
            'status': 'connected',
            'bucket': settings.AWS_S3_BUCKET,
            'region': settings.AWS_S3_REGION,
            'fileCount': response.get('KeyCount', 0),
            'files': files,
            'errorMessage': None
        }
    except Exception as e:
        logger.error(f"S3 Connection Error: {e}")
        return {
            'status': 'error',
            'bucket': settings.AWS_S3_BUCKET,
            'region': settings.AWS_S3_REGION,
            'fileCount': 0,
            'files': [],
            'errorMessage': str(e)
        }
