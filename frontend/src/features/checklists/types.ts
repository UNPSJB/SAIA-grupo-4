export type TipoMomento = "pre-operacional" | "operacional";
export type EstadoTarea = "pendiente" | "completada";

export interface InsumoQuimicoReceta {
  id: number;
  nombre: string;
  dosisSugerida: number;
  unidad: string;
  dilucion?: string;
}

export interface ElementoLimpiezaReceta {
  id: number;
  nombre: string;
  cantidad: number;
}

export interface RegistroAuditoria {
  realizadoPor: string;
  hora: string;
  fecha: string;
  consumoRegistrado: string[];
  fotoNombre?: string;
  fotoUrl?: string;
}

export interface TareaChecklist {
  id: number;
  nombre: string;
  destino: string;
  tipo: TipoMomento;
  estado: EstadoTarea;
  elementosLimpieza: ElementoLimpiezaReceta[];
  quimicosSugeridos: InsumoQuimicoReceta[];
  instruccionesPoes?: string[];
  auditoria?: RegistroAuditoria;
}

export interface OperarioInfo {
  nombre: string;
  capacidad: string;
}