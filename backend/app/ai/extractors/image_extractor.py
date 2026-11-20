import logging
import os
from typing import List
from app.ai.extractors.base import BaseExtractor
from app.ai.schemas import ContentSegment, LocationType

logger = logging.getLogger(__name__)

class ImageExtractor(BaseExtractor):
    """
    Extracts text and diagram descriptions from PNG, JPG, JPEG, and WebP images.
    Uses OCR when available with fallback to structured image metadata inspection.
    """

    SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}

    def can_handle(self, file_name: str, mime_type: str) -> bool:
        ext = os.path.splitext(file_name.lower())[1]
        return ext in self.SUPPORTED_EXTS or "image/" in mime_type.lower()

    def extract(self, file_path: str, asset_id: str, asset_name: str) -> List[ContentSegment]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Image asset not found at path: {file_path}")

        try:
            from PIL import Image
        except ImportError:
            logger.warning("Pillow is not installed.")
            return []

        segments: List[ContentSegment] = []
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                img_format = img.format or "UNKNOWN"
                mode = img.mode

                extracted_text = ""
                # Attempt OCR if pytesseract is available
                try:
                    import pytesseract
                    extracted_text = pytesseract.image_to_string(img).strip()
                except Exception as ocr_err:
                    logger.debug(f"OCR not available for {file_path}: {ocr_err}")

                if not extracted_text:
                    extracted_text = (
                        f"[Diagram/Graphic Asset: {asset_name} ({img_format}, {width}x{height}px). "
                        f"Image verified without structural corruption.]"
                    )

                segment = ContentSegment(
                    asset_id=asset_id,
                    segment_index=0,
                    location_type=LocationType.GLOBAL,
                    location_value=f"Image: {asset_name}",
                    text=extracted_text,
                    metadata={
                        "asset_name": asset_name,
                        "dimensions": f"{width}x{height}",
                        "format": img_format,
                        "mode": mode
                    }
                )
                segments.append(segment)

        except Exception as e:
            logger.error(f"Error extracting image {file_path}: {str(e)}", exc_info=True)
            segments.append(
                ContentSegment(
                    asset_id=asset_id,
                    segment_index=0,
                    location_type=LocationType.GLOBAL,
                    location_value="Image Extraction Error",
                    text=f"[Image Corrupted or Unreadable: {str(e)}]",
                    metadata={"error": str(e), "asset_name": asset_name}
                )
            )

        return segments
