from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_url: str = f"sqlite:///{BASE_DIR}/data/subsight.db"
    # Apify API token — for live Reddit data (apify.com → Settings → Integrations)
    apify_token: str = ""
    # Reddit OAuth (optional, alternative to Apify)
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_username: str = ""
    # Auth
    jwt_secret: str = ""
    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    class Config:
        env_file = BASE_DIR / ".env"
        env_file_encoding = "utf-8"


settings = Settings()
