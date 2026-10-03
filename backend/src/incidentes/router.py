from fastapi import APIRouter
from sqlalchemy.orm import Session
from src.database import get_db
from src.incidentes import schemas, services

router = APIRouter(prefix="/incidentes", tags=["incidentes"])