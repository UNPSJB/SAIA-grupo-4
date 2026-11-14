import csv
import unicodedata
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.alimento_referencia import exceptions, schemas
from src.alimento_referencia.models import AlimentoReferencia
from src.utils.busqueda import condicion_busqueda, normalizar


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
CSV_CODIGOS = DATA_DIR / "zCodigosAlimentos.csv"
CSV_ALIMENTOS = DATA_DIR / "AlimentoyComposicion.csv"


def _a_ascii(texto: str | None) -> str | None:
    if texto is None:
        return None
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")


def _decimal_2(valor: str | float | Decimal | None) -> Decimal:
    if valor is None or valor == "":
        return Decimal("0.00")
    return Decimal(str(valor)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def listar_alimentos_referencia(
    db: Session,
    q: str | None = None,
    categoria: str | None = None,
    es_oficial_sara: bool | None = None,
    page: int = 1,
    limit: int | None = None,
) -> list[AlimentoReferencia]:
    consulta = select(AlimentoReferencia)

    if q and q.strip():
        consulta = consulta.where(
            condicion_busqueda(
                [
                    AlimentoReferencia.alimento,
                    AlimentoReferencia.codigo,
                    AlimentoReferencia.categoria,
                ],
                q,
            )
        )

    if categoria and categoria.strip():
        consulta = consulta.where(
            func.normalizar(AlimentoReferencia.categoria) == normalizar(categoria)
        )

    if es_oficial_sara is not None:
        consulta = consulta.where(AlimentoReferencia.es_oficial_sara == es_oficial_sara)

    consulta = consulta.order_by(AlimentoReferencia.alimento.asc(), AlimentoReferencia.id.asc())

    if limit is not None:
        offset = max(0, (page - 1) * limit)
        consulta = consulta.offset(offset).limit(limit)

    return db.scalars(consulta).all()


def listar_categorias_referencia(db: Session) -> list[str]:
    consulta = (
        select(AlimentoReferencia.categoria)
        .where(AlimentoReferencia.categoria.isnot(None), AlimentoReferencia.categoria != "")
        .distinct()
        .order_by(AlimentoReferencia.categoria.asc())
    )
    return db.scalars(consulta).all()


def leer_alimento_referencia(db: Session, alimento_id: int) -> AlimentoReferencia:
    alimento = db.scalar(select(AlimentoReferencia).where(AlimentoReferencia.id == alimento_id))
    if not alimento:
        raise exceptions.AlimentoReferenciaNoExiste()
    return alimento


def crear_alimento_referencia(
    db: Session, data: schemas.AlimentoReferenciaCreate
) -> AlimentoReferencia:
    nombre_limpio = data.alimento.strip()
    existente = db.scalar(
        select(AlimentoReferencia).where(
            func.normalizar(AlimentoReferencia.alimento) == normalizar(nombre_limpio)
        )
    )
    if existente:
        raise exceptions.AlimentoReferenciaDuplicado()

    datos = data.model_dump()
    datos["alimento"] = nombre_limpio
    datos["codigo"] = data.codigo.strip() if data.codigo and data.codigo.strip() else None
    datos["categoria"] = data.categoria.strip() if data.categoria and data.categoria.strip() else None
    datos["es_oficial_sara"] = False

    db_alimento = AlimentoReferencia(**datos)
    db.add(db_alimento)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_alimento)
    return db_alimento


def modificar_alimento_referencia(
    db: Session, alimento_id: int, data: schemas.AlimentoReferenciaUpdate
) -> AlimentoReferencia:
    db_alimento = leer_alimento_referencia(db, alimento_id)
    if db_alimento.es_oficial_sara:
        raise exceptions.AlimentoOficialSaraNoModificable()

    update_data = data.model_dump(exclude_unset=True)
    if "alimento" in update_data and update_data["alimento"] is not None:
        nombre_limpio = update_data["alimento"].strip()
        duplicado = db.scalar(
            select(AlimentoReferencia).where(
                func.normalizar(AlimentoReferencia.alimento) == normalizar(nombre_limpio),
                AlimentoReferencia.id != alimento_id,
            )
        )
        if duplicado:
            raise exceptions.AlimentoReferenciaDuplicado()
        update_data["alimento"] = nombre_limpio

    for campo, valor in update_data.items():
        setattr(db_alimento, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    db.refresh(db_alimento)
    return db_alimento


def eliminar_alimento_referencia(db: Session, alimento_id: int) -> AlimentoReferencia:
    db_alimento = leer_alimento_referencia(db, alimento_id)
    if db_alimento.es_oficial_sara:
        raise exceptions.AlimentoOficialSaraNoModificable()

    db.delete(db_alimento)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado()
    return db_alimento


def sembrar_alimentos_sara(
    db: Session, normalizar_ascii: bool = False, commit: bool = True
) -> int:
    """Carga idempotente de los 379 alimentos oficiales de SARA 2 desde CSV."""
    if not CSV_ALIMENTOS.is_file():
        return 0

    codigos_existentes = set(
        db.scalars(
            select(AlimentoReferencia.codigo).where(
                AlimentoReferencia.es_oficial_sara.is_(True),
                AlimentoReferencia.codigo.isnot(None),
            )
        ).all()
    )

    categorias_por_letra: dict[str, str] = {}
    if CSV_CODIGOS.is_file():
        with CSV_CODIGOS.open("r", encoding="utf-8", newline="") as f:
            for fila in csv.DictReader(f):
                letra = (fila.get("Letra") or "").strip().upper()
                detalle = (fila.get("Detalle") or "").strip()
                if letra and detalle:
                    categorias_por_letra[letra] = (
                        _a_ascii(detalle) if normalizar_ascii else detalle
                    )

    nuevos: list[AlimentoReferencia] = []
    with CSV_ALIMENTOS.open("r", encoding="utf-8", newline="") as f:
        for fila in csv.DictReader(f):
            codigo = (fila.get("Codigo") or "").strip()
            if not codigo or codigo in codigos_existentes:
                continue

            nombre_alimento = (fila.get("Alimento") or "").strip()
            if normalizar_ascii:
                nombre_alimento = _a_ascii(nombre_alimento) or nombre_alimento

            letra = codigo[:1].upper()
            categoria = categorias_por_letra.get(letra)

            nuevos.append(
                AlimentoReferencia(
                    codigo=codigo,
                    alimento=nombre_alimento,
                    categoria=categoria,
                    energia_kcal=_decimal_2(fila.get("E")),
                    proteinas_g=_decimal_2(fila.get("Prot")),
                    grasas_totales_g=_decimal_2(fila.get("Lip")),
                    carbohidratos_g=_decimal_2(fila.get("HCdisp")),
                    fibra_g=_decimal_2(fila.get("Fibra")),
                    sodio_mg=_decimal_2(fila.get("Na")),
                    grasas_saturadas_g=_decimal_2(fila.get("AGSat")),
                    es_oficial_sara=True,
                )
            )
            codigos_existentes.add(codigo)

    if nuevos:
        db.add_all(nuevos)
        if commit:
            db.commit()
        else:
            db.flush()

    return len(nuevos)
