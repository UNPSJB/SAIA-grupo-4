from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.incidentes import schemas, exceptions
from src.incidentes.models import Incidente

from src.personal import schemas as p_schemas, exceptions as p_exceptions
from src.personal.models import Persona

def crear_incidente(db: Session, incidente: schemas.IncidenteCreate) -> Incidente:

    if incidente.reportante_id is None:
        raise exceptions.ReportanteNoAsignado()
    
    reportante = db.scalar(
        select(Persona).where(
            Persona.id == incidente.reportante_id
        )
    )

    if reportante is None:
        raise exceptions.ReportanteNoEncontrado()

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