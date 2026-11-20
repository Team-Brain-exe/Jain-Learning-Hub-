import logging
import os
from typing import List
from app.ai.extractors.base import BaseExtractor
from app.ai.schemas import ContentSegment, LocationType

logger = logging.getLogger(__name__)

class DOCXExtractor(BaseExtractor):
    """
    Extracts structured text from Microsoft Word documents (.docx) including headings,
    paragraphs, and tables.
    """

    def can_handle(self, file_name: str, mime_type: str) -> bool:
        lower = file_name.lower()
        return (
            lower.endswith(".docx")
            or "wordprocessingml" in mime_type.lower()
            or "msword" in mime_type.lower()
        )

    def extract(self, file_path: str, asset_id: str, asset_name: str) -> List[ContentSegment]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document file not found at path: {file_path}")

        try:
            import docx
        except ImportError:
            logger.warning("python-docx is not installed.")
            return []

        segments: List[ContentSegment] = []
        try:
            doc = docx.Document(file_path)
            current_heading = "Introduction / Main"
            section_buffer: List[str] = []

            def flush_section():
                nonlocal section_buffer
                if section_buffer:
                    combined = "\n".join(section_buffer).strip()
                    if combined:
                        segments.append(
                            ContentSegment(
                                asset_id=asset_id,
                                segment_index=len(segments),
                                location_type=LocationType.SECTION,
                                location_value=f"Section: {current_heading}",
                                text=combined,
                                metadata={"heading": current_heading, "asset_name": asset_name}
                            )
                        )
                    section_buffer = []

            for paragraph in doc.paragraphs:
                txt = paragraph.text.strip()
                if not txt:
                    continue

                if paragraph.style.name.startswith("Heading"):
                    flush_section()
                    current_heading = txt
                else:
                    section_buffer.append(txt)

            # Tables
            for table in doc.tables:
                table_rows = []
                for row in table.rows:
                    row_vals = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_vals:
                        table_rows.append(" | ".join(row_vals))
                if table_rows:
                    section_buffer.append("\n".join(table_rows))

            flush_section()

            if not segments:
                segments.append(
                    ContentSegment(
                        asset_id=asset_id,
                        segment_index=0,
                        location_type=LocationType.SECTION,
                        location_value="Document Content",
                        text="[Empty document or unsupported XML structure]",
                        metadata={"asset_name": asset_name}
                    )
                )

        except Exception as e:
            logger.error(f"Error extracting DOCX {file_path}: {str(e)}", exc_info=True)
            segments.append(
                ContentSegment(
                    asset_id=asset_id,
                    segment_index=0,
                    location_type=LocationType.GLOBAL,
                    location_value="Extraction Error",
                    text=f"[DOCX Extraction Failure: {str(e)}]",
                    metadata={"error": str(e), "asset_name": asset_name}
                )
            )

        return segments
