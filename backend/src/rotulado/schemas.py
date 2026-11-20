from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field
from src.rotulado.constants import DictamenAplicabilidad


class AplicabilidadFrontalIn(BaseModel):
    override_azucares_agregados: Optional[bool] = Field(
        default=None, description="Override manual para azúcares agregados"
    )
    override_grasas_agregadas: Optional[bool] = Field(
        default=None, description="Override manual para grasas agregadas"
    )
    override_sodio_agregado: Optional[bool] = Field(
        default=None, description="Override manual para sodio agregado"
    )
    override_edulcorantes: Optional[bool] = Field(
        default=None, description="Override manual para presencia de edulcorantes"
    )
    override_cafeina: Optional[bool] = Field(
        default=None, description="Override manual para presencia de cafeína"
    )
    restablecer_automatico: bool = Field(
        default=False, description="Si es True, elimina todos los overrides y vuelve al cálculo automático"
    )


class AplicabilidadFrontalOut(BaseModel):
    receta_id: int
    codigo_receta: str
    producto_id: int
    producto_nombre: str
    envasado_ausencia_cliente: bool

    # Detección automática desde insumos y aditivos
    calculado_azucares_agregados: bool
    calculado_grasas_agregadas: bool
    calculado_sodio_agregado: bool
    calculado_edulcorantes: bool
    calculado_cafeina: bool

    # Overrides manuales guardados
    override_azucares_agregados: Optional[bool] = None
    override_grasas_agregadas: Optional[bool] = None
    override_sodio_agregado: Optional[bool] = None
    override_edulcorantes: Optional[bool] = None
    override_cafeina: Optional[bool] = None
    es_aplicabilidad_forzada_manualmente: bool = False

    # Valores efectivos combinados (automático o manual si existe)
    tiene_azucares_agregados: bool
    tiene_grasas_agregadas: bool
    tiene_sodio_agregado: bool
    contiene_edulcorantes: bool
    contiene_cafeina: bool

    # Dictamen legal
    aplica_rotulado_frontal: bool
    dictamen: DictamenAplicabilidad
    dictamen_titulo: str
    motivo: str
    version_normativa: str
    puede_editar_overrides: bool = True
    modulo_octogonos_activo: bool = True

    model_config = ConfigDict(from_attributes=True)


class NormativaRotuladoOut(BaseModel):
    id: int
    codigo_normativa: str
    nombre: str
    version: str
    activa: bool
    requiere_envasado_ausencia_cliente: bool
    evalua_azucares_agregados: bool
    evalua_grasas_agregadas: bool
    evalua_sodio_agregado: bool
    evalua_edulcorantes: bool
    evalua_cafeina: bool
    descripcion: Optional[str] = None
    fecha_actualizacion: datetime

    model_config = ConfigDict(from_attributes=True)


class NormativaRotuladoUpdateIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=120)
    version: str = Field(min_length=1, max_length=50)
    requiere_envasado_ausencia_cliente: bool
    evalua_azucares_agregados: bool
    evalua_grasas_agregadas: bool
    evalua_sodio_agregado: bool
    evalua_edulcorantes: bool
    evalua_cafeina: bool
    descripcion: Optional[str] = None


class PasoMemoriaCalculoOut(BaseModel):
    codigo: str
    nutriente_etiqueta: str
    se_evalua: bool
    motivo_evaluacion: str
    valor_tabla_100: Optional[float] = None
    unidad_tabla: str
    formula_aplicada: Optional[str] = None
    calculo_sustituido: Optional[str] = None
    valor_obtenido: Optional[float] = None
    unidad_obtenida: Optional[str] = None
    umbral_normativo: str
    supera_umbral: bool
    sello_resultante: Optional[str] = None


class SelloAdvertenciaOut(BaseModel):
    codigo: str
    texto: str
    tipo: Literal["OCTOGONO"] = "OCTOGONO"


class LeyendaPrecautoriaOut(BaseModel):
    codigo: str
    texto: str
    tipo: Literal["LEYENDA"] = "LEYENDA"


class SellosAdvertenciaOut(BaseModel):
    receta_id: int
    codigo_receta: str
    producto_id: int
    producto_nombre: str
    es_liquido: bool
    base_calculo: str
    dictamen_aplicabilidad: DictamenAplicabilidad
    aplica_evaluacion_sellos: bool
    es_calculable: bool
    mensaje_bloqueo: Optional[str] = None
    valor_energetico_100: Optional[float] = None
    sellos: list[SelloAdvertenciaOut] = []
    leyendas_precautorias: list[LeyendaPrecautoriaOut] = []
    memoria_calculo: list[PasoMemoriaCalculoOut] = []
    version_normativa: str
    fecha_vigencia_normativa: datetime

    model_config = ConfigDict(from_attributes=True)
