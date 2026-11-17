from datetime import datetime
from decimal import Decimal
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.configuracion_nutricional import exceptions, schemas
from src.configuracion_nutricional.constants import PARAMETROS_NUTRICIONALES_DEFECTO
from src.configuracion_nutricional.models import ParametroNutricional


def _normalizar_ascii(texto: str) -> str:
    return (
        unicodedata.normalize("NFKD", texto)
        .encode("ascii", "ignore")
        .decode("ascii")
    )


def _construir_parametro_desde_defecto(data: dict, normalizar_ascii: bool = False) -> ParametroNutricional:
    etiqueta = _normalizar_ascii(data["nombre_etiqueta"]) if normalizar_ascii else data["nombre_etiqueta"]
    return ParametroNutricional(
        codigo_nutriente=data["codigo_nutriente"],
        nombre_etiqueta=etiqueta,
        unidad=data["unidad"],
        orden=data["orden"],
        nivel_indentacion=data["nivel_indentacion"],
        permite_vdr=data["permite_vdr"],
        vdr=Decimal(data["vdr"]) if data["vdr"] is not None else None,
        decimales=data["decimales"],
        umbral_no_significativo=(
            Decimal(data["umbral_no_significativo"])
            if data["umbral_no_significativo"] is not None
            else None
        ),
        texto_no_significativo=data["texto_no_significativo"],
        factor_conversion_kj=(
            Decimal(data["factor_conversion_kj"])
            if data["factor_conversion_kj"] is not None
            else None
        ),
    )


def inicializar_configuracion_nutricional(
    db: Session, normalizar_ascii: bool = False
) -> list[ParametroNutricional]:
    """Crea los parámetros nutricionales normativos CAA / Mercosur faltantes de forma idempotente."""
    existentes = {
        p.codigo_nutriente: p
        for p in db.scalars(select(ParametroNutricional)).all()
    }
    creados = False
    for data in PARAMETROS_NUTRICIONALES_DEFECTO:
        if data["codigo_nutriente"] not in existentes:
            db.add(_construir_parametro_desde_defecto(data, normalizar_ascii=normalizar_ascii))
            creados = True

    if creados:
        db.commit()

    return listar_parametros_nutricionales(db)


def listar_parametros_nutricionales(db: Session) -> list[ParametroNutricional]:
    """Lista los parámetros nutricionales ordenados según el rótulo normativo."""
    parametros = list(
        db.scalars(
            select(ParametroNutricional).order_by(ParametroNutricional.orden.asc())
        ).all()
    )
    if not parametros:
        return inicializar_configuracion_nutricional(db)
    return parametros


def actualizar_parametros_nutricionales(
    db: Session,
    payload: schemas.ConfiguracionNutricionalUpdateIn,
    usuario_id: int | None = None,
) -> list[ParametroNutricional]:
    """Actualiza VDR, decimales, umbrales y factor de conversión kJ de los parámetros nutricionales."""
    existentes = {
        p.codigo_nutriente: p
        for p in listar_parametros_nutricionales(db)
    }
    ahora = datetime.now()

    for item in payload.parametros:
        param = existentes.get(item.codigo_nutriente)
        if not param:
            raise exceptions.ParametroNutricionalNoEncontrado(item.codigo_nutriente)

        if not param.permite_vdr and item.vdr is not None:
            raise exceptions.VdrNoAplica(item.codigo_nutriente)

        if item.codigo_nutriente != "valor_energetico" and item.factor_conversion_kj is not None:
            raise exceptions.FactorKjSoloEnergia()

        param.vdr = item.vdr if param.permite_vdr else None
        param.decimales = item.decimales
        param.umbral_no_significativo = item.umbral_no_significativo
        param.texto_no_significativo = (
            item.texto_no_significativo.strip()
            if item.texto_no_significativo is not None and item.texto_no_significativo.strip()
            else None
        )
        if item.codigo_nutriente == "valor_energetico":
            param.factor_conversion_kj = item.factor_conversion_kj
        param.fecha_modificacion = ahora
        param.modificado_por_id = usuario_id

    db.commit()
    return listar_parametros_nutricionales(db)


def restaurar_parametros_defecto(
    db: Session,
    usuario_id: int | None = None,
) -> list[ParametroNutricional]:
    """Restaura todos los parámetros nutricionales a los valores CAA / Mercosur por defecto."""
    existentes = {
        p.codigo_nutriente: p
        for p in db.scalars(select(ParametroNutricional)).all()
    }
    ahora = datetime.now()
    for data in PARAMETROS_NUTRICIONALES_DEFECTO:
        codigo = data["codigo_nutriente"]
        param = existentes.get(codigo)
        if not param:
            nuevo = _construir_parametro_desde_defecto(data)
            nuevo.fecha_modificacion = ahora
            nuevo.modificado_por_id = usuario_id
            db.add(nuevo)
            continue

        param.nombre_etiqueta = data["nombre_etiqueta"]
        param.unidad = data["unidad"]
        param.orden = data["orden"]
        param.nivel_indentacion = data["nivel_indentacion"]
        param.permite_vdr = data["permite_vdr"]
        param.vdr = Decimal(data["vdr"]) if data["vdr"] is not None else None
        param.decimales = data["decimales"]
        param.umbral_no_significativo = (
            Decimal(data["umbral_no_significativo"])
            if data["umbral_no_significativo"] is not None
            else None
        )
        param.texto_no_significativo = data["texto_no_significativo"]
        param.factor_conversion_kj = (
            Decimal(data["factor_conversion_kj"])
            if data["factor_conversion_kj"] is not None
            else None
        )
        param.fecha_modificacion = ahora
        param.modificado_por_id = usuario_id

    db.commit()
    return listar_parametros_nutricionales(db)
