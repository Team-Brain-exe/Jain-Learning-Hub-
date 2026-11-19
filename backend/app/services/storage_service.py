import uuid
from typing import Dict, Any

class StorageService:
    @staticmethod
    def generate_signed_upload_url(
        student_id: str,
        permission_id: str,
        file_name: str,
        mime_type: str
    ) -> Dict[str, Any]:
        """
        Generates a secure storage key and pre-signed upload URL.
        Enforces scoped directory structure: /uploads/{student_id}/{permission_id}/{file_name}
        """
        asset_id = str(uuid.uuid4())
        safe_name = file_name.replace(" ", "_")
        storage_key = f"uploads/{student_id}/{permission_id}/{asset_id}_{safe_name}"
        signed_upload_url = f"https://storage.jainuniversity.ac.in/signed-put/{storage_key}?token=mock_signed_token_{asset_id}"
        signed_view_url = f"https://storage.jainuniversity.ac.in/view/{storage_key}"

        return {
            "asset_id": asset_id,
            "storage_key": storage_key,
            "signed_upload_url": signed_upload_url,
            "signed_view_url": signed_view_url,
        }

