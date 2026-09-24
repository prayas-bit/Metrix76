import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NAWI OIML R 76 Type Approval Core Engine"
    API_V1_STR: str = "/api/v1"
    SUPABASE_URL: str = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")
    STORAGE_BUCKET_REPORTS: str = "generated-reports"
    STORAGE_BUCKET_MEDIA: str = "instrument-photos"
    
    class Config:
        case_sensitive = True

settings = Settings()
