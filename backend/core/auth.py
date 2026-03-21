"""
JWT verification for Supabase-issued tokens.
The frontend sends the Supabase access token in the Authorization header.
We verify it here using the project's JWT secret (HS256).
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from core.config import settings

bearer_scheme = HTTPBearer()


def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase doesn't set aud by default
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> dict:
    """
    Dependency that extracts and validates the Supabase JWT.
    Returns the decoded payload — includes `sub` (user UUID) and `email`.
    """
    return _decode_token(credentials.credentials)


def get_current_user_id(
    user: Annotated[dict, Depends(get_current_user)],
) -> str:
    """Shortcut dependency: just the user UUID string."""
    uid = user.get("sub")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No subject in token")
    return uid


# Type aliases for cleaner route signatures
CurrentUser = Annotated[dict, Depends(get_current_user)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
