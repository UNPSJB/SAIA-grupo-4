import type { Capacidad } from "../capacidades/types";
import type { DocumentoPersonal } from "../documentosPersonal/types";

export interface PersonaCapacidad {
    id: number;
    capacidad_id: number;
    fecha_desde: string;
    fecha_hasta?: string;
    activo: boolean;
    capacidad: Capacidad;
}

export interface VencimientoPersonal {
    id: number;
    persona_id: number;
    documento_id: number;
    fecha_emision?: string | null;
    fecha_vencimiento: string;
    url_comprobante?: string | null;
    documento: DocumentoPersonal;
}

export interface Persona {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    legajo: number;
    email?: string;
    telefono?: string;
    fecha_alta: string;
    activo: boolean;
    capacidades: PersonaCapacidad[];
    vencimientos: VencimientoPersonal[];
}