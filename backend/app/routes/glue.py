from fastapi import APIRouter, HTTPException
from app.aws.glue import fetch_glue_tables, fetch_glue_table_schema

router = APIRouter(prefix="/api/glue", tags=["AWS Glue Data Catalog"])

@router.get("/tables")
def get_tables():
    return fetch_glue_tables()

@router.get("/tables/{table_name}/schema")
def get_table_schema(table_name: str):
    try:
        return fetch_glue_table_schema(table_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
