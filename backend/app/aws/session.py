import os
import boto3
from app.config import settings
from contextvars import ContextVar

_vercel_oidc_token = ContextVar("vercel_oidc_token", default=None)


def set_vercel_oidc_token(token):
    return _vercel_oidc_token.set(token)


def reset_vercel_oidc_token(token_context):
    _vercel_oidc_token.reset(token_context)


def _get_vercel_oidc_credentials():
    """
    Exchange Vercel's short-lived OIDC token for temporary AWS credentials.
    Used automatically when running on Vercel.
    """
    oidc_token = (
    os.getenv("VERCEL_OIDC_TOKEN")
    or _vercel_oidc_token.get()
)
    role_arn = os.getenv("AWS_ROLE_ARN")

    if not oidc_token or not role_arn:
        return None

    sts = boto3.client(
        "sts",
        region_name=settings.AWS_DATA_REGION
    )

    response = sts.assume_role_with_web_identity(
        RoleArn=role_arn.strip(),
        RoleSessionName="vercel-medical-operations",
        WebIdentityToken=oidc_token.strip(),
        DurationSeconds=3600,
    )

    credentials = response["Credentials"]

    return {
        "aws_access_key_id": credentials["AccessKeyId"],
        "aws_secret_access_key": credentials["SecretAccessKey"],
        "aws_session_token": credentials["SessionToken"],
    }


def get_boto3_session(region_name: str):
    """
    Creates a boto3 Session for the specified AWS region.

    Authentication order:
    1. Explicit AWS credentials, if configured.
    2. Vercel OIDC → temporary AWS credentials.
    3. Normal boto3 credential chain (local AWS CLI, etc.).
    """

    session_kwargs = {
        "region_name": region_name
    }

    # Explicit credentials, if intentionally configured.
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        session_kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID.strip()
        session_kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY.strip()

        if settings.AWS_SESSION_TOKEN:
            session_kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN.strip()

    else:
        # Production on Vercel: exchange Vercel OIDC token for temporary AWS credentials.
        oidc_credentials = _get_vercel_oidc_credentials()

        if oidc_credentials:
            session_kwargs.update(oidc_credentials)

    return boto3.Session(**session_kwargs)


def get_sts_client():
    return get_boto3_session(settings.AWS_S3_REGION).client("sts")


def get_glue_client():
    return get_boto3_session(settings.AWS_DATA_REGION).client("glue")


def get_athena_client():
    return get_boto3_session(settings.AWS_DATA_REGION).client("athena")


def get_s3_client():
    return get_boto3_session(settings.AWS_S3_REGION).client("s3")


def get_bedrock_client():
    return get_boto3_session(settings.AWS_BEDROCK_REGION).client("bedrock-runtime")