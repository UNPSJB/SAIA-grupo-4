import type { Capacidad } from "../capacidades/types";

// Sesión activa del usuario logueado, construida a partir de la persona real.
export interface UsuarioLogueado {
  personaId: number;
  dni: string;
  nombre: string;
  apellido: string;
  legajo: number;
  // Capacidades activas del usuario (ej.: "administrar", "operar").
  capacidades: Capacidad[];
}