from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from ai.extraction.schemas import ExtractedField, OCRTextRegion


def extract_fields(raw_text: str, regions: Optional[List[OCRTextRegion]] = None) -> Dict[str, dict]:
    """Extract common packaged commodity label fields with regex-based heuristics.

    This is intentionally rule-based and structured so the Legal/Rules team can later add compliance logic
    without touching the extraction layer.
    """
    normalized = raw_text or ""
    lines = [line.strip() for line in normalized.splitlines() if line.strip()]
    combined = "\n".join(lines)

    extracted: Dict[str, dict] = {}

    mrp_match = find_mrp(combined)
    if mrp_match:
        extracted["mrp"] = make_field(mrp_match[0], mrp_match[1], mrp_match[2])

    net_quantity_match = find_net_quantity(combined)
    if net_quantity_match:
        extracted["net_quantity"] = make_field(net_quantity_match[0], net_quantity_match[1], net_quantity_match[2])

    manufacturer_match = find_manufacturer(combined)
    if manufacturer_match:
        extracted["manufacturer"] = make_field(manufacturer_match[0], manufacturer_match[1], manufacturer_match[2])

    date_match = find_date(combined)
    if date_match:
        extracted["manufacture_date"] = make_field(date_match[0], date_match[1], date_match[2])

    product_name_match = find_product_name(combined)
    if product_name_match:
        extracted["product_name"] = make_field(product_name_match[0], product_name_match[1], product_name_match[2])

    return extracted


def make_field(source_text: str, value: str, bbox: Optional[List[int]] = None) -> Dict[str, Any]:
    return {
        "value": value,
        "confidence": 0.9,
        "source_text": source_text,
        "bbox": bbox,
    }


def find_mrp(text: str) -> Optional[Tuple[str, str, Optional[List[int]]]]:
    pattern = re.compile(r"(?:MRP|mrp)\s*[:=]?\s*(?:₹|Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
    match = pattern.search(text)
    if not match:
        return None
    value = match.group(0).split()[-1]
    currency = "₹" if "₹" in match.group(0) else "Rs"
    return match.group(0), f"{currency}{value}", None


def find_net_quantity(text: str) -> Optional[Tuple[str, str, Optional[List[int]]]]:
    pattern = re.compile(
        r"(?:Net\s*(?:Qty|Quantity)|Qty|Quantity)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:g|kg|mg|ml|l|litre|litres|cm|mm))",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return None
    whole_match = match.group(0)
    value = match.group(1)
    return whole_match, value, None


def find_manufacturer(text: str) -> Optional[Tuple[str, str, Optional[List[int]]]]:
    pattern = re.compile(
        r"(?:Manufacturer|Packer|Importer|Mfg|Mfd by)\s*[:\-]?\s*(.*?)(?:\n|$)",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return None
    value = match.group(1).strip()
    return match.group(0), value, None


def find_date(text: str) -> Optional[Tuple[str, str, Optional[List[int]]]]:
    pattern = re.compile(
        r"(?:Mfd|Manufactured|Packed|Packing|Imported)\s*(?:on|:)?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{1,2}[/][0-9]{4}|[0-9]{1,2}-[A-Za-z]{3,9}-[0-9]{2,4}|[0-9]{1,2}/[0-9]{4})",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return None
    value = match.group(1).strip()
    return match.group(0), value, None


def find_product_name(text: str) -> Optional[Tuple[str, str, Optional[List[int]]]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        if re.search(r"(?:MRP|Net\s*Qty|Manufactur|Packer|Importer|Address|Qty)", line, re.IGNORECASE):
            continue
        if len(line) <= 4:
            continue
        if len(line) > 80:
            continue
        return line, line, None
    return None
