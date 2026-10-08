/**
  frontend/src/features/auth/AuthProvider.tsx
  Contexto de autenticación con rehidratación asíncrona de sesión.

  Inicialización (al montar):
  1. Intenta GET /auth/me con el access token en memoria (si existiera por
      algún estado previo). Si OK → sesión activa.
  2. Si falla con 401 → intenta PUT /auth/token (refresh) usando la cookie
      httpOnly para rehidratar sesión automáticamente (útil al recargar página).
  3. Mientras esto ocurre, `loading = true` para evitar parpadeos en rutas protegidas.
  4. Expone login/logout, usuario, isAuthenticated, loading, esAdmin, esOperador.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Persona } from "../personal/types";
import { authService, type TokenResponse } from "./authService";
import { AuthContext } from "./AuthContext";
import { esAdministrador, esOperador } from "./roles";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Extrae mensaje de error para logs (sin exponer datos sensibles).
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [usuario, setUsuario] = useState<Persona | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helpers derivados del usuario actual
  const esAdmin = useMemo(() => esAdministrador(usuario), [usuario]);
  const esOp = useMemo(() => esOperador(usuario), [usuario]);
  const isAuthenticated = useMemo(() => usuario !== null, [usuario]);

  /**
   * Limpia el estado de sesión local (sin llamar a DELETE /auth/token).
   * Usado cuando falla la rehidratación/refresh.
   */
  const clearSession = useCallback(() => {
    authService.clearAccessToken();
    setUsuario(null);
  }, []);

  /**
   * Rehidrata la sesión al montar el provider.
   * Estrategia: intentar me() primero; si 401 → intentar refresh().
   */
  const rehydrateSession = useCallback(async () => {
    // No se setea loading=true acá: el estado inicial ya arranca en true y
    // hacerlo de forma síncrona dentro del useEffect de montaje dispara el
    // lint (react-hooks/set-state-in-effect). Todas las rutas de abajo
    // terminan en setLoading(false) tras un await.

    // 1) Intentar obtener usuario con access token actual (si lo hubiera).
    try {
      const personaActual = await authService.me();
      setUsuario(personaActual);
      setLoading(false);
      return;
    } catch (err) {
      const msg = getErrorMessage(err);
      // Si NO es 401, no intentamos refresh automático (podría ser red).
      // Muchos backends devuelven "Sesión no válida." o detalle 401.
      const isUnauthorized =
        msg.toLowerCase().includes("401") ||
        msg.toLowerCase().includes("no válida") ||
        msg.toLowerCase().includes("no autorizado") ||
        msg.toLowerCase().includes("unauthorized");

      if (!isUnauthorized) {
        // Otro error (network): no levantamos sesión, dejamos loading=false.
        clearSession();
        setLoading(false);
        return;
      }
      // Es 401 → pasar a intentar refresh vía cookie.
    }

    // 2) Intentar refresh con cookie httpOnly (rehidratación post-recarga).
    try {
      const refreshed = await authService.refresh();
      // Tras refresh exitoso, traemos /auth/me para tener datos completos
      // (refresh ya devuelve persona, pero usamos me() para ser consistente).
      try {
        const personaActual2 = await authService.me();
        setUsuario(personaActual2);
      } catch {
        // Si me() falla tras refresh (caso raro), usamos persona del refresh.
        if (refreshed?.persona) {
          setUsuario(refreshed.persona);
        } else {
          clearSession();
        }
      }
    } catch {
      // Refresh fallido → no hay sesión válida (cookie ausente/expirada).
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  // Ejecuta rehidratación una única vez al montar el AuthProvider.
  useEffect(() => {
    // La rehidratación es async: todos los setState de rehydrateSession
    // ocurren tras un await (me()/refresh()), no en el cuerpo del effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void rehydrateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Login: envía DNI+contraseña, guarda access token y setea usuario.
   */
  const login = useCallback(
    async (dni: string, password: string): Promise<TokenResponse> => {
      const tokenResp = await authService.login(dni, password);
      // Actualiza usuario en contexto inmediatamente tras login exitoso.
      if (tokenResp?.persona) {
        setUsuario(tokenResp.persona);
      } else {
        // Fallback: intentar obtener /auth/me para asegurar estado coherente.
        try {
          const p = await authService.me();
          setUsuario(p);
        } catch {
          setUsuario(null);
        }
      }
      return tokenResp;
    },
    [],
  );

  /**
   * Logout: elimina cookie de refresh y limpia estado local.
   */
  const logout = useCallback(async (): Promise<void> => {
    await authService.logout();
    setUsuario(null);
  }, []);

  /**
   * Refresh manual (expone acción). Útil si algún componente necesita forzar renovación.
   */
  const refresh = useCallback(async (): Promise<TokenResponse> => {
    const tokenResp = await authService.refresh();
    if (tokenResp?.persona) {
      setUsuario(tokenResp.persona);
    } else {
      try {
        const p = await authService.me();
        setUsuario(p);
      } catch {
        setUsuario(null);
      }
    }
    return tokenResp;
  }, []);

  const value = useMemo(
    () => ({
      usuario,
      isAuthenticated,
      loading,
      login,
      logout,
      refresh,
      esAdmin,
      esOp,
    }),
    [usuario, isAuthenticated, loading, login, logout, refresh, esAdmin, esOp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
