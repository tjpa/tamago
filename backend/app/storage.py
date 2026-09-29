from functools import lru_cache
from typing import Protocol

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import settings


class Storage(Protocol):
    def put(self, key: str, data: bytes, content_type: str) -> None: ...

    def get(self, key: str) -> bytes: ...


class S3Storage:
    def __init__(self) -> None:
        self.bucket = settings.s3_bucket
        kwargs: dict = {
            "region_name": settings.s3_region,
            "config": Config(s3={"addressing_style": "path"}),
        }
        if settings.s3_endpoint:
            # Local S3-compatible mock: explicit endpoint and static test credentials.
            kwargs.update(
                endpoint_url=settings.s3_endpoint,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
            )
        # Otherwise real AWS S3: boto3's default credential chain (task role, env, profile).
        self.client = boto3.client("s3", **kwargs)
        self._ready = False

    def _ensure_bucket(self) -> None:
        if self._ready:
            return
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket)
        self._ready = True

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self._ensure_bucket()
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)

    def get(self, key: str) -> bytes:
        self._ensure_bucket()
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].read()


class MemoryStorage:
    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self.objects[key] = (data, content_type)

    def get(self, key: str) -> bytes:
        return self.objects[key][0]


@lru_cache
def get_storage() -> Storage:
    return S3Storage()
