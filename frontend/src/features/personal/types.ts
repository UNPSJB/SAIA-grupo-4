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
    // true si la persona ya tiene contraseña hasheada en el backend. Lo usa
    // el formulario para saber si falta asignarla (solo aplica a personal
    // con capacidades habilitantes).
    tiene_password?: boolean;
    capacidades: PersonaCapacidad[];
}