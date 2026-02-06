import os

import boto3
from mypy_boto3_comprehend import ComprehendClient
from mypy_boto3_comprehend.literals import LanguageCodeType
from mypy_boto3_comprehend.type_defs import PiiEntityTypeDef

_client: ComprehendClient | None = None


def _get_client() -> ComprehendClient:
    global _client
    if _client is None:
        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"
        _client = boto3.client("comprehend", region_name=region)
    return _client


def detect_pii_entities(
    text: str, language_code: LanguageCodeType = "en"
) -> list[PiiEntityTypeDef]:
    """Call AWS Comprehend DetectPiiEntities and return the list of entities."""
    client = _get_client()
    response = client.detect_pii_entities(Text=text, LanguageCode=language_code)
    return response["Entities"]


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
