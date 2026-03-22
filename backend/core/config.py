from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # Anthropic
    anthropic_api_key: str

    # Pinecone (optional — falls back to stub RAG if not set)
    pinecone_api_key: str = ""
    pinecone_index_name: str = "buddy-finance"

    # Redis (Upstash)
    redis_url: str = "redis://localhost:6379"

    # App
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:3000"]

    # Credibility config
    signup_bonus: int = 100
    answer_accepted_delta: int = 15
    fact_check_fail_delta: int = -25
    spam_penalty_delta: int = -50
    vote_up_base_delta: int = 3
    vote_down_base_delta: int = -2
    stake_validate_delta: int = 20
    stake_win_multiplier: float = 1.5  # bonus multiplier applied to a winning stake

    # Inactivity decay
    decay_grace_days: int = 7   # days before decay starts
    decay_daily_rate: int = 2   # credibility lost per day after grace period

    # Challenges
    challenge_completed_delta: int = 30   # credibility awarded on challenge completion


settings = Settings()
