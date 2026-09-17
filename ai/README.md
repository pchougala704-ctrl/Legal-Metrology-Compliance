# CV/OCR and Field Extraction Module

This module is part of the Legal Metrology compliance project and focuses on the computer vision and OCR workflow for packaged commodities.

## What this module does

- Validates uploaded package images
- Preprocesses the image for OCR readability
- Extracts text with OCR
- Returns detected text regions with bounding boxes and confidence scores
- Extracts common packaged-label fields such as product name, MRP, net quantity, manufacturer, and date information
- Returns structured JSON without making compliance decisions

## Installation

From the project root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r ai/requirements.txt
```

## Required Python packages

- fastapi
- uvicorn
- pydantic
- pillow
- numpy
- opencv-python
- pytesseract
- python-multipart

## OCR engine installation

This project uses Tesseract through `pytesseract`.

### Windows

1. Download and install Tesseract OCR from: https://github.com/tesseract-ocr/tesseract
2. Add the Tesseract installation folder to your PATH.
3. Verify using:

```bash
tesseract --version
```

### Linux/macOS

```bash
sudo apt-get install tesseract-ocr
```

or

```bash
brew install tesseract
```

If Tesseract is unavailable, the code is built around a replaceable OCR provider interface so an EasyOCR implementation can be added later.

## How to start FastAPI

From the project root:

```bash
uvicorn ai.api.routes:app --reload
```

## API endpoint

### POST /ocr/extract

Input: multipart/form-data image file

Example request:

```bash
curl -X POST "http://127.0.0.1:8000/ocr/extract" \
  -F "file=@sample_product.jpg"
```

Example response:

```json
{
  "success": true,
  "overall_confidence": 0.91,
  "raw_text": "MRP ₹100\nNet Qty 500 g",
  "text_regions": [
    {
      "text": "MRP ₹100",
      "confidence": 0.95,
      "bbox": [10, 20, 200, 50]
    }
  ],
  "fields": {
    "mrp": {
      "value": "₹100",
      "confidence": 0.9,
      "source_text": "MRP ₹100",
      "bbox": null
    },
    "net_quantity": {
      "value": "500 g",
      "confidence": 0.9,
      "source_text": "Net Qty 500 g",
      "bbox": null
    }
  }
}
```

## How Member 4 can integrate this API

Member 4 can send an image file to the API at `/ocr/extract` and consume the returned `fields` object. The API returns only extracted text and field metadata. It does not decide compliance status.

The backend can:

- upload an image from Android
- call the OCR endpoint
- store the `raw_text` and extracted field values in the database
- pass the extracted data to the legal rules engine later

## Known limitations

- Rule-based field extraction is heuristic and may miss uncommon label formats
- Tesseract accuracy depends on image quality, font clarity, lighting, and label layout
- Complex packaging with multi-line or decorative text may produce imperfect bounding boxes
- This module is focused on extraction only; it does not perform legal compliance checks

## Notes

This module is intentionally independent from the dashboard, Android app, database, and legal rules service.
