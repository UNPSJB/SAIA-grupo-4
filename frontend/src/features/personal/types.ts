import type { Capacidad } from "../capacidades/types";
import type { DocumentoPersonal } from "../documentosPersonal/types";
import type { EstadoSemaforo } from "../../components/ui";

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
    // Solo los manda el listado (GET /personal/): los calcula el backend al responder.
    dias_restantes?: number;
    estado?: EstadoSemaforo;
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
    vencimientos: VencimientoPersonal[];
}