# Extractor Results & Validation Matrix

This matrix documents the multi-format extraction engine behavior, location marker accuracy, and edge-case handling across all supported file types in the **JAIN FET Learning Hub**.

---

## 1. File Type Extraction Matrix

| Input Format | Extractor Class | Location Marker | Observed Content Captured | Model Interpretation Handling | Edge Case Behavior |
|---|---|---|---|---|---|
| **PDF (`.pdf`)** | `PDFExtractor` (`PyMuPDF`) | `Page N` | Page-anchored native text layer, font spans, page count. | Distinguishes scanned pages without embedded text. | • 0-byte file: `[Empty PDF file]`<br>• Encrypted: `[ERROR: PDF is encrypted]`<br>• Oversize: `[File Oversized]` |
| **PowerPoint (`.pptx`, `.ppt`)** | `PPTXExtractor` (`python-pptx`) | `Slide N` | Slide text boxes, tables, presenter speaker notes, slide indices. | Empty / diagram-only slides explicitly labeled without inventing bullets. | • 0-byte file: `[Empty presentation]`<br>• Corrupt: `[PPTX Extraction Failure]` |
| **Word (`.docx`)** | `DOCXExtractor` (`python-docx`) | `Section: [Heading]` | Headings (H1/H2/H3), paragraphs, bullet lists, multi-column tables. | Preserves hierarchical section groupings. | • 0-byte file: `[Empty document]`<br>• Corrupt: `[DOCX Extraction Failure]` |
| **Video (`.mp4`, `.mov`)** | `AudioVideoExtractor` | `timestamp: MM:SS` | Audio speech transcript with start/end millisecond precision. | WebVTT caption generator with timecode cues. | • 0-byte file: `[Empty media file]`<br>• Missing audio: explicit notice |
| **Audio (`.mp3`, `.wav`)** | `AudioVideoExtractor` | `timestamp: MM:SS` | Timestamped speech text. | WebVTT caption format. | • Corrupt header: handled safely |
| **Graphic (`.png`, `.jpg`, `.jpeg`)** | `ImageExtractor` (`Pillow`) | `Image: [filename]` | Physical dimensions, color mode, raw OCR text layer (when present). | **Explicitly separated**: labeled as `[Observed Diagram Structure]` vs `[Model Interpretation]`. Never fabricates text. | • 0-byte: `[Empty image file]`<br>• Corrupted: `[Image Corrupted]` |

---

## 2. Test Verification Coverage

Automated tests in `backend/tests/` verify every cell in this matrix:

1. `test_ai_extractors.py`:
   - Real PDF creation, extraction, and page number tagging (`Page 1`, `Page 2`).
   - Real PPTX slide generation, subtitle parsing, and slide numbering (`Slide 1`).
   - Real DOCX document heading and section buffering (`Section: Operating Systems Architecture`).
   - Audio/Video timestamp parsing (`timestamp: 00:15`, `timestamp: 01:30`) and WebVTT generation.

2. `test_ai_extractor_edge_cases.py`:
   - Empty files (0 bytes) for PDF, DOCX, and Image formats.
   - Corrupt files (invalid headers/bytes) for DOCX and PNG.
   - Oversized file rejection (> size threshold).
   - Unsupported file rejection (e.g. `.tar.gz`).
   - Image extractor's strict separation between observed visual text and model interpretation.

3. `test_demo_assets_pipeline.py`:
   - Combined pipeline execution processing all 5 file formats in a single course review.
