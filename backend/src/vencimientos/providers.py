from datetime import date
from typing import Protocol
from sqlalchemy.orm import Session
from src.vencimientos import schemas
from constants import CategoriaVencimiento


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


def _estado_de(dias_restantes: int):
    # Import diferido para que constants no dependa de nada de este modulo.
    from src.vencimientos.constants import Constantes, EstadoVencimiento

    if dias_restantes < 0:
        return EstadoVencimiento.VENCIDO
    if dias_restantes <= Constantes.DIAS_AVISO_PROXIMO:
        return EstadoVencimiento.PROXIMO
    return EstadoVencimiento.VIGENTE


# Alta al importar el modulo. 

registrar(_ProveedorElementosLimpieza())
# registrar(_ProveedorEquipos())
# registrar(_ProveedorDocumentos())
# registrar(_ProveedorPersonal())