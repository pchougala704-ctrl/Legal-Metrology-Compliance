from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class OCRTextRegion(BaseModel):
    """A single OCR-detected region in an image."""

    text: str = Field(..., description="Detected text in this region")
    confidence: float = Field(..., ge=0.0, le=1.0, description="OCR confidence for this region")
    bbox: List[int] = Field(..., min_length=4, max_length=4, description="[x1, y1, x2, y2]")

    @field_validator("bbox")
    @classmethod
    def validate_bbox(cls, value: List[int]) -> List[int]:
        if len(value) != 4:
            raise ValueError("bbox must contain exactly four integers: [x1, y1, x2, y2]")
        return [int(v) for v in value]


class OCRResult(BaseModel):
    """The structured OCR response returned by the selected OCR engine."""

    raw_text: str = Field(..., description="Merged OCR text from the entire image")
    text_regions: List[OCRTextRegion] = Field(default_factory=list)
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractedField(BaseModel):
    """A single field extracted from product label text."""

    value: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    source_text: Optional[str] = None
    bbox: Optional[List[int]] = None


class OCRExtractionResponse(BaseModel):
    """API response model for the OCR and field extraction pipeline."""

    success: bool = True
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    raw_text: str = ""
    text_regions: List[Dict[str, Any]] = Field(default_factory=list)
    fields: Dict[str, ExtractedField] = Field(default_factory=dict)
