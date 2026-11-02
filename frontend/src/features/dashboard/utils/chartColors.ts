// Utilidades para asignar colores a los gráficos del dashboard
// Los colores se asignan desde el frontend según el significado del estado

// Mapeo de palabras clave a colores semánticos
// Próximos a vencer y pendientes usan amarillo para mejor visibilidad
const COLOR_KEYWORDS: Array<{ keywords: string[]; color: string }> = [
  { keywords: ["vencido"], color: "#E53E3E" }, // Rojo - Requiere atención inmediata
  { keywords: ["próximo", "proximo"], color: "#ECC94B" }, // Amarillo - Próximos a vencer
  { keywords: ["vigente"], color: "#38A169" }, // Verde - En regla
  { keywords: ["cerrado"], color: "#38A169" }, // Verde - Cerrados
  { keywords: ["abierto"], color: "#E53E3E" }, // Rojo - Abiertos
  { keywords: ["completada"], color: "#38A169" }, // Verde - Completadas
  { keywords: ["no realizada"], color: "#E53E3E" }, // Rojo - No realizadas
  { keywords: ["pendiente"], color: "#ECC94B" }, // Amarillo - Pendientes
  { keywords: ["sin datos"], color: "#A0AEC0" }, // Gris - Sin datos
];

// Paleta alternativa para datos sin coincidencia semántica
const FALLBACK_COLORS = ["#3182CE", "#38A169", "#DD6B20", "#E53E3E", "#805AD5", "#319795", "#D69E2E", "#718096"];

// Obtiene color según el label del dato o usa paleta por índice
export const getChartColor = (label: string, index: number): string => {
  const labelLower = label.toLowerCase();
  
  // Busca coincidencia por palabra clave semántica
  for (const { keywords, color } of COLOR_KEYWORDS) {
    if (keywords.some((keyword) => labelLower.includes(keyword))) {
      return color;
    }
  }
  
  // Usa paleta de colores alternativa
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

// Obtiene color para tarjetas según la clave de métrica
export const getCardColor = (key: string): string => {
  const colorMap: Record<string, string> = {
    vencimientos_equipos: "blue.500",
    vencimientos_personal: "purple.500",
    vencimientos_documentos: "orange.500",
    vencimientos_elementos_limpieza: "teal.500",
    vencimientos: "blue.500",
    incidentes: "red.500",
    tareas: "green.500",
    cumplimiento: "green.500",
    tareas_cerradas: "blue.500",
    completadas: "green.500",
    incumplidas: "red.500",
    vencimientos_total: "blue.500",
    vencimientos_vencidos: "red.500",
    vencimientos_proximos: "yellow.500",
    vencimientos_vigentes: "green.500",
    lotes: "gray.400",
  };
  return colorMap[key] || "gray.500";
};
