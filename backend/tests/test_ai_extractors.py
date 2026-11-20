import os
import tempfile
import pytest
from app.ai.extractors.pdf_extractor import PDFExtractor
from app.ai.extractors.pptx_extractor import PPTXExtractor
from app.ai.extractors.docx_extractor import DOCXExtractor
from app.ai.extractors.audio_video_extractor import AudioVideoExtractor, format_timestamp, generate_webvtt
from app.ai.extractors import get_extractor_for_file
from app.ai.schemas import LocationType

def test_extractor_registry_dispatch():
    assert isinstance(get_extractor_for_file("slides.pptx"), PPTXExtractor)
    assert isinstance(get_extractor_for_file("document.pdf"), PDFExtractor)
    assert isinstance(get_extractor_for_file("notes.docx"), DOCXExtractor)
    assert isinstance(get_extractor_for_file("lecture.mp4"), AudioVideoExtractor)
    assert isinstance(get_extractor_for_file("audio.mp3"), AudioVideoExtractor)
    assert get_extractor_for_file("unknown.xyz") is None

def test_pdf_extractor_with_real_pdf():
    import fitz
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        doc = fitz.open()
        page1 = doc.new_page()
        page1.insert_text((50, 50), "Python compiles source code to bytecode before VM execution.")
        page2 = doc.new_page()
        page2.insert_text((50, 50), "Binary search requires a sorted array and runs in O(log n).")
        doc.save(tmp.name)
        doc.close()
        tmp_path = tmp.name

    try:
        extractor = PDFExtractor()
        assert extractor.can_handle("lecture.pdf", "application/pdf")
        segments = extractor.extract(tmp_path, asset_id="asset-pdf-1", asset_name="lecture.pdf")
        assert len(segments) == 2
        assert segments[0].location_type == LocationType.PAGE
        assert segments[0].location_value == "Page 1"
        assert "bytecode" in segments[0].text
        assert segments[1].location_value == "Page 2"
        assert "Binary search" in segments[1].text
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_pptx_extractor_with_real_pptx():
    from pptx import Presentation
    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    title = slide.shapes.title
    title.text = "Introduction to Computer Networks"
    subtitle = slide.placeholders[1]
    subtitle.text = "TCP provides reliable connection-oriented transport."

    with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as tmp:
        prs.save(tmp.name)
        tmp_path = tmp.name

    try:
        extractor = PPTXExtractor()
        assert extractor.can_handle("slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
        segments = extractor.extract(tmp_path, asset_id="asset-ppt-1", asset_name="slides.pptx")
        assert len(segments) == 1
        assert segments[0].location_type == LocationType.SLIDE
        assert segments[0].location_value == "Slide 1"
        assert "TCP provides reliable connection-oriented transport." in segments[0].text
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_docx_extractor_with_real_docx():
    import docx
    doc = docx.Document()
    doc.add_heading("Operating Systems Architecture", level=1)
    doc.add_paragraph("In Linux, chmod modifies read, write, and execute permissions.")

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        doc.save(tmp.name)
        tmp_path = tmp.name

    try:
        extractor = DOCXExtractor()
        assert extractor.can_handle("notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        segments = extractor.extract(tmp_path, asset_id="asset-doc-1", asset_name="notes.docx")
        assert len(segments) >= 1
        assert segments[0].location_type == LocationType.SECTION
        assert "chmod modifies read, write, and execute permissions" in segments[0].text
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_audio_video_extractor_and_webvtt():
    assert format_timestamp(45) == "00:45"
    assert format_timestamp(125) == "02:05"
    assert format_timestamp(3665) == "01:01:05"

    vtt = generate_webvtt([
        {"start": 0.0, "end": 4.5, "text": "Welcome to Python fundamentals."},
        {"start": 4.5, "end": 10.0, "text": "Python is a bytecode-compiled interpreted language."}
    ])
    assert "WEBVTT" in vtt
    assert "00:00:00.000 --> 00:00:04.500" in vtt
    assert "Welcome to Python fundamentals." in vtt

    # Test sidecar transcript parsing
    with tempfile.NamedTemporaryFile(suffix=".transcript.txt", delete=False) as tmp:
        tmp.write(b"00:15 Welcome to the lecture.\n01:30 Python is a compiled-only programming language.\n")
        tmp_path = tmp.name

    media_dummy_path = tmp_path.replace(".transcript.txt", ".mp4")
    with open(media_dummy_path, "wb") as f:
        f.write(b"dummy-mp4-data")

    try:
        extractor = AudioVideoExtractor()
        segments = extractor.extract(media_dummy_path, asset_id="asset-video-1", asset_name="lecture.mp4")
        assert len(segments) == 2
        assert segments[0].location_value == "timestamp: 00:15"
        assert segments[1].location_value == "timestamp: 01:30"
        assert "compiled-only" in segments[1].text
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        if os.path.exists(media_dummy_path):
            os.remove(media_dummy_path)
