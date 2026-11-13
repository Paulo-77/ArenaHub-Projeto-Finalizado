import os
from pathlib import Path
from dotenv import load_dotenv

PASTA_BACKEND = Path(__file__).resolve().parent

load_dotenv(PASTA_BACKEND / ".env")

class Config:
    DB_PATH = PASTA_BACKEND.parent / "banco" / "arenahub.db"
    API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY")