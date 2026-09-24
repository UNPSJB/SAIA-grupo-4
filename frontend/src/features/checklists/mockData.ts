import type { TareaChecklist, OperarioInfo } from "./types";

export const mockOperario: OperarioInfo = {
  nombre: "Juan Pérez",
  capacidad: "OPERAR",
};

export const mockTareasIniciales: TareaChecklist[] = [
  {
    id: 1,
    nombre: "Sanitización de Heladera Mostrador 1",
    tipo: "pre-operacional",
    estado: "pendiente",
    destino: "Equipo - Heladera 1 (Cocina)",
    elementosLimpieza: [
      { id: 1, nombre: "Trapo rejilla", cantidad: 2 },
      { id: 2, nombre: "Balde rotulado", cantidad: 1 },
    ],
    quimicosSugeridos: [
      { id: 1, nombre: "Detergente Neutro", dosisSugerida: 50, unidad: "ml", dilucion: "Solución al 2%" },
      { id: 2, nombre: "Alcohol 70%", dosisSugerida: 30, unidad: "ml" },
    ],
    instruccionesPoes: [
      "Retirar todos los productos almacenados y colocarlos en cámara secundaria.",
      "Aplicar detergente neutro diluido sobre las superficies interiores con trapo rejilla.",
      "Enjuagar con paño húmedo hasta retirar todo resto químico.",
      "Rociar solución de alcohol al 70% y dejar secar al aire sin frotar.",
    ],
  },
  {
    id: 2,
    nombre: "Sanitización de Mesadas y Piletas de Trabajo",
    tipo: "pre-operacional",
    estado: "completada",
    destino: "Sector - Cocina",
    elementosLimpieza: [
      { id: 3, nombre: "Esponja abrasiva", cantidad: 1 },
      { id: 4, nombre: "Balde graduado", cantidad: 1 },
    ],
    quimicosSugeridos: [
      { id: 3, nombre: "Lavandina Concentrada", dosisSugerida: 100, unidad: "ml", dilucion: "200 ppm" },
    ],
    instruccionesPoes: [
      "Despejar completamente las mesadas de utensilios o restos orgánicos.",
      "Lavar con solución jabonosa y enjuagar con abundante agua.",
      "Desinfectar aplicando solución clorada y respetar 10 minutos de contacto.",
    ],
    auditoria: {
      realizadoPor: "Juan Pérez",
      hora: "07:15 hs",
      fecha: "21/09/2026",
      consumoRegistrado: ["100 ml de Lavandina Concentrada"],
      fotoNombre: "foto_evidencia_0715.jpg",
      fotoUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=60",
    },
  },
  {
    id: 3,
    nombre: "Limpieza y desinfección de Balanza de Recepción",
    tipo: "pre-operacional",
    estado: "pendiente",
    destino: "Equipo - Balanza 01 (Recepción)",
    elementosLimpieza: [
      { id: 5, nombre: "Papel descartable", cantidad: 4 },
    ],
    quimicosSugeridos: [
      { id: 2, nombre: "Alcohol 70%", dosisSugerida: 30, unidad: "ml" },
    ],
    instruccionesPoes: [
      "Apagar o desenchufar el display digital si corresponde.",
      "Retirar bandeja de acero inoxidable y limpiarla por separado.",
      "Higienizar la base con paño humedecido en alcohol al 70% sin mojar los sensores.",
    ],
  },
  {
    id: 4,
    nombre: "Repaso de pisos y drenajes de zona de empaque",
    tipo: "operacional",
    estado: "pendiente",
    destino: "Sector - Empaque",
    elementosLimpieza: [
      { id: 6, nombre: "Haragán", cantidad: 1 },
      { id: 7, nombre: "Mopa", cantidad: 2 },
    ],
    quimicosSugeridos: [
      { id: 4, nombre: "Desinfectante Amonio Cuaternario", dosisSugerida: 120, unidad: "ml" },
    ],
    instruccionesPoes: [
      "Barrer en seco para remover polvillo o virutas de cartón.",
      "Mapear con solución desinfectante desde el fondo hacia la salida.",
      "Verificar que las rejillas de desagüe queden sin sedimentos.",
    ],
  },
  {
    id: 5,
    nombre: "Sanitización intermedia de cuchillas y tablas",
    tipo: "operacional",
    estado: "pendiente",
    destino: "Sector - Cocina",
    elementosLimpieza: [
      { id: 8, nombre: "Toallas descartables", cantidad: 3 },
    ],
    quimicosSugeridos: [
      { id: 2, nombre: "Alcohol 70%", dosisSugerida: 40, unidad: "ml" },
    ],
    instruccionesPoes: [
      "Lavar con agua y detergente en bacha para remover restos biológicos.",
      "Inmersión en solución sanitizante o rociado uniforme con alcohol 70%.",
      "Dejar escurrir en el soporte designado.",
    ],
  },
];