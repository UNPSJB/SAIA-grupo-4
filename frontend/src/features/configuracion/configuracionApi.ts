const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
import { apiFetch } from "../auth/apiFetch";
import type {
  ConfiguracionPublica,
  ConfiguracionSistema,
  ConfiguracionUpdatePayload,
} from "./types";

const extraerDetalleError = async (res: Response, fallback: string): Promise<string> => {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    // Ignorar error de parseo
  }
  return fallback;
};

export const configuracionApi = {
  async obtenerPublica(): Promise<ConfiguracionPublica> {
    const res = await fetch(`${API_URL}/configuracion/publica`);
    if (!res.ok) {
      throw new Error("No se pudo cargar la configuración pública.");
    }
    return res.json();
  },

  async obtenerAdmin(): Promise<ConfiguracionSistema> {
    const res = await apiFetch(`${API_URL}/configuracion`);
    if (!res.ok) {
      throw new Error(await extraerDetalleError(res, "No se pudo cargar la configuración del sistema."));
    }
    return res.json();
  },

  async actualizar(payload: ConfiguracionUpdatePayload): Promise<ConfiguracionSistema> {
    const res = await apiFetch(`${API_URL}/configuracion`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await extraerDetalleError(res, "Error al guardar la configuración."));
    }
    return res.json();
  },

  async subirLogo(archivo: File): Promise<ConfiguracionSistema> {
    const formData = new FormData();
    formData.append("logo", archivo);
    const res = await apiFetch(`${API_URL}/configuracion/logo`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error(await extraerDetalleError(res, "Error al subir el logo."));
    }
    return res.json();
  },

  async eliminarLogo(): Promise<ConfiguracionSistema> {
    const res = await apiFetch(`${API_URL}/configuracion/logo`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error(await extraerDetalleError(res, "Error al eliminar el logo."));
    }
    return res.json();
  },
};

export const resolverLogoUrl = (logoUrl: string | null | undefined): string | null => {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://") || logoUrl.startsWith("blob:")) {
    return logoUrl;
  }
  const limpio = logoUrl.startsWith("/") ? logoUrl.slice(1) : logoUrl;
  return `${API_URL}/${limpio}`;
};