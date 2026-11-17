from src.exceptions import BadRequest, NotFound
from src.configuracion_nutricional.constants import ErrorCode


class ParametroNutricionalNoEncontrado(NotFound):
    def __init__(self, codigo: str):
        super().__init__(detail=ErrorCode.PARAMETRO_NO_ENCONTRADO.format(codigo=codigo))


class VdrNoAplica(BadRequest):
    def __init__(self, codigo: str):
        super().__init__(detail=ErrorCode.VDR_NO_APLICA.format(codigo=codigo))


class FactorKjSoloEnergia(BadRequest):
    def __init__(self):
        super().__init__(detail=ErrorCode.FACTOR_KJ_SOLO_ENERGIA)
