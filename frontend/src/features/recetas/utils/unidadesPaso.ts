export type TipoMagnitudUnidad = "masa" | "volumen" | "otro";

export interface InfoUnidadInsumo {
  simboloBase: string;
  tipoMagnitud: TipoMagnitudUnidad;
  opcionesUnidad: string[];
  unidadDefault: string;
}

const FACTORES_MASA_A_GRAMOS: Record<string, number> = {
  kg: 1000,
  kilo: 1000,
  kilogramo: 1000,
  kilogramos: 1000,
  g: 1,
  gr: 1,
  gramo: 1,
  gramos: 1,
  mg: 0.001,
  miligramo: 0.001,
  miligramos: 0.001,
};

const FACTORES_VOLUMEN_A_ML: Record<string, number> = {
  l: 1000,
  lt: 1000,
  litro: 1000,
  litros: 1000,
  ml: 1,
  cc: 1,
  cm3: 1,
  mililitro: 1,
  mililitros: 1,
};

const normalizarUnidadMasa = (simbolo: string): string => {
  const s = simbolo.trim().toLowerCase();
  if (s.startsWith("kg") || s.startsWith("kilo")) return "kg";
  if (s.startsWith("mg") || s.startsWith("miligramo")) return "mg";
  return "g";
};

const normalizarUnidadVolumen = (simbolo: string): string => {
  const s = simbolo.trim().toLowerCase();
  if (s === "l" || s === "lt" || s.startsWith("litro")) return "L";
  return "ml";
};

export const obtenerInfoUnidadInsumo = (unidad?: {
  simbolo?: string;
  nombre?: string;
  tipo_magnitud?: string;
} | null): InfoUnidadInsumo => {
  const simboloBase = (unidad?.simbolo || unidad?.nombre || "").trim();
  const sNorm = simboloBase.toLowerCase();
  const mag = (unidad?.tipo_magnitud || "").trim().toLowerCase();

  if (mag === "masa" || sNorm in FACTORES_MASA_A_GRAMOS) {
    return {
      simboloBase,
      tipoMagnitud: "masa",
      opcionesUnidad: ["kg", "g", "mg"],
      unidadDefault: normalizarUnidadMasa(simboloBase),
    };
  }

  if (mag === "volumen" || sNorm in FACTORES_VOLUMEN_A_ML) {
    return {
      simboloBase,
      tipoMagnitud: "volumen",
      opcionesUnidad: ["L", "ml"],
      unidadDefault: normalizarUnidadVolumen(simboloBase),
    };
  }

  return {
    simboloBase,
    tipoMagnitud: "otro",
    opcionesUnidad: [],
    unidadDefault: simboloBase,
  };
};

export const convertirEntreUnidades = (
  valor: number,
  desde: string,
  hacia: string,
): number => {
  if (!Number.isFinite(valor)) return valor;
  const d = desde.trim().toLowerCase();
  const h = hacia.trim().toLowerCase();
  if (d === h) return valor;

  if (d in FACTORES_MASA_A_GRAMOS && h in FACTORES_MASA_A_GRAMOS) {
    const res = (valor * FACTORES_MASA_A_GRAMOS[d]) / FACTORES_MASA_A_GRAMOS[h];
    return Number(res.toFixed(6));
  }

  if (d in FACTORES_VOLUMEN_A_ML && h in FACTORES_VOLUMEN_A_ML) {
    const res = (valor * FACTORES_VOLUMEN_A_ML[d]) / FACTORES_VOLUMEN_A_ML[h];
    return Number(res.toFixed(6));
  }

  return valor;
};
