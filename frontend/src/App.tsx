import { useState } from "react";
import { Box, ChakraProvider, Flex, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NavBar } from "./components/layout";
import { AlertConfirm } from "./components/ui";
import { AuthProvider } from "./features/auth/AuthProvider";
import { useAuth } from "./features/auth/useAuth";
import { esAdministrador } from "./features/auth/roles";
import { RequireAuth } from "./features/auth/RequireAuth";
import LoginPage from "./pages/LoginPage";
import OperadorPage from "./pages/OperadorPage";
import EquiposPage from "./pages/EquiposPage";
import InsumoPage from "./pages/InsumoPage";
import SectorPage from "./pages/SectorPage";
import UnidadMedidaPage from "./pages/UnidadMedidaPage";
import PersonalPage from "./pages/PersonalPage";
import CapacidadPage from "./pages/CapacidadPage";
import PlanPage from "./pages/PlanPage";
import NuevoPlanPage from "./pages/NuevoPlanPage";
import HistorialPlanesPage from "./pages/HistorialPlanesPage";

function AppContent() {
  const { usuario, logout } = useAuth();
  const [cerrarSesionAbierto, setCerrarSesionAbierto] = useState(false);

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

  // RAMA OPERADOR: quien no tiene "administrar", sin NavBar, solo su vista.
  // Cualquier ruta de gestión queda bloqueada y redirige a /operador.
  if (!esAdministrador(usuario)) {
    return (
      <>
        <Routes>
          <Route path='/' element={<Navigate to='/operador' replace />} />
          <Route path='/operador' element={<OperadorPage />} />
          <Route path='*' element={<Navigate to='/operador' replace />} />
        </Routes>
        <AlertConfirm
          open={cerrarSesionAbierto}
          title='Cerrar sesión'
          message='¿Estás seguro de que querés cerrar tu sesión?'
          onConfirm={() => {
            setCerrarSesionAbierto(false);
            logout();
          }}
          onCancel={() => setCerrarSesionAbierto(false)}
        />
      </>
    );
  }

  // RAMA ADMINISTRADOR: layout completo (NavBar + rutas protegidas).
  return (
    <>
      <Flex minH='100vh' w='100%'>
        <NavBar
          username={`${usuario.nombre} ${usuario.apellido}`}
          onLogout={() => setCerrarSesionAbierto(true)}
        />
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
              path='/personal'
              element={
                <RequireAuth>
                  <PersonalPage />
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
            <Route
              path='/capacidades'
              element={
                <RequireAuth>
                  <CapacidadPage />
                </RequireAuth>
              }
            />

            <Route
              path='/plan-poes'
              element={
                <RequireAuth>
                  <PlanPage />{" "}
                </RequireAuth>
              }
            />

            <Route
              path='/nuevo-plan'
              element={
                <RequireAuth>
                  <NuevoPlanPage />{" "}
                </RequireAuth>
              }
            />

            <Route
              path='/historial-planes'
              element={
                <RequireAuth>
                  <HistorialPlanesPage />
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
      <AlertConfirm
        open={cerrarSesionAbierto}
        title='Cerrar sesión'
        message='¿Estás seguro de que querés cerrar tu sesión?'
        onConfirm={() => {
          setCerrarSesionAbierto(false);
          logout();
        }}
        onCancel={() => setCerrarSesionAbierto(false)}
      />
    </>
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
