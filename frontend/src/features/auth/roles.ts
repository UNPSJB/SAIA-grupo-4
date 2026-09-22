import type { UsuarioLogueado } from "./types";

const ROL_ADMINISTRAR = "administrar";

// Indica si el usuario tiene la capacidad "administrar".
export const esAdministrador = (u: UsuarioLogueado | null) =>
  u?.capacidades.some((c) => c.nombre === ROL_ADMINISTRAR) ?? false;