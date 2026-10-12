from datetime import date
from typing import Protocol
from sqlalchemy.orm import Session
from src.vencimientos import schemas
from src.vencimientos.constants import CategoriaVencimiento


# El contrato que personal / equipos / documentacion / elementos de limpieza deben cumplir

# Para sumar una categoria a la vista consolidada hay que escribir un provider
# con esta interface y registrarlo abajo. No se modifica services.py, ni el
# router, ni el frontend. 
#
# Un provider solo traduce. No decide urgencia ni orden: eso es de services.py,
# para que el umbral de 15 dias sea el mismo en todas las categorias.
class ProveedorVencimientos(Protocol):
    categoria: CategoriaVencimiento

    def listar(self, db: Session, hoy: date) -> list[schemas.Vencimiento]:
        """Devuelve los vencimientos de la categoria usando `hoy` como fecha de referencia."""
        ...


# Registro de providers

# Dict indexado por categoria: garantiza que ninguna se registre dos veces, lo
# que duplicaria filas en la vista consolidada.
_REGISTRO: dict[CategoriaVencimiento, ProveedorVencimientos] = {}


def registrar(proveedor: ProveedorVencimientos) -> None:
    _REGISTRO[proveedor.categoria] = proveedor


def proveedores() -> list[ProveedorVencimientos]:
    return list(_REGISTRO.values()) # Devuelve los proveedores activos


def hay_proveedor(categoria: CategoriaVencimiento) -> bool:
    return categoria in _REGISTRO


# Provider de elementos de limpieza 
class _ProveedorElementosLimpieza:
    categoria = CategoriaVencimiento.ELEMENTO_LIMPIEZA

    def listar(self, db: Session, hoy: date) -> list[schemas.Vencimiento]:
        from src.recambios.services import listar_alertas

        vencimientos = []
        for alerta in listar_alertas(db):
            dias_restantes = (alerta.proxima_fecha - hoy).days
            vencimientos.append(
                schemas.Vencimiento(
                    id=f"{self.categoria.value}:{alerta.elemento.id}",
                    categoria=self.categoria,
                    concepto=alerta.elemento.nombre,
                    entidad="Elementos de limpieza",
                    entidad_id=alerta.elemento.id,
                    fecha_vencimiento=alerta.proxima_fecha,
                    dias_restantes=dias_restantes,
                    estado=_estado_de(dias_restantes),
                    detalle=alerta.elemento.tipo.nombre,
                    ruta_detalle=f"/elementos-limpieza?detalle={alerta.elemento.id}",
                )
            )
        return vencimientos

class _ProveedorEquipos:
    categoria = CategoriaVencimiento.EQUIPO

    def listar(self, db: Session, hoy: date) -> list[schemas.Vencimiento]:
        from src.equipos.services import listar_alertas_calibracion

        vencimientos = []
        for alerta in listar_alertas_calibracion(db):
            dias_restantes = (alerta.proxima_fecha - hoy).days
            vencimientos.append(
                schemas.Vencimiento(
                    id=f"{self.categoria.value}:{alerta.entidad_id}",
                    categoria=self.categoria,
                    concepto=alerta.entidad,
                    entidad="Equipos",
                    entidad_id=alerta.entidad_id,
                    fecha_vencimiento=alerta.proxima_fecha,
                    dias_restantes=dias_restantes,
                    estado=_estado_de(dias_restantes),
                    detalle="Calibración",
                    ruta_detalle=f"/equipos?detalle={alerta.entidad_id}",
                )
            )
        return vencimientos


class _ProveedorDocumentos:
    categoria = CategoriaVencimiento.DOCUMENTO

    def listar(self, db: Session, hoy: date) -> list[schemas.Vencimiento]:
        from src.documentos.services import listar_alertas

        vencimientos = []
        for alerta in listar_alertas(db):
            dias_restantes = (alerta.proxima_revision - hoy).days
            vencimientos.append(
                schemas.Vencimiento(
                    id=f"{self.categoria.value}:{alerta.documento.id}",
                    categoria=self.categoria,
                    concepto=alerta.documento.titulo,
                    entidad="Documentos",
                    entidad_id=alerta.documento.id,
                    fecha_vencimiento=alerta.proxima_revision,
                    dias_restantes=dias_restantes,
                    estado=_estado_de(dias_restantes),
                    detalle="Revisión",
                    ruta_detalle=f"/documentos?detalle={alerta.documento.id}",
                )
            )
        return vencimientos

class _ProveedorPersonal:
    categoria = CategoriaVencimiento.PERSONAL

    def listar(self, db: Session, hoy: date) -> list[schemas.Vencimiento]:
        from src.personal.services import listar_alertas_vencimientos

        vencimientos = []
        for alerta in listar_alertas_vencimientos(db):
            dias_restantes = (alerta.fecha_vencimiento - hoy).days
            vencimientos.append(
                schemas.Vencimiento(
                    # Una persona puede tener varios vencimientos: la clave usa el id del vencimiento
                    id=f"{self.categoria.value}:{alerta.vencimiento_id}",
                    categoria=self.categoria,
                    concepto=f"{alerta.persona} - {alerta.documento}",
                    entidad="Personal",
                    entidad_id=alerta.persona_id,
                    fecha_vencimiento=alerta.fecha_vencimiento,
                    dias_restantes=dias_restantes,
                    estado=_estado_de(dias_restantes),
                    detalle=alerta.documento,
                    ruta_detalle=f"/personal?detalle={alerta.persona_id}",
                )
            )
        return vencimientos

def _estado_de(dias_restantes: int):
    # Import diferido: services.py importa este modulo, asi que la importacion
    # tiene que ser aca adentro para no cerrar un ciclo. La regla vive una sola
    # vez, en services.calcular_estado.
    from src.vencimientos.services import calcular_estado

    return calcular_estado(dias_restantes)


# Alta al importar el modulo. 

registrar(_ProveedorElementosLimpieza())
registrar(_ProveedorEquipos())
registrar(_ProveedorDocumentos())
registrar(_ProveedorPersonal())
