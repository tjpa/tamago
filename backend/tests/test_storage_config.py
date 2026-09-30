from app.config import settings
from app.storage import S3Storage


def test_custom_endpoint_uses_static_credentials_and_path_style(monkeypatch):
    monkeypatch.setattr(settings, "s3_endpoint", "https://acct.r2.cloudflarestorage.com")
    monkeypatch.setattr(settings, "s3_region", "auto")
    client = S3Storage().client
    assert client.meta.endpoint_url == "https://acct.r2.cloudflarestorage.com"
    assert client.meta.config.request_checksum_calculation == "when_required"
    assert client.meta.config.response_checksum_validation == "when_required"


def test_empty_endpoint_targets_real_aws(monkeypatch):
    monkeypatch.setattr(settings, "s3_endpoint", "")
    monkeypatch.setattr(settings, "s3_region", "eu-west-2")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "x")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "y")
    assert S3Storage().client.meta.endpoint_url == "https://s3.eu-west-2.amazonaws.com"


def test_bucket_is_not_touched_when_auto_create_is_off(monkeypatch):
    monkeypatch.setattr(settings, "s3_auto_create_bucket", False)
    storage = S3Storage()

    def boom(**_):
        raise AssertionError("bucket API must not be called")

    storage.client.head_bucket = boom
    storage.client.create_bucket = boom
    storage._ensure_bucket()
