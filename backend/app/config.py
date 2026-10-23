import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory or project root
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / '.env'

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Settings:
    # AWS service regions
    AWS_S3_REGION: str = os.getenv('AWS_S3_REGION', 'ap-south-1')
    AWS_DATA_REGION: str = os.getenv('AWS_DATA_REGION', 'ap-south-2')
    AWS_BEDROCK_REGION: str = os.getenv('AWS_BEDROCK_REGION', 'us-east-1')
    AWS_REGION: str = os.getenv('AWS_REGION', os.getenv('AWS_S3_REGION', 'ap-south-1'))

    # AWS resources
    AWS_GLUE_DATABASE: str = os.getenv(
        'AWS_GLUE_DATABASE',
        'medical_operations_db'
    )

    AWS_S3_BUCKET: str = os.getenv(
        'AWS_S3_BUCKET',
        'medical-operations-bharath-2026'
    )

    AWS_ATHENA_WORKGROUP: str = os.getenv(
        'AWS_ATHENA_WORKGROUP',
        'primary'
    )

    AWS_ATHENA_OUTPUT: str = os.getenv(
        'AWS_ATHENA_OUTPUT',
        's3://medical-operations-athena-results-bharath-2026/'
    )

    _raw_bedrock_model = os.getenv('AWS_BEDROCK_MODEL', '').strip()
    _legacy_claude_models = {
        'anthropic.claude-3-5-sonnet-20240620-v1:0',
        'anthropic.claude-3-5-sonnet-20240620-v1',
        'global.anthropic.claude-sonnet-5-5',
        'us.anthropic.claude-sonnet-5-5',
    }
    AWS_BEDROCK_MODEL: str = (
        'amazon.nova-lite-v1:0'
        if not _raw_bedrock_model or _raw_bedrock_model in _legacy_claude_models
        else _raw_bedrock_model
    )

    # Optional explicit credentials.
    # In deployment, prefer the platform's IAM/credential mechanism.
    AWS_ACCESS_KEY_ID: str = os.getenv('AWS_ACCESS_KEY_ID', '')
    AWS_SECRET_ACCESS_KEY: str = os.getenv('AWS_SECRET_ACCESS_KEY', '')
    AWS_SESSION_TOKEN: str = os.getenv('AWS_SESSION_TOKEN', '')

    # AI Provider & Model Configuration (Google Gemini & Amazon Bedrock)
    AI_PROVIDER: str = os.getenv('AI_PROVIDER', 'gemini').lower().strip()
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '').strip()
    GEMINI_MODEL: str = os.getenv('GEMINI_MODEL', 'gemini-3.1-flash-lite').strip()


settings = Settings()