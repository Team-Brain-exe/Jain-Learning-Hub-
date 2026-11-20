from abc import ABC, abstractmethod
from typing import List
from app.ai.schemas import ContentSegment

class BaseExtractor(ABC):
    """
    Abstract base extractor interface for all file formats.
    """

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
