/**
 frontend/src/features/auth/authService.ts
 Servicio de autenticación contra el backend (JWT).

 Flujo acordado:
 - POST /auth/token (OAuth2): recibe DNI+contraseña vía form-data (username/password).
   Devuelve { access_token, token_type, persona } y setea cookie httpOnly de refresh.
 - GET /auth/me: requiere Authorization: Bearer <access_token> → devuelve Persona.
 - PUT /auth/token: usa cookie httpOnly de refresh → renueva access_token + persona.
 - DELETE /auth/token: elimina cookie de refresh (logout).
 */

import type { Persona } from "../personal/types";
import { BASE_URL } from "../../config";

// Estructura devuelta por el backend en login/refresh.
export interface TokenResponse {
  access_token: string;
  token_type: string;
  persona: Persona;
}

// Mantiene el access token en memoria únicamente (nunca en localStorage).
// Esto minimiza el riesgo de exposición por XSS y es coherente con refresh
// viajando solo en httpOnly cookie.
let accessTokenInMemory: string | null = null;

/**
 * Extrae y normaliza el mensaje de error del backend (FastAPI devuelve { detail }).
 */
function extractErrorDetail(data: unknown): string | undefined {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return undefined;
}

/**
 * Guarda el access token en memoria. Llamado tras login o refresh exitoso.
 */
function setAccessToken(token: string | null): void {
  accessTokenInMemory = token;
}

export const authService = {
  /**
   * Devuelve el access token vigente (en memoria). Puede ser null si no hay sesión.
   */
  getAccessToken(): string | null {
    return accessTokenInMemory;
  },

  /**
   * Limpia el access token de memoria (usado en logout o refresh fallido).
   */
  clearAccessToken(): void {
    accessTokenInMemory = null;
  },

  /**
   * Inicia sesión con DNI + contraseña (un solo paso).
   * Envía FormData con username = DNI y password = contraseña (OAuth2PasswordRequestForm).
   * En éxito guarda access_token en memoria y retorna TokenResponse.
   */
  async login(dni: string, password: string): Promise<TokenResponse> {
    const form = new FormData();
    // El backend espera 'username' (OAuth2) con el DNI.
    form.append("username", dni.trim());
    form.append("password", password);

    const res = await fetch(`${BASE_URL}/auth/token`, {
      method: "POST",
      body: form,
      // credentials: 'include' necesario para recibir la cookie de refresh
      // en la respuesta del login (y para futuras requests).
      credentials: "include",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const detail = extractErrorDetail(data);
      // Errores 401: CredencialesIncorrectas o CapacidadesNoHabilitadas
      // (mensajes genéricos según backend). Se propaga el detalle para mostrar
      // en LoginPage sin filtrar información.
      throw new Error(detail || "No se pudo iniciar sesión.");
    }

    const tokenResp = data as TokenResponse;
    // Persistimos access token en memoria para inyectarlo vía apiFetch/Bearer.
    if (tokenResp?.access_token) {
      setAccessToken(tokenResp.access_token);
    } else {
      setAccessToken(null);
    }

    return tokenResp;
  },

  /**
   * Renueva el access token usando la cookie httpOnly de refresh (PUT /auth/token).
   * Requiere que el navegador envíe la cookie (credentials: 'include').
   * En éxito guarda el nuevo access_token y retorna TokenResponse.
   */
  async refresh(): Promise<TokenResponse> {
    const res = await fetch(`${BASE_URL}/auth/token`, {
      method: "PUT",
      // No enviamos body. El refresh se lee desde cookie httpOnly.
      credentials: "include",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const detail = extractErrorDetail(data);
      // 401 -> SesionNoValida (o cookie ausente). Limpiamos token en memoria.
      setAccessToken(null);
      throw new Error(detail || "No se pudo renovar la sesión.");
    }

    const tokenResp = data as TokenResponse;
    if (tokenResp?.access_token) {
      setAccessToken(tokenResp.access_token);
    } else {
      setAccessToken(null);
    }

    return tokenResp;
  },

  /**
   * Obtiene la persona autenticada actual (GET /auth/me).
   * Requiere access token válido en header Authorization (Bearer).
   * No modifica el estado de sesión salvo que falle con 401 (se deja que
   * el caller/refresh maneje ese caso).
   */
  async me(): Promise<Persona> {
    const token = accessTokenInMemory;
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/auth/me`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const detail = extractErrorDetail(data);
      // 401 -> token ausente/inválido/expirado. No limpiamos aquí: apiFetch
      // decide si intentar refresh o forzar logout.
      throw new Error(detail || "Sesión no válida.");
    }

    return data as Persona;
  },

  /**
   * Cierra la sesión (DELETE /auth/token). Elimina la cookie httpOnly de refresh.
   * Limpia el access token de memoria.
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/auth/token`, {
        method: "DELETE",
        credentials: "include",
      });
      // Ignoramos el status del logout (aunque falle, limpiamos estado local).
    } finally {
      setAccessToken(null);
    }
  },
};
