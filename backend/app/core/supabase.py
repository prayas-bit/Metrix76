"""
Centralized Supabase Database & Storage Client Provider
"""
import os
from supabase import create_client, Client
from app.config import settings

_supabase_client: Client = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        if url and key and key != "test-key" and not url.startswith("http://localhost:54321"):
            try:
                _supabase_client = create_client(url, key)
            except Exception as e:
                print(f"[Supabase] Connection warning: {e}")
                _supabase_client = None
        else:
            try:
                _supabase_client = create_client(url, key)
            except Exception:
                _supabase_client = None
    return _supabase_client
