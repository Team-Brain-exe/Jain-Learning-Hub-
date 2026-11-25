
import pytest

from app.services.ai_review_service import AIReviewService


@pytest.mark.parametrize(
    "storage_key",
    [
        "/etc/passwd",
        "/var/tmp/secret.pdf",
        "C:\\secret.pdf",
        "C:/secret.pdf",
        "C:secret.pdf",
        "\\\\server\\share\\secret.pdf",
        "../secret.pdf",
        "uploads/student/../../secret.pdf",
        "demo_assets/../../secret.pdf",
    ],
)
def test_resolve_asset_path_rejects_unsafe_paths(storage_key):
    with pytest.raises(ValueError):
        AIReviewService._resolve_asset_path(storage_key)
