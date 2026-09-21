// Forma que toma la sesión activa dentro de la app.
export interface UsuarioLogueado {
  documento: string;
  // (Reservado para el futuro módulo de Personal)
  // "administrar" | "operar"
  capacidad?: "administrar" | "operar" | null;
}