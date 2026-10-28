/**
   frontend/src/features/auth/apiFetch.ts
   Wrapper centralizado de fetch para toda la aplicación.

   Funcionalidad:
   - Inyecta el header Authorization: Bearer <access_token> cuando existe.
   - Envía credentials: 'include' para que la cookie httpOnly de refresh viaje.
   - Ante un 401, intenta renovar el access token con PUT /auth/token (refresh)
     UNA única vez (evita loops infinitos), reintenta la request original y
     devuelve la respuesta del reintento.
   - Si el backend confirma que el refresh no es válido (401/403), limpia la
     sesión y redirige al login (/). Un fallo de red o 5xx NO cierra la sesión:
     se devuelve el 401 original para que el caller muestre el error.
 */

import { AuthError, authService } from "./authService";

// Resultado de un intento de refresh.
interface RefreshResult {
  token: string | null;
  // true cuando no se pudo contactar/concluir el refresh (red caída, 5xx):
  // transitorio, no implica que la sesión sea inválida.
  unreachable: boolean;
}

// Flag global para evitar múltiples refresh en paralelo (race condition).
let isRefreshing = false;
// Promesa compartida mientras se está renovando el token: todas las requests
// que reciban 401 durante ese lapso esperan el mismo refresh.
let refreshPromise: Promise<RefreshResult> | null = null;

// --- NUEVO: CONFIGURACIÓN DE LA URL BASE ---
// Cambia esto si tu backend de FastAPI corre en otro puerto que no sea el 8000
const API_BASE_URL = "http://localhost:8000"; 
// ------------------------------------------

/**
 * Función auxiliar para formatear la URL
 */
function buildUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string" && input.startsWith("/")) {
    return `${API_BASE_URL}${input}`;
  }
  return input;
}


/**
 * Obtiene el access token actual almacenado en memoria por authService.
 * El refresh token NUNCA se guarda en JS (viaja solo en cookie httpOnly).
 */
function getAccessToken(): string | null {
  return authService.getAccessToken();
}

/**
 * Limpia el estado de auth y redirige al login.
 * Se usa cuando el refresh confirma que la sesión ya no es válida.
 */
function forceLogoutAndRedirect(): void {
  try {
    // Limpia token en memoria y estado interno del authService.
    authService.clearAccessToken();
  } catch {
    // No bloquear el redirect por errores internos.
  }

  // Redirige a la pantalla de login (ruta raíz). El reload completo reinicia
  // también el estado de React (AuthProvider) que vive fuera de este módulo.
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.assign("/");
  }
}

/**
 * Intenta renovar el access token usando la cookie httpOnly de refresh.
 * Distingue una sesión inválida (401/403) de un fallo transitorio (red/5xx).
 */
async function performRefresh(): Promise<RefreshResult> {
  try {
    const refreshed = await authService.refresh();
    // authService.refresh ya guarda el nuevo access token internamente.
    return { token: refreshed?.access_token ?? null, unreachable: false };
  } catch (err) {
    // Solo un 401/403 del backend significa que la sesión dejó de valer.
    const sesionInvalida =
      err instanceof AuthError && (err.status === 401 || err.status === 403);
    return { token: null, unreachable: !sesionInvalida };
  }
}

/**
 * Reintenta la request original con el access token renovado.
 */
async function retryWithToken(
  input: RequestInfo | URL,
  init: RequestInit,
  token: string,
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  
  // --- NUEVO: Construir la URL completa ---
  const fullUrl = buildUrl(input);
  // ----------------------------------------
  
  return await fetch(fullUrl, { ...init, headers, credentials: "include" });
}

/**
 * Wrapper de fetch con inyección de Bearer, credentials y retry automático
 * ante 401 (refresh + reintento único).
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  
  // --- NUEVO: Construir la URL completa ---
  const fullUrl = buildUrl(input);
  // ----------------------------------------

  const accessToken = getAccessToken();
  const headers = new Headers(init.headers ?? {});

  // Inyecta Authorization solo si hay access token vigente.
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Asegura que la cookie de refresh (httpOnly) viaje en requests cross-origin.
  const requestInit: RequestInit = {
    ...init,
    headers,
    credentials: "include",
  };

  // Primer intento de la request usando la URL completa
  const response = await fetch(fullUrl, requestInit);

  // Si no es 401, devolvemos la respuesta tal cual.
  if (response.status !== 401) {
    return response;
  }

  // Recibimos 401: intentar refresh UNA sola vez y reintentar la request.
  // Si ya hay un refresh en curso, esperamos esa misma promesa en vez de
  // disparar uno nuevo. La promesa se captura en una variable local para no
  // depender de `refreshPromise`, que el que inició el refresh limpia al terminar.
  let refresco: Promise<RefreshResult>;
  if (isRefreshing && refreshPromise) {
    refresco = refreshPromise;
  } else {
    isRefreshing = true;
    refresco = performRefresh().finally(() => {
      // Se resetean juntos: si se bajara isRefreshing antes que refreshPromise,
      // una request que caiga en esa ventana iniciaría un segundo refresh.
      isRefreshing = false;
      refreshPromise = null;
    });
    refreshPromise = refresco;
  }

  const { token: newToken, unreachable } = await refresco;

  if (!newToken) {
    // Solo cerramos la sesión si el backend confirmó que el refresh no vale.
    // Ante un fallo transitorio devolvemos el 401 original sin desloguear.
    if (!unreachable) {
      forceLogoutAndRedirect();
    }
    return response;
  }

  // Refresh exitoso → reintentar la request original con el nuevo access token.
  return await retryWithToken(input, init, newToken); // Ojo: le pasamos 'input' porque retryWithToken ya usa buildUrl internamente
}