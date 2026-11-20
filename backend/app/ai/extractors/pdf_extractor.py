import logging
import os
from typing import List
from app.ai.extractors.base import BaseExtractor
from app.ai.schemas import ContentSegment, LocationType

logger = logging.getLogger(__name__)

class PDFExtractor(BaseExtractor):
    """
    Extracts text from PDF documents page by page using PyMuPDF (fitz).
    Handles encrypted or unreadable files gracefully.
    """

    def can_handle(self, file_name: str, mime_type: str) -> bool:
        lower = file_name.lower()
        return lower.endswith(".pdf") or "pdf" in mime_type.lower()

    def extract(self, file_path: str, asset_id: str, asset_name: str) -> List[ContentSegment]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at path: {file_path}")

        try:
            import fitz  # PyMuPDF
        except ImportError:
            logger.warning("PyMuPDF (fitz) is not installed. Falling back to plain text extraction if possible.")
            return []

        segments: List[ContentSegment] = []
        try:
            doc = fitz.open(file_path)
            if doc.is_encrypted:
                logger.error(f"PDF {file_name} is password protected/encrypted.")
                return [
                    ContentSegment(
                        asset_id=asset_id,
                        segment_index=0,
                        location_type=LocationType.GLOBAL,
                        location_value="Document Encrypted",
                        text="[ERROR: PDF is encrypted and requires faculty password clearance]",
                        metadata={"error": "encrypted_pdf", "asset_name": asset_name}
                    )
                ]

            total_pages = len(doc)
            for page_index in range(total_pages):
                page = doc.load_page(page_index)
                page_text = page.get_text("text").strip()
                page_num = page_index + 1

                if not page_text:
                    # Note potential scanned page
                    page_text = f"[Scanned/Image page without embedded text layer: Page {page_num}]"

                segment = ContentSegment(
                    asset_id=asset_id,
                    segment_index=len(segments),
                    location_type=LocationType.PAGE,
                    location_value=f"Page {page_num}",
                    text=page_text,
                    metadata={
                        "page_number": page_num,
                        "total_pages": total_pages,
                        "asset_name": asset_name
                    }
                )
                segments.append(segment)

            doc.close()
        except Exception as e:
            logger.error(f"Error extracting PDF {file_path}: {str(e)}", exc_info=True)
            segments.append(
                ContentSegment(
                    asset_id=asset_id,
                    segment_index=0,
                    location_type=LocationType.GLOBAL,
                    location_value="Extraction Error",
                    text=f"[Extraction Failure: {str(e)}]",
                    metadata={"error": str(e), "asset_name": asset_name}
                )
            )

        return segments
