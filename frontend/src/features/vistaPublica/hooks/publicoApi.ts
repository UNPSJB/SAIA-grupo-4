import { BASE_URL } from "../../../config";
import type { RespuestaIndicadoresPublicos } from "../types";

// Error específico para distinguir un token inexistente de una falla de red.
export class VistaPublicaNoEncontradaError extends Error {
  constructor(message = "La vista pública no existe.") {
    super(message);
    this.name = "VistaPublicaNoEncontradaError";
  }
}

async function leerError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // Si la respuesta no es JSON, se usa el status como mensaje.
  }

  return `Error ${response.status}`;
}

export async function obtenerIndicadoresPublicos(
  token: string,
  signal?: AbortSignal,
): Promise<RespuestaIndicadoresPublicos> {
  const url = `${BASE_URL}/publico/${encodeURIComponent(token)}/indicadores`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    // La vista pública no depende de la sesión ni debe reutilizar respuestas
    // cacheadas: la desactivación tiene que reflejarse en la próxima lectura.
    credentials: "omit",
    cache: "no-store",
    signal,
  });

  if (response.status === 404) {
    throw new VistaPublicaNoEncontradaError();
  }

  if (!response.ok) {
    throw new Error(await leerError(response));
  }

  return response.json();
}
