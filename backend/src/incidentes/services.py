from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.incidentes import schemas, exceptions
from src.incidentes.models import Incidente

def crear_incidente(db: Session, incidente: schemas.IncidenteCreate) -> Incidente:
    _incidente = Incidente(**incidente.model_dump(), abierto=True)

    db.add(_incidente)
    try:
        db.commit()
        db.refresh(_incidente)
    except IntegrityError:
        db.rollback()
        raise exceptions.Conflict(
            detail="Error de integridad al intentar guardar el incidente."
        )

    return _incidente

def listar_incidentes(db: Session) -> list[Incidente]:
    return db.scalars(select(Incidente)).all()

# Agregar mas services para el resto de operaciones