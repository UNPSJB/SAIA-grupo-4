import type { UsuarioLogueado } from "./types";

const CLAVE_SESION = "saia.usuario";

// Mock del backend: simula la validación y respuesta de la red.
// Cuando exista el endpoint de login/personal, solo se redefine esta función.
export const ingresarConDocumento = (
  documento: string,
): Promise<UsuarioLogueado> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const doc = documento.trim();

      // Formato tipo DNI: solo dígitos, de 7 a 8.
      if (!/^\d{7,8}$/.test(doc)) {
        reject(
          new Error("Ingresá un documento válido (solo números, 7 u 8 dígitos)."),
        );
        return;
      }

      const usuario: UsuarioLogueado = { documento: doc };
      // Se persiste en localStorage (sobrevive al refrescar).
      localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
      resolve(usuario);
    }, 600);
  });

// Lee la sesión guardada (o null si no hay).
export const obtenerSesion = (): UsuarioLogueado | null => {
  try {
    const raw = localStorage.getItem(CLAVE_SESION);
    return raw ? (JSON.parse(raw) as UsuarioLogueado) : null;
  } catch {
    return null; // Si el JSON está corrupto, se trata como "sin sesión".
  }
};

// Borra la sesión al cerrar.
export const cerrarSesion = () => {
  localStorage.removeItem(CLAVE_SESION);
};