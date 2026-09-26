import { Box, ChakraProvider, Flex, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { NavBar } from "./components/layout";
import EquiposPage from "./pages/EquiposPage";
import InsumoPage from "./pages/InsumoPage";
import SectorPage from "./pages/SectorPage";
import UnidadMedidaPage from "./pages/UnidadMedidaPage";
import PersonalPage from "./pages/PersonalPage";
import CapacidadPage from "./pages/CapacidadPage";
import ChecklistPage from "./pages/ChecklistPage";
import HistorialChecklistPage from "./pages/HistorialChecklistPage";

// Layout con la barra lateral verde para el mundo Administrador
function AdminLayout() {
  return (
    <Flex minH="100vh" w="100%">
      <NavBar />
      <Box bg="gray.100" flex="1" minW="0">
        <Outlet />
      </Box>
    </Flex>
  );
}

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <Routes>
          {/* Redirección inicial */}
          <Route path="/" element={<Navigate to="/equipos" replace />} />

          {/* 1. Vistas de Administración (Llevan la barra lateral verde) */}
          <Route element={<AdminLayout />}>
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/insumos" element={<InsumoPage />} />
            <Route path="/sectores" element={<SectorPage />} />
            <Route path="/unidades-de-medida" element={<UnidadMedidaPage />} />
            <Route path="/personal" element={<PersonalPage />} />
            <Route path="/capacidades" element={<CapacidadPage />} />
            <Route path="/historial" element={<HistorialChecklistPage />} />
          </Route>

          {/* 2. Vista del Operario: 100% Full Width, sin barra lateral */}
          <Route path="/checklist" element={<ChecklistPage />} />

          {/* Ruta por si se escribe una URL que no existe */}
          <Route
            path="*"
            element={
              <Box p={4} textAlign="center">
                <h2>Página no encontrada</h2>
              </Box>
            }
          />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  );
}