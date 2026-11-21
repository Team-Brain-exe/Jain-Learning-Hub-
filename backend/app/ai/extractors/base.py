import os
from abc import ABC, abstractmethod
from typing import List, Tuple, Optional
from app.ai.schemas import ContentSegment, LocationType

class BaseExtractor(ABC):
    """
    Abstract base extractor interface for all file formats.
    Provides standard validation for file existence, size, and emptiness.
    """

    DEFAULT_MAX_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB default max size

    @abstractmethod
    def can_handle(self, file_name: str, mime_type: str) -> bool:
        """Determines if this extractor supports the given file format."""
        pass

    @abstractmethod
    def extract(self, file_path: str, asset_id: str, asset_name: str) -> List[ContentSegment]:
        """
        Extracts content segments from the given file, tagging each segment with location markers.
        """
        pass

    def validate_file(self, file_path: str, max_size_bytes: Optional[int] = None) -> Tuple[bool, Optional[str]]:
        """
        Validates file existence, non-emptiness, and size bounds.
        Returns (is_valid, error_reason).
        """
        if not os.path.exists(file_path):
            return False, f"File not found on disk: {file_path}"

        size = os.path.getsize(file_path)
        if size == 0:
            return False, "File is completely empty (0 bytes)."

        limit = max_size_bytes or self.DEFAULT_MAX_SIZE_BYTES
        if size > limit:
            return False, f"File size ({size} bytes) exceeds maximum allowed limit ({limit} bytes)."

        return True, None

    def make_error_segment(self, asset_id: str, asset_name: str, error_msg: str, location_label: str = "Extraction Error") -> ContentSegment:
        """Helper to create standardized error segments that will not crash downstream verification."""
        return ContentSegment(
            asset_id=asset_id,
            segment_index=0,
            location_type=LocationType.GLOBAL,
            location_value=location_label,
            text=f"[Extraction Failure: {error_msg}]",
            metadata={"error": error_msg, "asset_name": asset_name}
        )
