import type { Persona } from "../personal/types";
import type { UsuarioLogueado } from "./types";

const CLAVE_SESION = "saia.usuario";
const ENDPOINT_PERSONAL = "http://127.0.0.1:8000/personal/";

// Valida que la sesión guardada tenga la forma esperada.
// Si quedó una sesión de un esquema anterior (solo documento), se descarta.
const esUsuarioValido = (u: unknown): u is UsuarioLogueado => {
  if (!u || typeof u !== "object") return false;
  const c = u as Record<string, unknown>;
  return (
    typeof c.personaId === "number" &&
    typeof c.dni === "string" &&
    typeof c.nombre === "string" &&
    typeof c.apellido === "string" &&
    typeof c.legajo === "number" &&
    Array.isArray(c.capacidades)
  );
};

// Inicia sesión validando el DNI contra el listado real de personal.
export const ingresarConDocumento = async (
  dni: string,
): Promise<UsuarioLogueado> => {
  const res = await fetch(ENDPOINT_PERSONAL);
  if (!res.ok) {
    throw new Error("No se pudo conectar con el servidor.");
  }

  const personal: Persona[] = await res.json();
  const persona = personal.find((p) => p.dni === dni);

  if (!persona) {
    throw new Error("Documento no registrado.");
  }
  if (!persona.activo) {
    throw new Error("El personal está dado de baja.");
  }

  const usuario: UsuarioLogueado = {
    personaId: persona.id,
    dni: persona.dni,
    nombre: persona.nombre,
    apellido: persona.apellido,
    legajo: persona.legajo,
    capacidades: persona.capacidades
      .filter((pc) => pc.activo)
      .map((pc) => pc.capacidad),
  };

  // Se persiste en localStorage (sobrevive al refrescar).
  localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
  return usuario;
};

// Lee la sesión guardada (o null si no hay o es inválida).
export const obtenerSesion = (): UsuarioLogueado | null => {
  try {
    const raw = localStorage.getItem(CLAVE_SESION);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!esUsuarioValido(parsed)) {
      localStorage.removeItem(CLAVE_SESION);
      return null;
    }
    return parsed;
  } catch {
    return null; // Si el JSON está corrupto, se trata como "sin sesión".
  }
};

// Borra la sesión al cerrar.
export const cerrarSesion = () => {
  localStorage.removeItem(CLAVE_SESION);
};