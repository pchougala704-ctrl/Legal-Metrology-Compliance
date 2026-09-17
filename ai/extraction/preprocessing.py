from __future__ import annotations

from io import BytesIO
from typing import BinaryIO, Union

import cv2
import numpy as np
from PIL import Image, ImageOps


MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def validate_image_upload(file_obj: Union[BinaryIO, bytes], max_size_bytes: int = MAX_IMAGE_BYTES) -> None:
    """Ensure the uploaded file looks like a valid image and is within the size limit."""
    if hasattr(file_obj, "read"):
        file_obj.seek(0, 2)
        size = file_obj.tell()
        file_obj.seek(0)
    else:
        size = len(file_obj)

    if size == 0:
        raise ValueError("Uploaded image is empty.")
    if size > max_size_bytes:
        raise ValueError(f"Uploaded image exceeds the maximum size of {max_size_bytes / (1024 * 1024):.1f} MB.")

    if hasattr(file_obj, "content_type"):
        content_type = file_obj.content_type.lower()
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError("Unsupported image format. Please upload a JPG, PNG, or WebP image.")

    if hasattr(file_obj, "filename"):
        filename = (file_obj.filename or "").lower()
        if not filename:
            raise ValueError("Image filename is missing.")
        if not any(filename.endswith(ext) for ext in (".jpg", ",jpeg", ".png", ".webp")):
            raise ValueError("Image extension is not supported.")


def preprocess_image(image: Image.Image) -> np.ndarray:
    """Apply a light OCR-friendly preprocessing pipeline to the input image."""
    if image.mode not in {"RGB", "L", "RGBA", "CMYK"}:
        image = image.convert("RGB")

    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    width, height = image.size
    max_dim = 2200
    scale = min(1.0, max_dim / max(width, height))
    if scale < 1.0:
        new_size = (max(1, int(width * scale)), max(1, int(height * scale)))
        image = image.resize(new_size, Image.Resampling.LANCZOS)

    rgb = np.asarray(image)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    gray = cv2.equalizeHist(gray)

    # Adaptive threshold keeps text readable even when labels have a colored or uneven background.
    thresholded = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        10,
    )

    # A simple deskew estimate helps when the image is slightly rotated.
    coords = np.column_stack(np.where(thresholded > 0))
    if coords.size > 0:
        angle = estimate_skew_angle(thresholded)
        if abs(angle) > 0.5:
            (h, w) = thresholded.shape[:2]
            center = (w // 2, h // 2)
            matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
            thresholded = cv2.warpAffine(thresholded, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    return thresholded.astype(np.uint8)


def estimate_skew_angle(gray: np.ndarray) -> float:
    """Estimate a small deskew angle from projected text lines."""
    coords = cv2.findNonZero(255 - gray)
    if coords is None or len(coords) < 10:
        return 0.0

    rect = cv2.minAreaRect(coords)
    angle = rect[-1]
    if angle < -45:
        angle = 90 + angle
    elif angle > 45:
        angle = angle - 90
    return float(angle)


def image_from_upload(file_obj: BinaryIO) -> Image.Image:
    """Read an uploaded file object into a Pillow image instance."""
    file_obj.seek(0)
    image_bytes = file_obj.read()
    if len(image_bytes) == 0:
        raise ValueError("Uploaded image is empty.")

    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
        return image
    except Exception as exc:  # pragma: no cover - defensive branch
        raise ValueError("Image could not be decoded. Please upload a valid image file.") from exc
