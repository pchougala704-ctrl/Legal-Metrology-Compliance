from ai.extraction.schemas import OCRTextRegion, OCRResult


def test_ocr_result_has_regions_and_confidence():
    region = OCRTextRegion(text="MRP ₹100", confidence=0.95, bbox=[10, 20, 200, 50])
    result = OCRResult(
        raw_text="MRP ₹100\nNet Qty 500 g",
        text_regions=[region],
        overall_confidence=0.95,
    )

    assert result.overall_confidence == 0.95
    assert len(result.text_regions) == 1
    assert result.text_regions[0].bbox == [10, 20, 200, 50]
    assert 0 <= result.text_regions[0].confidence <= 1
