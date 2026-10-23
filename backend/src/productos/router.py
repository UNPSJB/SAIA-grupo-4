from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session
from src.database import get_db
from src.productos import schemas, services
from src.auth.dependencies import requiere_administracion

router = APIRouter(prefix="/productos", tags=["productos"], dependencies=[Depends(requiere_administracion)])

