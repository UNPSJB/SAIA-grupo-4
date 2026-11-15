class ErrorCode:
    ARCHIVO_LOGO_INVALIDO = "El logo debe ser una imagen en formato PNG, JPG o WebP."
    ARCHIVO_LOGO_MUY_GRANDE = "El tamaño del logo no puede superar los 2 MB."
    CUIT_INVALIDO = "El CUIT debe contener exactamente 11 dígitos numéricos."

class Constantes:
    NOMBRE_DEFECTO = "SAIA-4"
    MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB
    EXTENSIONES_PERMITIDAS = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
    }

class EstadoVersionNormativa:
    VIGENTE = "VIGENTE"
    HISTORICA = "HISTORICA"


class CategoriaAlimentoNormativa:
    ALIMENTO = "ALIMENTO"
    BEBIDA = "BEBIDA"


class NutrienteCritico:
    AZUCARES_ANADIDOS = "AZUCARES_ANADIDOS"
    GRASAS_TOTALES = "GRASAS_TOTALES"
    GRASAS_SATURADAS = "GRASAS_SATURADAS"
    SODIO = "SODIO"
    CALORIAS = "CALORIAS"
    EDULCORANTES = "EDULCORANTES"
    CAFEINA = "CAFEINA"


# Semilla oficial Ley 27.642 - Decreto 151/2022 (Segunda Etapa ANMAT)
NORMATIVA_INICIAL_NOMBRE = "Ley 27.642 - Decreto 151/2022 (Etapa 2)"

REGLAS_INICIALES_LEY_27642 = [
    # --- ALIMENTOS SÓLIDOS ---
    {
        "nutriente_critico": NutrienteCritico.AZUCARES_ANADIDOS,
        "leyenda_sello": "EXCESO EN AZÚCARES",
        "categoria": CategoriaAlimentoNormativa.ALIMENTO,
        "valor_umbral": 10.0,
        "unidad_umbral": "% del total de energía (kcal)",
        "condicion": ">= 10% del total de energía proveniente de azúcares añadidos",
    },
    {
        "nutriente_critico": NutrienteCritico.GRASAS_TOTALES,
        "leyenda_sello": "EXCESO EN GRASAS TOTALES",
        "categoria": CategoriaAlimentoNormativa.ALIMENTO,
        "valor_umbral": 30.0,
        "unidad_umbral": "% del total de energía (kcal)",
        "condicion": ">= 30% del total de energía proveniente de grasas totales",
    },
    {
        "nutriente_critico": NutrienteCritico.GRASAS_SATURADAS,
        "leyenda_sello": "EXCESO EN GRASAS SATURADAS",
        "categoria": CategoriaAlimentoNormativa.ALIMENTO,
        "valor_umbral": 10.0,
        "unidad_umbral": "% del total de energía (kcal)",
        "condicion": ">= 10% del total de energía proveniente de grasas saturadas",
    },
    {
        "nutriente_critico": NutrienteCritico.SODIO,
        "leyenda_sello": "EXCESO EN SODIO",
        "categoria": CategoriaAlimentoNormativa.ALIMENTO,
        "valor_umbral": 300.0,
        "unidad_umbral": "mg cada 100 g",
        "condicion": ">= 1 mg por cada 1 kcal o >= 300 mg cada 100 g de alimento",
    },
    {
        "nutriente_critico": NutrienteCritico.CALORIAS,
        "leyenda_sello": "EXCESO EN CALORÍAS",
        "categoria": CategoriaAlimentoNormativa.ALIMENTO,
        "valor_umbral": 275.0,
        "unidad_umbral": "kcal cada 100 g",
        "condicion": ">= 275 kcal cada 100 g (solo si presenta exceso de azúcares o grasas)",
    },
    # --- BEBIDAS ANALCOHÓLICAS (LÍQUIDOS) ---
    {
        "nutriente_critico": NutrienteCritico.AZUCARES_ANADIDOS,
        "leyenda_sello": "EXCESO EN AZÚCARES",
        "categoria": CategoriaAlimentoNormativa.BEBIDA,
        "valor_umbral": 10.0,
        "unidad_umbral": "% del total de energía (kcal)",
        "condicion": ">= 10% del total de energía (o >= 5% si no aporta otros nutrientes)",
    },
    {
        "nutriente_critico": NutrienteCritico.GRASAS_TOTALES,
        "leyenda_sello": "EXCESO EN GRASAS TOTALES",
        "categoria": CategoriaAlimentoNormativa.BEBIDA,
        "valor_umbral": 30.0,
        "unidad_umbral": "% del total de energía (kcal)",
        "condicion": ">= 30% del total de energía proveniente de grasas totales",
    },
    {
        "nutriente_critico": NutrienteCritico.GRASAS_SATURADAS,
        "leyenda_sello": "EXCESO EN GRASAS SATURADAS",
        "categoria": CategoriaAlimentoNormativa.BEBIDA,
        "valor_umbral": 10.0,
        "unidad_umbral": "% del total de energía (kcal)",
        "condicion": ">= 10% del total de energía proveniente de grasas saturadas",
    },
    {
        "nutriente_critico": NutrienteCritico.SODIO,
        "leyenda_sello": "EXCESO EN SODIO",
        "categoria": CategoriaAlimentoNormativa.BEBIDA,
        "valor_umbral": 40.0,
        "unidad_umbral": "mg cada 100 ml",
        "condicion": ">= 40 mg cada 100 ml (en bebidas sin aporte energético)",
    },
    {
        "nutriente_critico": NutrienteCritico.CALORIAS,
        "leyenda_sello": "EXCESO EN CALORÍAS",
        "categoria": CategoriaAlimentoNormativa.BEBIDA,
        "valor_umbral": 25.0,
        "unidad_umbral": "kcal cada 100 ml",
        "condicion": ">= 25 kcal cada 100 ml (solo si presenta exceso de azúcares o grasas)",
    },
    # --- LEYENDAS PRECAUTORIAS ---
    {
        "nutriente_critico": NutrienteCritico.EDULCORANTES,
        "leyenda_sello": "CONTIENE EDULCORANTES, NO RECOMENDABLE EN NIÑOS/AS",
        "categoria": CategoriaAlimentoNormativa.ALIMENTO,
        "valor_umbral": 1.0,
        "unidad_umbral": "presencia (1 = aplica por adición)",
        "condicion": "Adición de edulcorantes calóricos o no calóricos en la formulación",
    },
    {
        "nutriente_critico": NutrienteCritico.CAFEINA,
        "leyenda_sello": "CONTIENE CAFEÍNA. EVITAR EN NIÑOS/AS",
        "categoria": CategoriaAlimentoNormativa.BEBIDA,
        "valor_umbral": 1.0,
        "unidad_umbral": "presencia (1 = aplica por adición)",
        "condicion": "Adición de cafeína en la formulación",
    },
]