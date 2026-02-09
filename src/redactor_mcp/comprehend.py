import logging
import os

import boto3
from botocore.exceptions import (
    ClientError,
    CredentialRetrievalError,
    NoCredentialsError,
    PartialCredentialsError,
    TokenRetrievalError,
)
from mypy_boto3_comprehend import ComprehendClient
from mypy_boto3_comprehend.literals import LanguageCodeType
from mypy_boto3_comprehend.type_defs import PiiEntityTypeDef

logger = logging.getLogger(__name__)

_client: ComprehendClient | None = None


def _get_client() -> ComprehendClient:
    global _client
    if _client is None:
        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"
        try:
            _client = boto3.client("comprehend", region_name=region)
        except Exception as error:
            # Check if it's a credential error and provide helpful message
            if _is_credential_error(error) or "sso" in str(error).lower():
                logger.error(f"Failed to create Comprehend client due to credential error: {error}")

                # Get the AWS profile for the error message
                profile = os.environ.get("AWS_PROFILE")
                if profile:
                    profile_msg = f"aws sso login --profile {profile}"
                else:
                    profile_msg = "aws sso login --profile <your-profile>"

                raise RuntimeError(
                    f"AWS credentials are invalid or expired. "
                    f"If using SSO, run: {profile_msg}"
                ) from error
            raise
    return _client


def _reset_client() -> None:
    """Clear the cached client to force recreation on next access."""
    global _client
    _client = None
    logger.info("Comprehend client reset due to credential error")


def _is_credential_error(error: Exception) -> bool:
    """Check if the error is credential-related."""
    # Check botocore credential exception types
    if isinstance(
        error,
        (
            NoCredentialsError,
            PartialCredentialsError,
            CredentialRetrievalError,
            TokenRetrievalError,
        ),
    ):
        return True

    # Check ClientError codes for expired/invalid tokens
    if isinstance(error, ClientError):
        error_code = error.response.get("Error", {}).get("Code", "")
        credential_error_codes = {
            "ExpiredTokenException",
            "ExpiredToken",
            "InvalidToken",
            "InvalidClientTokenId",
            "UnrecognizedClientException",
        }
        if error_code in credential_error_codes:
            return True

    return False


def detect_pii_entities(
    text: str, language_code: LanguageCodeType = "en"
) -> list[PiiEntityTypeDef]:
    """Call AWS Comprehend DetectPiiEntities and return the list of entities.

    Automatically retries once with a fresh client if credential errors are detected.
    """
    client = _get_client()

    try:
        response = client.detect_pii_entities(Text=text, LanguageCode=language_code)
        return response["Entities"]
    except Exception as error:
        # If it's a credential error, reset the client and retry once
        if _is_credential_error(error):
            logger.warning(f"Credential error detected: {error}. Resetting client and retrying...")
            _reset_client()

            # Retry with fresh client
            try:
                client = _get_client()
                response = client.detect_pii_entities(Text=text, LanguageCode=language_code)
                logger.info("Retry succeeded with fresh credentials")
                return response["Entities"]
            except Exception as retry_error:
                logger.error(f"Retry failed: {retry_error}")
                raise

        # Not a credential error or retry failed - propagate exception
        raise


def redact_text(text: str, entities: list[PiiEntityTypeDef]) -> str:
    """Replace each entity span with [TYPE]. Processes in reverse offset order."""
    sorted_entities = sorted(
        entities, key=lambda e: e.get("BeginOffset", 0), reverse=True
    )
    result = text
    for entity in sorted_entities:
        begin = entity.get("BeginOffset", 0)
        end = entity.get("EndOffset", 0)
        tag = f"[{entity.get('Type', 'UNKNOWN')}]"
        result = result[:begin] + tag + result[end:]
    return result
