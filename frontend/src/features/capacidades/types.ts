export interface Capacidad {
    id: number;
    nombre: string;
    descripcion?: string;
    tipo: "sistema" | "personalizada";
    activo: boolean;
}