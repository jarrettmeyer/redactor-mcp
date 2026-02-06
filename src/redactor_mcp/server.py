from pathlib import Path

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from mypy_boto3_comprehend.type_defs import PiiEntityTypeDef

from redactor_mcp.comprehend import detect_pii_entities, redact_text

_project_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(_project_root / ".env")

mcp = FastMCP("redactor-mcp")

MAX_TEXT_BYTES = 100_000


def _check_size(text: str) -> None:
    size = len(text.encode("utf-8"))
    if size > MAX_TEXT_BYTES:
        raise ValueError(
            f"Text is {size:,} bytes, which exceeds the 100KB limit for AWS Comprehend's synchronous API."
        )


def _filter_entities(
    entities: list[PiiEntityTypeDef],
    pii_types: list[str] | None,
    confidence_threshold: float,
) -> list[PiiEntityTypeDef]:
    filtered = entities
    if pii_types:
        type_set = {t.upper() for t in pii_types}
        filtered = [e for e in filtered if e.get("Type") in type_set]
    filtered = [e for e in filtered if e.get("Score", 0.0) >= confidence_threshold]
    return filtered


@mcp.tool()
def detect_pii(
    text: str,
    pii_types: list[str] | None = None,
    confidence_threshold: float = 0.0,
) -> list[dict]:
    """Detect PII entities in the provided text.

    Args:
        text: The text content to analyze.
        pii_types: Specific PII entity types to detect (e.g. ["NAME", "EMAIL"]).
                   If omitted, detect all types.
        confidence_threshold: Minimum confidence score to include an entity.
                              Defaults to 0.0 (include everything).

    Returns:
        List of detected entities with type, text, score, and character offsets.
    """
    _check_size(text)
    entities = detect_pii_entities(text)
    filtered = _filter_entities(entities, pii_types, confidence_threshold)
    return [
        {
            "type": e.get("Type", ""),
            "text": text[e.get("BeginOffset", 0) : e.get("EndOffset", 0)],
            "score": e.get("Score", 0.0),
            "begin_offset": e.get("BeginOffset", 0),
            "end_offset": e.get("EndOffset", 0),
        }
        for e in filtered
    ]


@mcp.tool()
def redact_pii(
    text: str,
    pii_types: list[str] | None = None,
    confidence_threshold: float = 0.0,
) -> str:
    """Redact PII entities in the provided text by replacing them with tags like [NAME], [SSN], [ADDRESS], etc.

    Args:
        text: The text content to redact.
        pii_types: Specific PII entity types to redact (e.g. ["NAME", "EMAIL"]).
                   If omitted, redact all types.
        confidence_threshold: Minimum confidence score to redact an entity.
                              Defaults to 0.0 (redact everything).

    Returns:
        The redacted text with PII replaced by entity type tags.
    """
    _check_size(text)
    entities = detect_pii_entities(text)
    filtered = _filter_entities(entities, pii_types, confidence_threshold)
    return redact_text(text, filtered)


_prompt_path = Path(__file__).resolve().parent / "redact_pii_guide.md"


@mcp.prompt()
def redact_pii_guide() -> str:
    """A guided prompt that walks the user through PII redaction."""
    return _prompt_path.read_text()


def main():
    mcp.run()


if __name__ == "__main__":
    main()
