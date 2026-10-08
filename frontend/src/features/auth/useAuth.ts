/**
   frontend/src/features/auth/useAuth.ts

   Punto único de acceso al contexto de autenticación.

   El contexto (AuthContext) vive en AuthContext.ts y el provider en
   AuthProvider.tsx; el hook queda acá, que es donde lo importan App,
   RequireAuth, ChecklistPage, HistorialPlanesPage, PlanForm y LoginPage.
 */

import { useContext } from "react";
import { AuthContext, type AuthContextType } from "./AuthContext";

export type { AuthContextType };

// Hook para consumir el contexto de autenticación.
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};
