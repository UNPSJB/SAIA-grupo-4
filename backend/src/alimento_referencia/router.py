from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.auth.dependencies import requiere_administracion
from src.database import get_db
from src.alimento_referencia import schemas, services


router = APIRouter(
    prefix="/alimentos-referencia",
    tags=["alimentos-referencia"],
    dependencies=[Depends(requiere_administracion)],
)


@router.get("/", response_model=list[schemas.AlimentoReferencia])
def listar_alimentos_referencia(
    q: str | None = None,
    categoria: str | None = None,
    es_oficial_sara: bool | None = None,
    page: int = Query(1, ge=1),
    limit: int | None = Query(None, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return services.listar_alimentos_referencia(
        db,
        q=q,
        categoria=categoria,
        es_oficial_sara=es_oficial_sara,
        page=page,
        limit=limit,
    )


@router.get("/categorias", response_model=list[str])
def listar_categorias_referencia(db: Session = Depends(get_db)):
    return services.listar_categorias_referencia(db)


@router.get("/{alimento_id}", response_model=schemas.AlimentoReferencia)
def leer_alimento_referencia(alimento_id: int, db: Session = Depends(get_db)):
    return services.leer_alimento_referencia(db, alimento_id)


@router.post("/", response_model=schemas.AlimentoReferencia, status_code=201)
def crear_alimento_referencia(
    alimento: schemas.AlimentoReferenciaCreate,
    db: Session = Depends(get_db),
):
    return services.crear_alimento_referencia(db, alimento)


@router.put("/{alimento_id}", response_model=schemas.AlimentoReferencia)
def modificar_alimento_referencia(
    alimento_id: int,
    alimento: schemas.AlimentoReferenciaUpdate,
    db: Session = Depends(get_db),
):
    return services.modificar_alimento_referencia(db, alimento_id, alimento)


@router.delete("/{alimento_id}", response_model=schemas.AlimentoReferencia)
def eliminar_alimento_referencia(alimento_id: int, db: Session = Depends(get_db)):
    return services.eliminar_alimento_referencia(db, alimento_id)
