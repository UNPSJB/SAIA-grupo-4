import { Box, ChakraProvider, Flex, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/layout";
import { AuthProvider } from "./features/auth/AuthProvider";
import { useAuth } from "./features/auth/useAuth";
import { RequireAuth } from "./features/auth/RequireAuth";
import LoginPage from "./pages/LoginPage";
import EquiposPage from "./pages/EquiposPage";
import InsumoPage from "./pages/InsumoPage";
import SectorPage from "./pages/SectorPage";
import UnidadMedidaPage from "./pages/UnidadMedidaPage";

function AppContent() {
  const { usuario, logout } = useAuth();

  // RAMA SIN SESIÓN: solo existe la vista de login. Cualquier otra URL
  // redirige a "/". No se renderiza el NavBar ni contenido de gestión.
  if (!usuario) {
    return (
      <Routes>
        <Route path='/' element={<LoginPage />} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    );
  }

  // RAMA CON SESIÓN: layout completo (NavBar + rutas protegidas).
  return (
    <Flex minH='100vh' w='100%'>
      <NavBar username={usuario.documento} onLogout={logout} />
      <Box bg='gray.100' flex='1' minW='0'>
        <Routes>
          {/* La raíz, estando logueado, va a /equipos */}
          <Route path='/' element={<Navigate to='/equipos' replace />} />

          {/* Rutas activas (con guardia de autenticación) */}
          <Route
            path='/equipos'
            element={
              <RequireAuth>
                <EquiposPage />
              </RequireAuth>
            }
          />
          <Route
            path='/insumos'
            element={
              <RequireAuth>
                <InsumoPage />
              </RequireAuth>
            }
          />
          <Route
            path='/sectores'
            element={
              <RequireAuth>
                <SectorPage />
              </RequireAuth>
            }
          />
          <Route
            path='/unidades-de-medida'
            element={
              <RequireAuth>
                <UnidadMedidaPage />
              </RequireAuth>
            }
          />

          {/* Ruta por si se escribe una URL que no existe */}
          <Route
            path='*'
            element={
              <Box p={4} textAlign='center'>
                <h2>Página no encontrada</h2>
              </Box>
            }
          />
        </Routes>
      </Box>
    </Flex>
  );
}

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      {/* AuthProvider para que cualquier componente use useAuth() */}
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ChakraProvider>
  );
}
