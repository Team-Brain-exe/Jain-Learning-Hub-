import os
import tempfile
import pytest
from app.ai.extractors.pdf_extractor import PDFExtractor
from app.ai.extractors.pptx_extractor import PPTXExtractor
from app.ai.extractors.docx_extractor import DOCXExtractor
from app.ai.extractors.image_extractor import ImageExtractor
from app.ai.extractors.audio_video_extractor import AudioVideoExtractor
from app.ai.extractors import get_extractor_for_file
from app.ai.schemas import LocationType

def test_empty_files_handled_gracefully():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(b"")
        tmp_path = tmp.name

    try:
        extractor = PDFExtractor()
        segments = extractor.extract(tmp_path, "asset-empty-pdf", "empty.pdf")
        assert len(segments) == 1
        assert "empty" in segments[0].text.lower() or "0 bytes" in segments[0].text.lower()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_corrupt_files_handled_without_crash():
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(b"NOT_A_REAL_DOCX_FILE_CORRUPT_BYTES_XYZ123")
        tmp_path = tmp.name

    try:
        extractor = DOCXExtractor()
        segments = extractor.extract(tmp_path, "asset-corrupt-docx", "corrupt.docx")
        assert len(segments) == 1
        assert "failure" in segments[0].text.lower() or "invalid" in segments[0].text.lower()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_oversized_file_rejection():
    extractor = PDFExtractor()
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(b"0" * 1024)
        tmp_path = tmp.name

    try:
        # Validate with custom small limit
        is_valid, err = extractor.validate_file(tmp_path, max_size_bytes=512)
        assert is_valid is False
        assert "exceeds maximum allowed limit" in err
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_unsupported_file_dispatch():
    extractor = get_extractor_for_file("archive.tar.gz", "application/gzip")
    assert extractor is None

def test_image_extractor_distinguishes_observed_and_interpretation():
    from PIL import Image
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        img = Image.new("RGB", (100, 100), color=(255, 0, 0))
        img.save(tmp.name)
        tmp_path = tmp.name

    try:
        extractor = ImageExtractor()
        segments = extractor.extract(tmp_path, "asset-test-img", "test.png")
        assert len(segments) == 1
        text = segments[0].text
        # Verify observed vs model interpretation separation
        assert "[Observed Diagram Structure]:" in text or "[Observed Visual Text]:" in text
        assert "[Model Interpretation]:" in text or "[Image Technical Metadata]:" in text
        assert "No text was fabricated" in text or "technical metadata" in text.lower()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_corrupt_image_returns_error_segment():
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(b"NOT_AN_IMAGE_HEADER_CORRUPTED")
        tmp_path = tmp.name

    try:
        extractor = ImageExtractor()
        segments = extractor.extract(tmp_path, "asset-corrupt-png", "corrupt.png")
        assert len(segments) == 1
        assert "corrupt" in segments[0].text.lower() or "error" in segments[0].text.lower()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
