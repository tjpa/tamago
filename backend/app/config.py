from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TAMAGO_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://tamago:tamago@localhost:5442/tamago"
    api_key: str | None = None

    s3_endpoint: str | None = "http://localhost:9090"
    s3_bucket: str = "tamago"
    s3_region: str = "us-east-1"
    s3_access_key: str = "test"
    s3_secret_key: str = "test"

    worker_poll_seconds: float = 1.0
    task_max_attempts: int = 5
    task_lock_timeout_seconds: int = 300


settings = Settings()
