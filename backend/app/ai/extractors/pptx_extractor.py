import logging
import os
from typing import List
from app.ai.extractors.base import BaseExtractor
from app.ai.schemas import ContentSegment, LocationType

logger = logging.getLogger(__name__)

class PPTXExtractor(BaseExtractor):
    """
    Extracts slide text, tables, and speaker notes from PowerPoint presentations (PPTX).
    Safely validates file existence, size, and handles corrupt or empty presentations.
    """

    def can_handle(self, file_name: str, mime_type: str) -> bool:
        lower = file_name.lower()
        return (
            lower.endswith(".pptx")
            or lower.endswith(".ppt")
            or "presentation" in mime_type.lower()
            or "powerpoint" in mime_type.lower()
        )

    def extract(self, file_path: str, asset_id: str, asset_name: str) -> List[ContentSegment]:
        is_valid, err = self.validate_file(file_path)
        if not is_valid:
            return [self.make_error_segment(asset_id, asset_name, err or "Invalid presentation file")]

        try:
            from pptx import Presentation
        except ImportError:
            logger.warning("python-pptx is not installed.")
            return [self.make_error_segment(asset_id, asset_name, "python-pptx library not available")]

        segments: List[ContentSegment] = []
        try:
            prs = Presentation(file_path)
            total_slides = len(prs.slides)
            if total_slides == 0:
                return [self.make_error_segment(asset_id, asset_name, "Presentation contains zero slides")]

            for slide_idx, slide in enumerate(prs.slides):
                slide_num = slide_idx + 1
                slide_parts: List[str] = []

                # 1. Slide shapes & text frames
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            line = "".join(run.text for run in paragraph.runs).strip()
                            if line:
                                slide_parts.append(line)

                    # 2. Table content
                    elif shape.has_table:
                        table = shape.table
                        for row in table.rows:
                            row_vals = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                            if row_vals:
                                slide_parts.append(" | ".join(row_vals))

                # 3. Presenter / Speaker Notes
                notes_text = ""
                if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                    raw_notes = slide.notes_slide.notes_text_frame.text.strip()
                    if raw_notes:
                        notes_text = raw_notes
                        slide_parts.append(f"[Speaker Notes: {raw_notes}]")

                combined_slide_text = "\n".join(slide_parts).strip()
                if not combined_slide_text:
                    combined_slide_text = f"[Empty or diagram-only slide: Slide {slide_num}]"

                segment = ContentSegment(
                    asset_id=asset_id,
                    segment_index=len(segments),
                    location_type=LocationType.SLIDE,
                    location_value=f"Slide {slide_num}",
                    text=combined_slide_text,
                    metadata={
                        "slide_number": slide_num,
                        "total_slides": total_slides,
                        "has_speaker_notes": bool(notes_text),
                        "asset_name": asset_name
                    }
                )
                segments.append(segment)

        except Exception as e:
            logger.error(f"Error extracting PPTX {file_path}: {str(e)}", exc_info=True)
            segments.append(self.make_error_segment(asset_id, asset_name, f"PPTX Extraction Failure: {str(e)}"))

        return segments
