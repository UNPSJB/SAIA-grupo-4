from enum import Enum


class EstadoReceta(str, Enum):
    BORRADOR = "BORRADOR"
    ACTIVA = "ACTIVA"
    ARCHIVADA = "ARCHIVADA"


class ErrorCode:
    # Errores de Receta
    RECETA_NO_ENCONTRADA = "La receta no fue encontrada."
    RECETA_NO_ES_BORRADOR = "La acción requiere que la receta se encuentre en estado BORRADOR."
    RECETA_NO_ACTIVA = "La acción requiere que la receta se encuentre en estado ACTIVA."
    RECETA_ARCHIVADA_NO_EDITABLE = "No se puede modificar una receta en estado ARCHIVADA."
    RECETA_CON_LOTES_NO_EDITABLE = "No se puede modificar la receta porque tiene lotes asociados."
    RECETA_NO_EDITABLE = "No se puede modificar la receta en su estado actual."
    RECETA_SIN_PASOS = "No se puede activar una receta que no tiene pasos asignados."
    CODIGO_RECETA_DUPLICADO = "El código de receta ya existe."
    PRODUCTO_INVALIDO = "El producto indicado no es válido."
    
    # Errores de Pasos de Receta
    PASO_NO_ENCONTRADO = "El paso de la receta no fue encontrado."
    PASO_INACTIVO = "El paso se encuentra dado de baja. Para modificarlo, debe reactivarlo."
    BAJA_PASO_POR_PATCH_NO_PERMITIDA = "No está permitido dar de baja un paso mediante edición (PATCH). Utilice el endpoint de eliminación (DELETE) correspondiente."
    RECURSO_ASOCIADO_INACTIVO = "El recurso que intenta asociar se encuentra inactivo. Debe reactivarlo para poder asignarlo al paso."
    NUMERO_ORDEN_DUPLICADO = "Ya existe un paso con el número de orden ingresado en esta receta."

    # Errores de Orden Manual (Declaración CAA)
    ORDEN_MANUAL_INSUMOS_INVALIDOS = "La lista de IDs para orden manual no coincide exactamente con los insumos presentes en la receta."
    ORDEN_MANUAL_FRONTERA_INVALIDA = "Un aditivo no puede preceder a una materia prima según la normativa CAA (Cap. V). No se permite cruzar la frontera entre zonas."
    ORDEN_MANUAL_PROPORCION_INVALIDA = "El orden de las materias primas debe ser estrictamente decreciente por porcentaje. Solo se permite reordenar materias primas con idéntica proporción."
    ORDEN_MANUAL_CLASES_FRAGMENTADAS = "Los aditivos deben permanecer estrictamente agrupados por su clase funcional. No se permite fragmentar una clase funcional."

class TipoRecurso:
    EQUIPO = "Equipo"
    INSUMO = "Insumo"


class NutricionConstantes:
    BASE_NUTRIENTE_INSUMO_G = 100.0
    BASE_PRODUCTO_TERMINADO_G = 100.0
    FACTOR_CONVERSION_KJ_DEFECTO = 4.184
    VDR_ENERGIA_ESTANDAR_KCAL = 2000
    VDR_ENERGIA_ESTANDAR_KJ = 8400
    TEXTO_NO_SIG_CERO = "0"
    CODIGO_VALOR_ENERGETICO = "valor_energetico"
    CAMPOS_MINIMOS_ADITIVO = ("valor_energetico_kcal", "sodio_mg")
    PLANTILLA_LEYENDA_VD = (
        "* % Valores Diarios con base a una dieta de {kcal} kcal u {kj} kJ. "
        "Sus valores diarios pueden ser mayores o menores dependiendo de sus necesidades energéticas."
    )
    MAPA_PARAMETRO_A_CAMPO_INSUMO = {
        "valor_energetico": "valor_energetico_kcal",
        "carbohidratos": "carbohidratos_g",
        "azucares_totales": "azucares_totales_g",
        "azucares_anadidos": "azucares_anadidos_g",
        "proteinas": "proteinas_g",
        "grasas_totales": "grasas_totales_g",
        "grasas_saturadas": "grasas_saturadas_g",
        "grasas_trans": "grasas_trans_g",
        "fibra": "fibra_g",
        "sodio": "sodio_mg",
    }
    ETIQUETAS_CAMPOS_INSUMO = {
        "valor_energetico_kcal": "Valor energético (kcal)",
        "carbohidratos_g": "Carbohidratos (g)",
        "azucares_totales_g": "Azúcares totales (g)",
        "azucares_anadidos_g": "Azúcares añadidos (g)",
        "proteinas_g": "Proteínas (g)",
        "grasas_totales_g": "Grasas totales (g)",
        "grasas_saturadas_g": "Grasas saturadas (g)",
        "grasas_trans_g": "Grasas trans (g)",
        "fibra_g": "Fibra alimentaria (g)",
        "sodio_mg": "Sodio (mg)",
    }