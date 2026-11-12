from typing import List
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.insumos.models import Insumo
from src.insumos import schemas, exceptions
from src.unidad_medida.models import UnidadMedida
from src.unidad_medida.exceptions import UnidadMedidaReactivar
from src.recetas.models import Receta, PasoReceta, PasoInsumo
from src.recetas.constants import EstadoReceta
from src.utils.busqueda import condicion_busqueda


# operaciones CRUD para Insumo

def _validar_equivalencias_magnitud(
    tipo_magnitud: str,
    densidad_g_ml: float | None,
    peso_unitario_g: float | None,
) -> None:
    magnitud = (tipo_magnitud or "").strip().lower()

    if magnitud == "volumen":
        if peso_unitario_g is not None:
            raise exceptions.PesoUnitarioSoloCantidad()
    elif magnitud == "cantidad":
        if densidad_g_ml is not None:
            raise exceptions.DensidadSoloVolumen()
    elif magnitud == "masa":
        if densidad_g_ml is not None or peso_unitario_g is not None:
            raise exceptions.EquivalenciaNoAplicaMasa()


def crear_insumo(db: Session, insumo: schemas.InsumoCreate) -> schemas.Insumo:
    # Verifica que no exista un insumo con el mismo nombre
    db_insumo_existente = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre))
    if db_insumo_existente:
        if db_insumo_existente.disponible:
            raise exceptions.NombreDuplicado()
        raise exceptions.NombreDuplicadoInactivo(insumo_id=db_insumo_existente.id)

    # Verifica que la unidad de medida exista y este activa
    db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == insumo.unidad_medida_id))
    if db_unidad is None or not db_unidad.disponible:
        raise UnidadMedidaReactivar()

    # Validar que los campos de equivalencia correspondan a la magnitud de la unidad
    _validar_equivalencias_magnitud(
        db_unidad.tipo_magnitud,
        insumo.densidad_g_ml,
        insumo.peso_unitario_g,
    )

    # Crea el insumo y lo sube a la db siempre con disponible=True
    datos_creacion = insumo.model_dump()
    datos_creacion["disponible"] = True
    db_insumo = Insumo(**datos_creacion)
    db.add(db_insumo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise exceptions.ErrorInesperado() 
    db.refresh(db_insumo)
    return db_insumo


def leer_insumo(db: Session, insumo_id: int) -> schemas.Insumo:
    # Verificamos que el insumo exista en la base
    db_insumo = db.scalar(select(Insumo).where(Insumo.id == insumo_id))
    if not db_insumo:
        raise exceptions.InsumoNoExiste()

    # Si existe el insumo lo retorna
    return db_insumo


def modificar_insumo(db: Session, insumo_id: int, insumo: schemas.InsumoUpdate) -> schemas.InsumoUpdate:
    db_insumo = leer_insumo(db, insumo_id)
    update_data = insumo.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        # Verifica que no exista un insumo con el mismo nombre
        db_insumo_duplicado = db.scalar(select(Insumo).where(Insumo.nombre == insumo.nombre, Insumo.id != insumo_id))
        if db_insumo_duplicado:
            raise exceptions.NombreDuplicado()

    if "disponible" in update_data:
        if db_insumo.disponible == insumo.disponible:
            if insumo.disponible:
                raise exceptions.InsumoActivo()
            else:
                raise exceptions.InsumoBaja()

        if not insumo.disponible:
            receta_activa = db.scalar(
                select(Receta)
                .join(PasoReceta, PasoReceta.receta_id == Receta.id)
                .join(PasoInsumo, PasoInsumo.paso_id == PasoReceta.id)
                .where(
                    PasoInsumo.insumo_id == insumo_id,
                    Receta.estado == EstadoReceta.ACTIVA,
                )
            )
            if receta_activa:
                raise exceptions.InsumoConRecetaActiva(
                    insumo_nombre=db_insumo.nombre,
                    receta_nombre=receta_activa.nombre_receta,
                )

        if insumo.disponible:
            # Al dar de alta, la unidad de medida asociada debe existir y estar activa
            unidad_id = update_data.get("unidad_medida_id", db_insumo.unidad_medida_id)
            db_unidad = db.scalar(select(UnidadMedida).where(UnidadMedida.id == unidad_id))
            if db_unidad is None or not db_unidad.disponible:
                raise UnidadMedidaReactivar()

    # Validar equivalencias de magnitud al modificar
    if any(k in update_data for k in ("unidad_medida_id", "densidad_g_ml", "peso_unitario_g")):
        target_unidad_id = update_data.get("unidad_medida_id", db_insumo.unidad_medida_id)
        unidad_obj = db.scalar(select(UnidadMedida).where(UnidadMedida.id == target_unidad_id))
        if unidad_obj:
            magnitud_nueva = (unidad_obj.tipo_magnitud or "").strip().lower()

            # Si cambió la unidad a otra magnitud distinta y no enviaron explícitamente densidad/peso,
            # limpiamos a None los campos incompatibles en lugar de arrastrar el valor anterior
            if "unidad_medida_id" in update_data and update_data["unidad_medida_id"] != db_insumo.unidad_medida_id:
                if magnitud_nueva != "volumen" and "densidad_g_ml" not in update_data:
                    update_data["densidad_g_ml"] = None
                if magnitud_nueva != "cantidad" and "peso_unitario_g" not in update_data:
                    update_data["peso_unitario_g"] = None

            densidad_efectiva = update_data.get("densidad_g_ml", db_insumo.densidad_g_ml)
            peso_efectivo = update_data.get("peso_unitario_g", db_insumo.peso_unitario_g)

            _validar_equivalencias_magnitud(
                unidad_obj.tipo_magnitud,
                densidad_efectiva,
                peso_efectivo,
            )

    # Validar atributos de aditivo (clase funcional e INS)
    categoria_efectiva = (update_data.get("categoria", db_insumo.categoria) or "").strip().lower()
    if categoria_efectiva == schemas.Categoria.ADITIVO.value:
        # Si sigue o pasa a ser aditivo
        cf_efectiva = update_data.get("clase_funcional", db_insumo.clase_funcional)
        cf_str = (cf_efectiva or "").strip()
        if not cf_str:
            raise exceptions.ClaseFuncionalRequeridaAditivo()

        ins_efectivo = update_data.get("numero_ins", db_insumo.numero_ins)
        ins_str = (ins_efectivo or "").strip()
        if cf_str.lower() not in schemas.Constantes.CLASES_SIN_INS_OBLIGATORIO:
            if not ins_str:
                raise exceptions.NumeroInsRequeridoAditivo()
    else:
        # Si no es aditivo y cambió de categoría, limpiamos los campos de aditivo
        if "categoria" in update_data and update_data["categoria"] != db_insumo.categoria:
            update_data["clase_funcional"] = None
            update_data["numero_ins"] = None
        else:
            # Si intentan mandar clase_funcional o numero_ins para un insumo no-aditivo
            cf_val = update_data.get("clase_funcional")
            ins_val = update_data.get("numero_ins")
            if (cf_val and cf_val.strip()) or (ins_val and ins_val.strip()):
                raise exceptions.AtributosAditivoNoAplican()

    if update_data:
        # Modifica el insumo y lo sube a la db
        db.execute(update(Insumo).where(Insumo.id == insumo_id).values(**update_data))        

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise exceptions.ErrorInesperado()

        db.refresh(db_insumo)
    return db_insumo


def eliminar_insumo(db: Session, insumo_id: int, ) -> schemas.InsumoDelete:
    # Verificamos que el insumo exista
    insumo = schemas.InsumoUpdate(disponible=False)
    db_insumo = modificar_insumo(db, insumo_id, insumo)

    return db_insumo


def listar_insumos(
    db: Session,
    busqueda: str | None = None,
    disponible: bool | None = None,
):
    consulta = select(Insumo)

    # Búsqueda libre: coincidencia parcial, sin mayúsculas ni acentos, en las
    # columnas de texto visibles (nombre del insumo y unidad de medida).
    if busqueda and busqueda.strip():
        consulta = consulta.join(
            UnidadMedida, Insumo.unidad_medida_id == UnidadMedida.id
        ).where(condicion_busqueda(
            [Insumo.nombre, Insumo.categoria, UnidadMedida.nombre, UnidadMedida.simbolo],
            busqueda,
        ))

    if disponible is not None:
        consulta = consulta.where(Insumo.disponible.is_(disponible))

    return db.scalars(consulta).all()