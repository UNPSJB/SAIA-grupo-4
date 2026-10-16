/**
  frontend/src/features/auth/AuthProvider.tsx
  Contexto de autenticación con rehidratación asíncrona de sesión.

  Inicialización (al montar):
  1. Si hay un access token en memoria, lo valida con GET /auth/me.
  2. Si falla con 401 → intenta PUT /auth/token (refresh) usando la cookie
      httpOnly para rehidratar sesión automáticamente (útil al recargar página).
  3. Mientras esto ocurre, `loading = true` para evitar parpadeos en rutas protegidas.

  Renovación:
  - Tras cada login/refresh se programa un refresh proactivo poco antes de que
    venza el access token, para no depender de que llegue un 401.
  - Un fallo transitorio (red/5xx) nunca cierra la sesión: se reintenta. Sólo un
    401/403 confirmado por el backend desloguea.

  Expone login/logout, usuario, isAuthenticated, loading, esAdmin, esOperador.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Persona } from "../personal/types";
import { authService, AuthError, type TokenResponse } from "./authService";
import { AuthContext } from "./AuthContext";
import { esAdministrador, esOperador } from "./roles";

interface AuthProviderProps {
  children: ReactNode;
}

// Margen con el que se renueva el access token antes de que venza: evita
// depender de que llegue un 401 para refrescar.
const MARGEN_REFRESCO_MS = 2 * 60 * 1000;

// Espera antes de reintentar un refresh que falló de forma transitoria.
const REINTENTO_REFRESCO_MS = 60 * 1000;

// true sólo cuando el backend confirmó que la sesión dejó de valer (401/403).
// Un error de red o un 5xx es transitorio y no debe cerrar la sesión.
function esSesionInvalida(err: unknown): boolean {
  return err instanceof AuthError && (err.status === 401 || err.status === 403);
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [usuario, setUsuario] = useState<Persona | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Timer del refresh proactivo y referencia estable al callback que lo dispara
  // (rompe la dependencia circular entre programar y renovar).
  const refreshTimer = useRef<number | null>(null);
  const renovarRef = useRef<() => void>(() => {});

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
   * Cancela el refresh proactivo pendiente (logout o desmontaje).
   */
  const limpiarRefresco = useCallback(() => {
    if (refreshTimer.current !== null) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  /**
   * Programa el próximo refresh proactivo a partir del vencimiento del access
   * token, para renovarlo antes de que caduque en vez de esperar un 401.
   */
  const programarRefresco = useCallback(() => {
    limpiarRefresco();
    const expira = authService.getAccessTokenExpiryMs();
    if (expira === null) return;
    // Nunca menos de 5s: evita un loop si el token ya venció o está por vencer.
    const espera = Math.max(expira - Date.now() - MARGEN_REFRESCO_MS, 5_000);
    refreshTimer.current = window.setTimeout(() => renovarRef.current(), espera);
  }, [limpiarRefresco]);

  /**
   * Renueva el access token antes de que venza. Si el backend confirma que la
   * sesión es inválida (401/403) cierra sesión; si falla de forma transitoria
   * (red/5xx) reintenta más tarde sin desloguear.
   */
  const renovarProactivamente = useCallback(async () => {
    try {
      const tokenResp = await authService.refresh();
      if (tokenResp?.persona) setUsuario(tokenResp.persona);
      programarRefresco();
    } catch (err) {
      if (esSesionInvalida(err)) {
        clearSession();
        return;
      }
      // Fallo transitorio: reintentar sin cerrar la sesión.
      limpiarRefresco();
      refreshTimer.current = window.setTimeout(
        () => renovarRef.current(),
        REINTENTO_REFRESCO_MS,
      );
    }
  }, [clearSession, programarRefresco, limpiarRefresco]);

  // Mantiene la referencia apuntando al callback vigente de renovación.
  useEffect(() => {
    renovarRef.current = () => void renovarProactivamente();
  }, [renovarProactivamente]);

  /**
   * Rehidrata la sesión al montar el provider.
   * Estrategia: intentar me() primero (si hay token); si 401 → refresh().
   */
  const rehydrateSession = useCallback(async () => {
    // 1) Si hay access token en memoria, validarlo con /auth/me.
    if (authService.getAccessToken()) {
      try {
        const personaActual = await authService.me();
        setUsuario(personaActual);
        setLoading(false);
        programarRefresco();
        return;
      } catch (err) {
        // 401/403 → probar refresh. Otro error (red) → no levantamos sesión,
        // pero tampoco la pisamos: pudo haber sido un fallo transitorio.
        if (!esSesionInvalida(err)) {
          setLoading(false);
          return;
        }
      }
    }

    // 2) Intentar refresh con cookie httpOnly (rehidratación post-recarga).
    try {
      const refreshed = await authService.refresh();
      if (refreshed?.persona) {
        setUsuario(refreshed.persona);
      } else {
        // Sin persona en la respuesta, la completamos con /auth/me.
        const personaActual = await authService.me();
        setUsuario(personaActual);
      }
      programarRefresco();
    } catch (err) {
      if (esSesionInvalida(err)) {
        // Sesión inválida (cookie ausente/expirada): no hay nada que rehidratar.
        clearSession();
      } else {
        // Fallo transitorio: reintentar una vez antes de rendirse.
        try {
          const reintento = await authService.refresh();
          if (reintento?.persona) {
            setUsuario(reintento.persona);
            programarRefresco();
          }
        } catch (err2) {
          if (esSesionInvalida(err2)) clearSession();
        }
      }
    } finally {
      setLoading(false);
    }
  }, [clearSession, programarRefresco]);

  // Ejecuta rehidratación una única vez al montar el AuthProvider.
  useEffect(() => {
    // La rehidratación es async: todos los setState de rehydrateSession
    // ocurren tras un await (me()/refresh()), no en el cuerpo del effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void rehydrateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpia el refresh proactivo pendiente al desmontar el provider.
  useEffect(() => limpiarRefresco, [limpiarRefresco]);

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
      // Programa el refresh proactivo para esta nueva sesión.
      programarRefresco();
      return tokenResp;
    },
    [programarRefresco],
  );

  /**
   * Logout: elimina cookie de refresh y limpia estado local.
   *
   * Es "best effort": sin red el DELETE falla, pero el access token en memoria
   * igual se limpia, así que cerramos la sesión local de todos modos.
   */
  const logout = useCallback(async (): Promise<void> => {
    limpiarRefresco();
    try {
      await authService.logout();
    } catch {
      // Sin red no se pudo avisar al backend; cerramos la sesión local igual.
    }
    setUsuario(null);
  }, [limpiarRefresco]);

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
    // Reprograma el refresh proactivo con el token recién renovado.
    programarRefresco();
    return tokenResp;
  }, [programarRefresco]);

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
