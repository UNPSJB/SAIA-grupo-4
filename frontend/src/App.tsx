import { useState } from "react";
import { Box, ChakraProvider, Flex, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FiArchive, FiCheckSquare } from "react-icons/fi";
import { NavBar, type NavItem } from "./components/layout";
import { AlertConfirm } from "./components/ui";
import { AuthProvider } from "./features/auth/AuthProvider";
import { useAuth } from "./features/auth/useAuth";
import { esAdministrador, esOperador } from "./features/auth/roles";
import { RequireAuth } from "./features/auth/RequireAuth";
import LoginPage from "./pages/LoginPage";
import EquiposPage from "./pages/EquiposPage";
import InsumoPage from "./pages/InsumoPage";
import SectorPage from "./pages/SectorPage";
import UnidadMedidaPage from "./pages/UnidadMedidaPage";
import PersonalPage from "./pages/PersonalPage";
import CapacidadPage from "./pages/CapacidadPage";
import ElementosLimpiezaPage from "./pages/ElementosLimpiezaPage";
import InsumoQuimicoPage from "./pages/InsumoQuimicoPage";
import PlanPage from "./pages/PlanPage";
import NuevoPlanPage from "./pages/NuevoPlanPage";
import HistorialPlanesPage from "./pages/HistorialPlanesPage";
import ChecklistPage from "./pages/ChecklistPage";
import HistorialChecklistPage from "./pages/HistorialChecklistPage";
import ListadoIncidentesPage from "./pages/IncidentesPage";

const CHECKLIST_ITEMS: NavItem[] = [
  { to: "/checklist", label: "Checklist Diario", icon: FiCheckSquare },
  { to: "/historial", label: "Historial de Checklist", icon: FiArchive },
];

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

  const esAdmin = esAdministrador(usuario);
  const esOp = esOperador(usuario);

  // RAMA OPERADOR: quien no tiene "administrar", sin NavBar, solo su vista.
  // Cualquier ruta de gestión queda bloqueada y redirige a /checklist.
  // El logout vive en ChecklistPage, que es quien muestra la barra propia.
  if (!esAdmin) {
    return (
      <Routes>
        <Route path='/' element={<Navigate to='/checklist' replace />} />
        <Route path='/checklist' element={<ChecklistPage />} />
        <Route path='*' element={<Navigate to='/checklist' replace />} />
      </Routes>
    );
  }

  // Accesos a checklists según las capacidades del usuario:
  // - administra + opera: grupo colapsable con el checklist diario y el historial.
  // - solo administra: únicamente el historial, como botón directo.
  const checklistItems = esOp ? CHECKLIST_ITEMS : [CHECKLIST_ITEMS[1]];

  // RAMA ADMINISTRADOR: layout completo (NavBar + rutas protegidas).
  return (
    <>
      <Flex minH='100vh' w='100%'>
        <NavBar
          username={`${usuario.nombre} ${usuario.apellido}`}
          checklistItems={checklistItems}
          checklistColapsable={esOp}
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
              path='/insumos-quimicos'
              element={
                <RequireAuth>
                  <InsumoQuimicoPage />
                </RequireAuth>
              }
            />
            <Route
              path='/elementos-limpieza'
              element={
                <RequireAuth>
                  <ElementosLimpiezaPage />
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

            {/* Rutas Plan POES */}
            <Route
              path='/plan-poes'
              element={
                <RequireAuth>
                  <PlanPage />
                </RequireAuth>
              }
            />
            <Route
              path='/nuevo-plan'
              element={
                <RequireAuth>
                  <NuevoPlanPage />
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

            {/* Checklists. El diario requiere "administrar" + "operar": quien solo
                administra no lo ve en el NavBar y, si escribe la URL a mano, cae
                en su vista habilitada (/historial). */}
            {esOp ? (
              <Route
                path='/checklist'
                element={
                  <RequireAuth>
                    <ChecklistPage mostrarBarraInstitucional={false} />
                  </RequireAuth>
                }
              />
            ) : (
              <Route path='/checklist' element={<Navigate to='/historial' replace />} />
            )}
            <Route
              path='/historial'
              element={
                <RequireAuth>
                  <HistorialChecklistPage />
                </RequireAuth>
              }
            />
            <Route
              path='/incidentes'
              element={
                <RequireAuth>
                  <ListadoIncidentesPage />
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