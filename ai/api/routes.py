from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, FastAPI, File, HTTPException, UploadFile

from ai.extraction.pipeline import process_uploaded_image

router = APIRouter()


@router.post("/ocr/extract")
async def extract_ocr(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Extract raw OCR text and common packaged-commodity fields from a product image."""
    try:
        response = process_uploaded_image(file)
        return response.model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}") from exc


app = FastAPI(title="Legal Metrology OCR API", version="0.1.0")
app.include_router(router)
