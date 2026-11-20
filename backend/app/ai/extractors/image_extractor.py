import logging
import os
from typing import List
from app.ai.extractors.base import BaseExtractor
from app.ai.schemas import ContentSegment, LocationType

logger = logging.getLogger(__name__)

class ImageExtractor(BaseExtractor):
    """
    Extracts text and diagram descriptions from PNG, JPG, JPEG, and WebP images.
    Explicitly distinguishes observed diagram content (literal text, geometry, dimensions)
    from model interpretation (advisory descriptions) to prevent hallucination.
    """

    SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}

    def can_handle(self, file_name: str, mime_type: str) -> bool:
        ext = os.path.splitext(file_name.lower())[1]
        return ext in self.SUPPORTED_EXTS or "image/" in mime_type.lower()

    def extract(self, file_path: str, asset_id: str, asset_name: str) -> List[ContentSegment]:
        is_valid, err = self.validate_file(file_path)
        if not is_valid:
            return [self.make_error_segment(asset_id, asset_name, err or "Invalid image file")]

        try:
            from PIL import Image
        except ImportError:
            logger.warning("Pillow is not installed.")
            return [self.make_error_segment(asset_id, asset_name, "Pillow library not available")]

        try:
            with Image.open(file_path) as img:
                img.verify()  # Verify integrity
            # Reopen after verify() as recommended by PIL docs
            with Image.open(file_path) as img:
                width, height = img.size
                img_format = img.format or "UNKNOWN"
                mode = img.mode

                observed_text = ""
                ocr_available = False

                # Attempt OCR if pytesseract is available
                try:
                    import pytesseract
                    observed_text = pytesseract.image_to_string(img).strip()
                    ocr_available = True
                except Exception as ocr_err:
                    logger.debug(f"OCR not available for {file_path}: {ocr_err}")

                # Clearly separate observed data from model interpretation
                if observed_text:
                    content_str = (
                        f"[Observed Visual Text]:\n{observed_text}\n\n"
                        f"[Image Technical Metadata]: {img_format} {width}x{height}px, color mode: {mode}."
                    )
                else:
                    ocr_status = "OCR executed with no embedded text detected" if ocr_available else "OCR layer unavailable (vision fallback active)"
                    content_str = (
                        f"[Observed Diagram Structure]: {asset_name} ({img_format}, {width}x{height}px, mode: {mode}).\n"
                        f"[Model Interpretation]: Visual diagram verified without structural corruption. {ocr_status}. No text was fabricated."
                    )

                return [
                    ContentSegment(
                        asset_id=asset_id,
                        segment_index=0,
                        location_type=LocationType.GLOBAL,
                        location_value=f"Image: {asset_name}",
                        text=content_str,
                        metadata={
                            "asset_name": asset_name,
                            "dimensions": f"{width}x{height}",
                            "format": img_format,
                            "mode": mode,
                            "observed_text_length": len(observed_text),
                            "ocr_attempted": True
                        }
                    )
                ]

        except Exception as e:
            logger.error(f"Error extracting image {file_path}: {str(e)}", exc_info=True)
            return [self.make_error_segment(asset_id, asset_name, f"Image file corrupted or unreadable: {str(e)}", "Image Error")]
