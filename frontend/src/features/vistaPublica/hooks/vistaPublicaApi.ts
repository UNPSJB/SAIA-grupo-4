import { BASE_URL, JSON_HEADERS } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import type { EstadoVistaPublica } from "../types";

const ENDPOINT = `${BASE_URL}/vista-publica/`;

async function leerError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // Si la respuesta no es JSON, se usa el status como mensaje.
  }

  return `Error ${response.status}`;
}

export async function obtenerEstadoVistaPublica(): Promise<EstadoVistaPublica> {
  const response = await apiFetch(ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(await leerError(response));
  }

  return response.json();
}

export async function actualizarEstadoVistaPublica(
  activo: boolean,
): Promise<EstadoVistaPublica> {
  const response = await apiFetch(ENDPOINT, {
    method: "PUT",
    headers: {
      ...JSON_HEADERS,
      Accept: "application/json",
    },
    body: JSON.stringify({ activo }),
  });

  if (!response.ok) {
    throw new Error(await leerError(response));
  }

  return response.json();
}
