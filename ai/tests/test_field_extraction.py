from ai.extraction.field_extractor import extract_fields


def test_mrp_extraction():
    text = "MRP ₹100.00"
    fields = extract_fields(text)
    assert fields["mrp"]["value"] == "₹100.00"
    assert fields["mrp"]["confidence"] >= 0.0


def test_net_quantity_extraction():
    text = "Net Qty 500 g"
    fields = extract_fields(text)
    assert fields["net_quantity"]["value"] == "500 g"


def test_manufacturer_extraction():
    text = "Manufacturer: ABC Foods Pvt Ltd"
    fields = extract_fields(text)
    assert "manufacturer" in fields
    assert "ABC Foods Pvt Ltd" in fields["manufacturer"]["value"]


def test_month_year_extraction():
    text = "Mfd. 05/2024"
    fields = extract_fields(text)
    assert "manufacture_date" in fields
    assert fields["manufacture_date"]["value"] == "05/2024"


def test_missing_field_handling():
    text = "Fresh and tasty"
    fields = extract_fields(text)
    assert "mrp" not in fields
    assert "net_quantity" not in fields
    assert isinstance(fields, dict)
