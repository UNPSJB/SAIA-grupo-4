import type { Equipo } from "../equipos/types";
import type { Sector } from "../sectores/types";
import type { PlanPoe, TareaLimpieza } from "./types";

export const mockSectores: Sector[] = [
  { id: 1, nombre: "Cocina", activo: true },
  { id: 2, nombre: "Elaboración", activo: true },
  { id: 3, nombre: "Comedor", activo: true },
  { id: 4, nombre: "Depósito", activo: true },
  { id: 5, nombre: "Baños", activo: true },
];

const sectorById = (id: number): Sector =>
  mockSectores.find((s) => s.id === id)!;

export const mockEquipos: Equipo[] = [
  {
    id: 1,
    nombre: "Heladera 1",
    marca: "Whirlpool",
    numero_serie: "H-001",
    categoria: "heladera",
    sector: sectorById(1),
    activo: true,
  },
  {
    id: 2,
    nombre: "Heladera Mostrador 1",
    marca: "BGH",
    numero_serie: "HM-101",
    categoria: "heladera",
    sector: sectorById(1),
    ubicacion: "Elaboración",
    activo: true,
  },
  {
    id: 3,
    nombre: "Extractor",
    marca: "Campana S.A.",
    numero_serie: "EXT-002",
    categoria: "otro",
    sector: sectorById(1),
    activo: true,
  },
  {
    id: 4,
    nombre: "Horno",
    marca: "Rolon",
    numero_serie: "HR-003",
    categoria: "horno",
    sector: sectorById(1),
    activo: true,
  },
  {
    id: 5,
    nombre: "Balanza",
    marca: "Mettler",
    numero_serie: "BL-004",
    categoria: "balanza",
    sector: sectorById(2),
    activo: true,
  },
];

export const tareasPlanVigente: TareaLimpieza[] = [
  {
    id: 1,
    nombre: "Pisos y Rejillas",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "post-operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Retirar residuos gruesos del piso.",
      "Aplicar solución de detergente neutro diluido.",
      "Refregar con mopa y enjuagar con agua potable.",
      "Retirar y limpiar las rejillas de piso.",
      "Sanitizar rejillas con alcohol al 70% y reponerlas.",
    ],
    quimicos: ["Detergente Neutro", "Alcohol 70%"],
    elementos: ["Mopa", "Trapo rejilla"],
    activo: true,
  },
  {
    id: 2,
    nombre: "Sanitización Heladera",
    destino_tipo: "equipo",
    equipo: mockEquipos[0],
    momento: "pre-operacional",
    periodicidad: "dias-especificos",
    dias: ["lun", "jue"],
    pasos: [
      "Desconectar el equipo eléctricamente si corresponde.",
      "Vaciar y retirar productos del interior.",
      "Retirar burletes y lavarlos con detergente neutro.",
      "Sanitizar interior con alcohol al 70%.",
      "Recomponer el equipo y verificar temperatura.",
    ],
    quimicos: ["Alcohol 70%", "Detergente Neutro"],
    elementos: ["Trapo rejilla", "Esponja"],
    activo: true,
  },
  {
    id: 3,
    nombre: "Limpieza de Campana",
    destino_tipo: "equipo",
    equipo: mockEquipos[2],
    momento: "post-operacional",
    periodicidad: "mensual",
    dias: [],
    dia_mes: 15,
    pasos: [
      "Desconectar la energía del extractor.",
      "Retirar filtros y sumergirlos en desengrasante.",
      "Limpiar el interior de la campana con cepillo.",
      "Enjuagar y secar filtros, luego reponerlos.",
      "Registrar la tarea en el plan.",
    ],
    quimicos: ["Desengrasante"],
    elementos: ["Cepillo duro", "Esponja"],
    activo: true,
  },
  {
    id: 4,
    nombre: "Desinfección de Mesadas",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Retirar utensilios y productos de la mesada.",
      "Limpiar con detergente neutro y paño húmedo.",
      "Aplicar alcohol al 70% sobre la superficie.",
      "Dejar secar al aire antes de la próxima elaboración.",
    ],
    quimicos: ["Alcohol 70%"],
    elementos: ["Paño microfibra"],
    activo: true,
  },
  {
    id: 5,
    nombre: "Sanitización de Baños",
    destino_tipo: "sector",
    sector: sectorById(5),
    momento: "post-operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Limpiar inodoros y lavatorios con detergente.",
      "Aplicar lavandina diluida en superficies.",
      "Reponer papel y jabón según corresponda.",
      "Registrar la carga del sanitizante.",
    ],
    quimicos: ["Detergente Neutro", "Lavandina"],
    elementos: ["Paño microfibra", "Esponja"],
    activo: true,
  },
  {
    id: 6,
    nombre: "Limpieza de Estufa y Superficies Calientes",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "post-operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Esperar que las superficies se enfríen.",
      "Retirar restos quemados con espátula.",
      "Limpiar con detergente neutro.",
      "Secar y dejar la zona lista para la próxima jornada.",
    ],
    quimicos: ["Detergente Neutro"],
    elementos: ["Esponja", "Paño microfibra"],
    activo: true,
  },
  {
    id: 7,
    nombre: "Higiene de Puertas, Manijas y Tiradores",
    destino_tipo: "sector",
    sector: sectorById(3),
    momento: "operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Limpiar manijas y tiradores con paño húmedo.",
      "Aplicar alcohol al 70%.",
      "Repasar puertas y marcos con detergente neutro.",
      "Registrar la desinfección.",
    ],
    quimicos: ["Alcohol 70%", "Detergente Neutro"],
    elementos: ["Paño microfibra"],
    activo: true,
  },
  {
    id: 8,
    nombre: "Recambio de Paños y Dispensador de Alcohol",
    destino_tipo: "sector",
    sector: sectorById(3),
    momento: "pre-operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Retirar paños utilizados y colocarlos en cesto.",
      "Colocar paños limpios secos en cada sector.",
      "Verificar y reponer alcohol del dispensador.",
      "Registrar el recambio.",
    ],
    quimicos: ["Alcohol 70%"],
    elementos: ["Paño microfibra"],
    activo: true,
  },
  {
    id: 9,
    nombre: "Limpieza de Piletas de Lavado",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "post-operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Vaciado de la pileta.",
      "Limpiar paredes con detergente neutro y esponja.",
      "Enjuagar con agua potable.",
      "Sanitizar con lavandina diluida.",
    ],
    quimicos: ["Detergente Neutro", "Lavandina"],
    elementos: ["Esponja"],
    activo: true,
  },
  {
    id: 10,
    nombre: "Vaciado y Limpieza de Residuos",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "post-operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Retirar bolsas de residuos del sector.",
      "Limpiar los contenedores con detergente.",
      "Sanitizar con lavandina diluida.",
      "Reponer bolsas nuevas y tapas.",
    ],
    quimicos: ["Detergente Neutro", "Lavandina"],
    elementos: ["Mopa", "Trapo rejilla"],
    activo: true,
  },
  {
    id: 11,
    nombre: "Limpieza de Rejillas de Ventilación",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "post-operacional",
    periodicidad: "semanal",
    dias: ["vie"],
    pasos: [
      "Retirar las rejillas de ventilación.",
      "Lavar con detergente neutro y cepillo.",
      "Enjuagar y secar.",
      "Reponer y verificar el ajuste.",
    ],
    quimicos: ["Detergente Neutro"],
    elementos: ["Cepillo duro", "Trapo rejilla"],
    activo: true,
  },
  {
    id: 12,
    nombre: "Desagote y Limpieza del Depósito",
    destino_tipo: "sector",
    sector: sectorById(4),
    momento: "pre-operacional",
    periodicidad: "semanal",
    dias: [],
    pasos: [
      "Despejar el sector de mercadería.",
      "Desagotar rejillas y piletas del depósito.",
      "Lavar piso con detergente neutro.",
      "Sanitizar con lavandina y dejar secar.",
    ],
    quimicos: ["Detergente Neutro", "Lavandina"],
    elementos: ["Mopa", "Esponja"],
    activo: true,
  },
];

const tareasPlanV11: TareaLimpieza[] = [
  {
    id: 100,
    nombre: "Pisos y Rejillas",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "post-operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Retirar residuos gruesos del piso.",
      "Aplicar detergente neutro.",
      "Enjuagar y sanitizar rejillas.",
    ],
    quimicos: ["Detergente Neutro"],
    elementos: ["Mopa"],
    activo: true,
  },
  {
    id: 101,
    nombre: "Desinfección de Mesadas",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: [
      "Limpiar con detergente neutro.",
      "Aplicar alcohol al 70%.",
    ],
    quimicos: ["Alcohol 70%"],
    elementos: ["Paño microfibra"],
    activo: true,
  },
  {
    id: 102,
    nombre: "Sanitización de Heladera",
    destino_tipo: "equipo",
    equipo: mockEquipos[0],
    momento: "pre-operacional",
    periodicidad: "dias-especificos",
    dias: ["lun", "jue"],
    pasos: ["Vaciar y retirar burletes.", "Sanitizar interior con alcohol."],
    quimicos: ["Alcohol 70%"],
    elementos: ["Trapo rejilla"],
    activo: true,
  },
  {
    id: 103,
    nombre: "Limpieza de Campana",
    destino_tipo: "equipo",
    equipo: mockEquipos[2],
    momento: "post-operacional",
    periodicidad: "mensual",
    dias: [],
    dia_mes: 15,
    pasos: ["Retirar filtros y sumergirlos en desengrasante.", "Limpiar interior de la campana."],
    quimicos: ["Desengrasante"],
    elementos: ["Cepillo duro"],
    activo: true,
  },
];

const tareasPlanV10: TareaLimpieza[] = [
  {
    id: 200,
    nombre: "Pisos y Rejillas",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "post-operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: ["Retirar residuos del piso.", "Lavar con detergente neutro."],
    quimicos: ["Detergente Neutro"],
    elementos: ["Mopa"],
    activo: true,
  },
  {
    id: 201,
    nombre: "Desinfección de Mesadas",
    destino_tipo: "sector",
    sector: sectorById(1),
    momento: "operacional",
    periodicidad: "diaria",
    dias: [],
    pasos: ["Limpiar con detergente neutro."],
    quimicos: ["Detergente Neutro"],
    elementos: ["Paño microfibra"],
    activo: true,
  },
];

export const mockPlanes: PlanPoe[] = [
  {
    id: 10,
    nombre_plan: "Plan de Limpieza y Sanitización",
    version: "v1.0",
    estado: "dado_de_baja",
    fecha_alta: "2025-06-01",
    fecha_baja: "2025-12-15",
    objetivo:
      "Garantizar la inocuidad de los alimentos mediante la limpieza y sanitización de superficies y equipos.",
    descripcion: "Versión inicial del plan de limpieza.",
  },
  {
    id: 11,
    nombre_plan: "Plan de Limpieza y Sanitización",
    version: "v1.1",
    estado: "dado_de_baja",
    fecha_alta: "2025-12-16",
    fecha_baja: "2026-01-20",
    objetivo:
      "Garantizar la inocuidad de los alimentos mediante la limpieza y sanitización de superficies y equipos.",
    descripcion: "Se incorporan tareas de sanitización de heladera.",
  },
  {
    id: 12,
    nombre_plan: "Plan de Limpieza y Sanitización",
    version: "v1.2",
    estado: "vigente",
    fecha_alta: "2026-01-21",
    objetivo:
      "Garantizar la inocuidad de los alimentos mediante la limpieza y sanitización periódica de superficies, equipos y sectores.",
    descripcion: "Plan vigente: incorpora desengrasantes y frecuencia mensual.",
  },
];

export const tareasPorPlan: Record<number, TareaLimpieza[]> = {
  10: tareasPlanV10,
  11: tareasPlanV11,
  12: tareasPlanVigente,
};

export const getTareasDePlan = (planId: number): TareaLimpieza[] =>
  tareasPorPlan[planId] ?? [];

export const nextTareaId = () =>
  Object.values(tareasPorPlan)
    .flat()
    .reduce((max, t) => Math.max(max, t.id), 0) + 1;

export const nextPlanId = () =>
  mockPlanes.reduce((max, p) => Math.max(max, p.id), 0) + 1;

export const hoy = () => new Date().toISOString().slice(0, 10);

export const setPlanVigente = (plan: PlanPoe, tareas: TareaLimpieza[]) => {
  mockPlanes.forEach((p, i) => {
    if (p.estado === "vigente") {
      mockPlanes[i] = { ...p, estado: "dado_de_baja", fecha_baja: hoy() };
    }
  });
  const indice = mockPlanes.findIndex((p) => p.id === plan.id);
  const planVigente: PlanPoe = { ...plan, estado: "vigente" };
  if (indice === -1) {
    mockPlanes.push(planVigente);
  } else {
    mockPlanes[indice] = planVigente;
  }
  tareasPorPlan[plan.id] = tareas;
};