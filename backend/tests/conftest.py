"""
Set required environment variables BEFORE any module imports settings.
`settings = Settings()` is evaluated at module-level in core/config.py,
so env vars must exist before the first import of any backend module.
"""
import os


def pytest_configure(config):
    env_defaults = {
        "SUPABASE_URL": "https://fake.supabase.co",
        "SUPABASE_ANON_KEY": "fake-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "fake-service-role-key",
        "SUPABASE_JWT_SECRET": "fake-jwt-secret-at-least-32-chars!!",
        "ANTHROPIC_API_KEY": "fake-anthropic-key",
        "PINECONE_API_KEY": "",
    }
    for key, val in env_defaults.items():
        os.environ.setdefault(key, val)
