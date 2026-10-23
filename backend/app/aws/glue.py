import logging
from typing import List, Dict, Any, Optional
from app.aws.session import get_glue_client
from app.config import settings

logger = logging.getLogger(__name__)

def fetch_glue_tables() -> Dict[str, Any]:
    """
    Retrieves database metadata and all table definitions from AWS Glue Data Catalog.
    """
    try:
        client = get_glue_client()
        tables = []
        next_token = None
        
        while True:
            kwargs = {'DatabaseName': settings.AWS_GLUE_DATABASE}
            if next_token:
                kwargs['NextToken'] = next_token
                
            response = client.get_tables(**kwargs)
            table_list = response.get('TableList', [])
            
            for t in table_list:
                name = t.get('Name', 'unnamed')
                num_rows = (
                    t.get('Parameters', {}).get('numRows') or 
                    t.get('Parameters', {}).get('spark.sql.statistics.numRows') or 
                    'Unindexed'
                )
                location = t.get('StorageDescriptor', {}).get('Location', f"s3://{settings.AWS_S3_BUCKET}/{name}")
                cols = [
                    {'name': c.get('Name', 'unnamed'), 'type': c.get('Type', 'string')}
                    for c in t.get('StorageDescriptor', {}).get('Columns', [])
                ]
                
                tables.append({
                    'name': name,
                    'records': str(num_rows),
                    'size': 'S3 Location',
                    's3Location': location,
                    'cols': cols,
                    'createTime': t.get('CreateTime').isoformat() if t.get('CreateTime') else None
                })
                
            next_token = response.get('NextToken')
            if not next_token:
                break

        return {
            'status': 'connected',
            'database': settings.AWS_GLUE_DATABASE,
            'tableCount': len(tables),
            'tables': tables,
            'errorMessage': None
        }

    except Exception as e:
        logger.error(f"Error fetching AWS Glue tables: {e}")
        return {
            'status': 'error',
            'database': settings.AWS_GLUE_DATABASE,
            'tableCount': 0,
            'tables': [],
            'errorMessage': str(e)
        }

def fetch_glue_table_schema(table_name: str) -> Dict[str, Any]:
    """
    Retrieves column schema details for a specific table in AWS Glue Data Catalog.
    """
    try:
        client = get_glue_client()
        response = client.get_table(DatabaseName=settings.AWS_GLUE_DATABASE, Name=table_name)
        t = response.get('Table', {})
        cols = [
            {'name': c.get('Name'), 'type': c.get('Type'), 'comment': c.get('Comment', '')}
            for c in t.get('StorageDescriptor', {}).get('Columns', [])
        ]
        return {
            'tableName': table_name,
            'database': settings.AWS_GLUE_DATABASE,
            'columns': cols,
            's3Location': t.get('StorageDescriptor', {}).get('Location'),
            'parameters': t.get('Parameters', {})
        }
    except Exception as e:
        logger.error(f"Error fetching table schema for {table_name}: {e}")
        raise RuntimeError(f"Failed to fetch Glue table schema: {e}")
