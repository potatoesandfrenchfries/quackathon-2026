"""
Supabase client singletons.

- `anon_client`    — uses anon key, respects RLS (mirrors what frontend sees)
- `service_client` — uses service_role key, bypasses RLS (backend writes)
"""
from supabase import Client, create_client

from core.config import settings

# Anon client: read-only operations that respect RLS
anon_client: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

# Service client: all write operations (credibility events, AI responses, etc.)
service_client: Client = create_client(
    settings.supabase_url, settings.supabase_service_role_key
)


def get_db() -> Client:
    """FastAPI dependency — returns service_client for write ops."""
    return service_client


def get_anon_db() -> Client:
    """FastAPI dependency — returns anon_client for read ops."""
    return anon_client
