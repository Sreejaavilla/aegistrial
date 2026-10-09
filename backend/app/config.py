import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "AegisTrial Recruitment Engine API"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./clinical_trial.db")
    
    # Fabric Gateway Settings
    FABRIC_CHANNEL: str = os.getenv("FABRIC_CHANNEL", "clinical-trials")
    FABRIC_CHAINCODE: str = os.getenv("FABRIC_CHAINCODE", "patient-recruitment-contract")
    FABRIC_MSP_ID: str = os.getenv("FABRIC_MSP_ID", "Org1MSP")
    FABRIC_PEER_ENDPOINT: str = os.getenv("FABRIC_PEER_ENDPOINT", "localhost:7051")
    FABRIC_ENABLE_REAL_NETWORK: bool = os.getenv("FABRIC_ENABLE_REAL_NETWORK", "false").lower() == "true"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

settings = Settings()
