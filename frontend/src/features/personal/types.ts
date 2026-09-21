import type { Capacidad } from "../capacidades/types";

export interface PersonaCapacidad {
    id: number;
    capacidad_id: number;
    fecha_desde: string;
    fecha_hasta?: string;
    activo: boolean;
    capacidad: Capacidad;
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
}