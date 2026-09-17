from PIL import Image
import numpy as np

from ai.extraction.preprocessing import preprocess_image


def test_preprocess_image_returns_valid_array():
    image = Image.new("RGB", (1200, 800), (255, 0, 0))
    processed = preprocess_image(image)

    assert isinstance(processed, np.ndarray)
    assert processed.size > 0
    assert processed.dtype == np.uint8
    assert len(processed.shape) in (2, 3)
    assert processed.max() <= 255
