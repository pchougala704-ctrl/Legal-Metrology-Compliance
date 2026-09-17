from __future__ import annotations

from typing import Any, Dict, Optional

from PIL import Image

from ai.extraction.field_extractor import extract_fields
from ai.extraction.ocr_engine import create_ocr_engine
from ai.extraction.preprocessing import image_from_upload, preprocess_image, validate_image_upload
from ai.extraction.schemas import OCRExtractionResponse


def process_image(image: Image.Image, ocr_engine: Optional[Any] = None) -> OCRExtractionResponse:
    """Run the full product label extraction pipeline.

    The pipeline is intentionally separated into stages so the API layer can stay simple and a backend team
    can swap the OCR engine without changing the outer contract.
    """
    processed = preprocess_image(image)
    engine = ocr_engine or create_ocr_engine()
    result = engine.extract(processed)
    fields = extract_fields(result.raw_text)

    response = OCRExtractionResponse(
        success=True,
        overall_confidence=result.overall_confidence,
        raw_text=result.raw_text,
        text_regions=[region.model_dump() for region in result.text_regions],
        fields={
            key: {**value}
            for key, value in fields.items()
        },
    )
    return response


def process_uploaded_image(upload_file: Any) -> OCRExtractionResponse:
    """Validate a file upload and process the image in a single helper for the API layer."""
    validate_image_upload(upload_file)
    image = image_from_upload(upload_file)
    return process_image(image)
