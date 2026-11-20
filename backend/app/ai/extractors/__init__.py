from typing import List, Optional
from app.ai.extractors.base import BaseExtractor
from app.ai.extractors.pdf_extractor import PDFExtractor
from app.ai.extractors.pptx_extractor import PPTXExtractor
from app.ai.extractors.docx_extractor import DOCXExtractor
from app.ai.extractors.audio_video_extractor import AudioVideoExtractor
from app.ai.extractors.image_extractor import ImageExtractor

EXTRACTORS: List[BaseExtractor] = [
    PDFExtractor(),
    PPTXExtractor(),
    DOCXExtractor(),
    AudioVideoExtractor(),
    ImageExtractor(),
]

def get_extractor_for_file(file_name: str, mime_type: str = "") -> Optional[BaseExtractor]:
    """Finds an appropriate extractor for the given file."""
    for extractor in EXTRACTORS:
        if extractor.can_handle(file_name, mime_type):
            return extractor
    return None
