from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.auth.dependencies import requiere_administracion
from src.dashboard import schemas, services
from src.database import get_db

# Dashboard consolidado de métricas. Protegido exclusivamente para administradores.
router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(requiere_administracion)])


@router.get("/", response_model=schemas.DashboardResponse)
def obtener_dashboard(
    desde: date | None = Query(default=None, description="Fecha desde (inclusive). Formato AAAA-MM-DD"),
    hasta: date | None = Query(default=None, description="Fecha hasta (inclusive). Formato AAAA-MM-DD"),
    db: Session = Depends(get_db),
):
    # Consolida todas las métricas en una única respuesta.
    return services.obtener_dashboard(db, desde, hasta)
