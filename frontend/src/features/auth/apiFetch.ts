/**
   frontend/src/lib/apiFetch.ts
   Wrapper centralizado de fetch para toda la aplicación.

   Funcionalidad:
   - Inyecta el header Authorization: Bearer <access_token> cuando existe.
   - Envía credentials: 'include' para que la cookie httpOnly de refresh viaje.
   - Ante un 401, intenta renovar el access token con PUT /auth/token (refresh)
     UNA única vez (evita loops infinitos), reintenta la request original y
     devuelve la respuesta del reintento.
   - Si el refresh también falla (401/403 u otro error), limpia la sesión y
     redirige al login (/). No propaga el error en ese caso para evitar
     renders inconsistentes. 
 */

import { authService } from "./authService";

// Flag global para evitar múltiples refresh en paralelo (race condition).
let isRefreshing = false;
// Promesa compartida mientras se está renovando el token: todas las requests
// que reciban 401 durante ese lapso esperan el mismo refresh.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Obtiene el access token actual almacenado en memoria por authService.
 * El refresh token NUNCA se guarda en JS (viaja solo en cookie httpOnly).
 */
function getAccessToken(): string | null {
  return authService.getAccessToken();
}

/**
 * Limpia el estado de auth y redirige al login.
 * Se usa cuando el refresh no logra rehidratar la sesión.
 */
function forceLogoutAndRedirect(): void {
  try {
    // Limpia token en memoria y estado interno del authService.
    authService.clearAccessToken();
  } catch {
    // No bloquear el redirect por errores internos.
  }

  // Redirige a la pantalla de login (ruta raíz).
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.assign("/");
  }
}

/**
 * Intenta renovar el access token usando la cookie httpOnly de refresh.
 * Devuelve el nuevo access token o null si el refresh falló.
 */
async function performRefresh(): Promise<string | null> {
  try {
    const refreshed = await authService.refresh();
    // authService.refresh ya guarda el nuevo access token internamente.
    return refreshed?.access_token ?? null;
  } catch {
    // Cualquier error (401, red, etc.) indica que no hay sesión válida.
    return null;
  }
}

/**
 * Wrapper de fetch con inyección de Bearer, credentials y retry automático
 * ante 401 (refresh + reintento único).
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = getAccessToken();
  const headers = new Headers(init.headers ?? {});

  // Inyecta Authorization solo si hay access token vigente.
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Asegura que la cookie de refresh (httpOnly) viaje en requests cross-origin
  // (igual que hace el frontend actual con credentials: 'include').
  const requestInit: RequestInit = {
    ...init,
    headers,
    credentials: "include",
  };

  // Primer intento de la request.
  let response = await fetch(input, requestInit);

  // Si no es 401, devolvemos la respuesta tal cual.
  if (response.status !== 401) {
    return response;
  }

  // Recibimos 401: intentar refresh UNA sola vez y reintentar la request original.
  // 1) Si ya hay un refresh en curso, esperamos esa promesa compartida.
  if (isRefreshing && refreshPromise) {
    const newToken = await refreshPromise;
    if (!newToken) {
      // El refresh en curso falló → forzamos logout/redirect.
      forceLogoutAndRedirect();
      // Devolvemos la respuesta 401 original para evitar romper flujos que
      // esperan manejar el error (aunque en este caso redirigimos).
      return response;
    }

    // Tenemos nuevo token: reintentar con el token renovado.
    const retryHeaders = new Headers(init.headers ?? {});
    retryHeaders.set("Authorization", `Bearer ${newToken}`);
    const retryInit: RequestInit = {
      ...init,
      headers: retryHeaders,
      credentials: "include",
    };
    return await fetch(input, retryInit);
  }

  // 2) No hay refresh en curso → iniciamos uno nuevo (único reintento).
  isRefreshing = true;
  refreshPromise = performRefresh().finally(() => {
    // El flag se mantiene en true mientras la promesa está activa; lo
    // bajamos una vez resuelta para permitir futuros refresh si hiciera
    // falta en otra navegación (aunque el diseño es 1 retry por 401).
    isRefreshing = false;
  });

  const newToken = await refreshPromise;
  refreshPromise = null;

  if (!newToken) {
    // Refresh fallido → sesión inválida/expirada. Forzamos logout y redirect.
    forceLogoutAndRedirect();
    // Devolvemos la respuesta 401 original.
    return response;
  }

  // 3) Refresh exitoso → reintentar la request original con el nuevo access token.
  const retryHeaders2 = new Headers(init.headers ?? {});
  retryHeaders2.set("Authorization", `Bearer ${newToken}`);
  const retryInit2: RequestInit = {
    ...init,
    headers: retryHeaders2,
    credentials: "include",
  };

  response = await fetch(input, retryInit2);
  return response;
}
