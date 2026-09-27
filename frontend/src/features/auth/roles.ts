import type { UsuarioLogueado } from "./types";

const ROL_ADMINISTRAR = "administrar";
const ROL_OPERAR = "operar";

const tieneCapacidad = (u: UsuarioLogueado | null, nombre: string) =>
  u?.capacidades.some((c) => c.nombre.toLowerCase() === nombre) ?? false;

// Indica si el usuario tiene la capacidad "administrar".
export const esAdministrador = (u: UsuarioLogueado | null) =>
  tieneCapacidad(u, ROL_ADMINISTRAR);

// Indica si el usuario tiene la capacidad "operar".
export const esOperador = (u: UsuarioLogueado | null) =>
  tieneCapacidad(u, ROL_OPERAR);

// Indica si el usuario tiene ambas capacidades: administra y además ejecuta el
// checklist diario. Es el único caso que ve el grupo colapsable "Checklist" con
// las dos vistas (Checklist Diario + Historial de Checklist).
export const esAdminYOperador = (u: UsuarioLogueado | null) =>
  esAdministrador(u) && esOperador(u);
