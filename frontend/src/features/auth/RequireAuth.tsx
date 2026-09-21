import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";

// Guardia de ruta: si no hay sesión, redirige a "/" (login).
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to='/' replace />;

  return children;
};