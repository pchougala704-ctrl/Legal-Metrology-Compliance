from __future__ import annotations

from typing import List, Optional, Sequence

import cv2
import numpy as np
import pytesseract

from ai.extraction.schemas import OCRResult, OCRTextRegion


class OCRProvider:
    """Abstract OCR provider interface. Replace with EasyOCR or another engine later."""

    def extract(self, image: np.ndarray) -> OCRResult:
        raise NotImplementedError


class TesseractOCR(OCRProvider):
    """Uses Tesseract through pytesseract for OCR and region-level metadata."""

    def __init__(self, config: str = "--psm 6") -> None:
        self.config = config

    def extract(self, image: np.ndarray) -> OCRResult:
        if image is None or image.size == 0:
            raise ValueError("No image data was provided to the OCR engine.")

        try:
            data = pytesseract.image_to_data(image, config=self.config, output_type=pytesseract.Output.DICT)
        except TesseractNotInstalledError as exc:
            raise RuntimeError(
                "Tesseract is not installed or not available on PATH. "
                "Install Tesseract OCR and ensure the 'tesseract' binary is available."
            ) from exc

        text_regions: List[OCRTextRegion] = []
        texts: List[str] = []
        confidences: List[float] = []

        for idx, text in enumerate(data.get("text", [])):
            cleaned = (text or "").strip()
            if not cleaned:
                continue

            conf = float(data.get("conf", [0.0])[idx]) if idx < len(data.get("conf", [])) else 0.0
            if conf < 0:
                conf = 0.0

            left = int(data.get("left", [0])[idx])
            top = int(data.get("top", [0])[idx])
            width = int(data.get("width", [0])[idx])
            height = int(data.get("height", [0])[idx])
            bbox = [left, top, left + width, top + height]

            text_regions.append(
                OCRTextRegion(
                    text=cleaned,
                    confidence=round(conf / 100.0, 4) if conf > 0 else 0.0,
                    bbox=bbox,
                )
            )
            texts.append(cleaned)
            confidences.append(round(conf / 100.0, 4) if conf > 0 else 0.0)

        raw_text = "\n".join(texts)
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return OCRResult(raw_text=raw_text, text_regions=text_regions, overall_confidence=overall_confidence)


class TesseractNotInstalledError(RuntimeError):
    """Raised when pytesseract cannot access the Tesseract binary."""


class EasyOCROption(OCRProvider):
    """Fallback placeholder for a future EasyOCR implementation."""

    def extract(self, image: np.ndarray) -> OCRResult:
        raise NotImplementedError("EasyOCR fallback is not implemented yet. Install Tesseract to use OCR support.")


def create_ocr_engine() -> OCRProvider:
    """Return the configured OCR engine.

    The module is intentionally built around a provider interface so different OCR backends can be swapped
    in without changing the pipeline or API contract.
    """
    return TesseractOCR()
