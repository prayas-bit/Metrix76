import base64
import json
import os
from typing import Any

try:
    import jwt
except ImportError:  # pragma: no cover - optional dependency for local JWT verification
    jwt = None

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer_scheme = HTTPBearer(auto_error=False)


def _decode_jwt_without_verification(token: str) -> dict[str, Any]:
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError('Token is not a valid JWT shape.')

    payload = parts[1].replace('-', '+').replace('_', '/')
    padding = '=' * (-len(payload) % 4)
    decoded = base64.b64decode(payload + padding)
    return json.loads(decoded.decode('utf-8'))


def _verify_supabase_claims(token: str) -> dict[str, Any]:
    secret = os.getenv('SUPABASE_JWT_SECRET')

    if secret and jwt is not None:
        payload = jwt.decode(token, secret, algorithms=['HS256'], options={'verify_aud': False})
        if not payload:
            raise ValueError('JWT verification did not return claims.')
        return payload

    return _decode_jwt_without_verification(token)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != 'bearer':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Missing bearer token.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    token = credentials.credentials

    try:
        claims = _verify_supabase_claims(token)
    except Exception as exc:  # pragma: no cover - defensive local-dev fallback
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f'Invalid or expired token: {str(exc)}',
            headers={'WWW-Authenticate': 'Bearer'},
        ) from exc

    user_id = claims.get('sub') or claims.get('user_id')
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token is missing a user identifier.',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    return {
        'user_id': user_id,
        'role': claims.get('role') or claims.get('user_role') or claims.get('app_metadata', {}).get('role'),
        'claims': claims,
    }


def require_roles(*allowed_roles: str):
    def dependency(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        role = (current_user.get('role') or '').upper()
        if not allowed_roles or role in {value.upper() for value in allowed_roles}:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f'Role required: {", ".join(allowed_roles)}',
        )

    return dependency
