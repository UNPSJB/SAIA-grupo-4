from typing import Optional
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

    model_config = ConfigDict(from_attributes=True)
