from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TAMAGO_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://tamago:tamago@localhost:5442/tamago"
    api_key: str | None = None


settings = Settings()
