import uuid

import pytest
from botocore.exceptions import BotoCoreError, ClientError

from app.storage import S3Storage


def test_s3_roundtrip():
    storage = S3Storage()
    try:
        storage.client.list_buckets()
    except (BotoCoreError, ClientError, OSError) as exc:
        pytest.skip(f"S3 endpoint unavailable: {exc}")
    key = f"tests/{uuid.uuid4()}.txt"
    storage.put(key, b"hello", "text/plain")
    assert storage.get(key) == b"hello"
