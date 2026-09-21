import { createContext, useContext } from "react";
import type { UsuarioLogueado } from "./types";

export interface AuthContextValue {
  usuario: UsuarioLogueado | null; // null = sin sesión
  login: (documento: string) => Promise<UsuarioLogueado>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Hook de acceso. Lanza error si se usa fuera del <AuthProvider>.
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
};