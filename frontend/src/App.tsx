import { useState } from "react";
import { Box, ChakraProvider, Flex, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FiArchive, FiCheckSquare, FiClock, FiPlus } from "react-icons/fi";
import { SideBar, OperadorLayout, type NavItem } from "./components/layout";
import { AlertConfirm, LoadingState } from "./components/ui";
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
import DocumentoPersonalPage from "./pages/DocumentoPersonalPage";
import ElementosLimpiezaPage from "./pages/ElementosLimpiezaPage";
import InsumoQuimicoPage from "./pages/InsumoQuimicoPage";
import PlanPage from "./pages/PlanPage";
import NuevoPlanPage from "./pages/NuevoPlanPage";
import HistorialPlanesPage from "./pages/HistorialPlanesPage";
import RecetasPage from "./pages/RecetasPage";
import NuevaRecetaPage from "./pages/NuevaRecetaPage";
import RecetaWorkspace from "./features/recetas/RecetaWorkspace";
import ChecklistPage from "./pages/ChecklistPage";
import HistorialChecklistPage from "./pages/HistorialChecklistPage";
import IncidentesPage from "./pages/IncidentesPage";
import VencimientosPage from "./pages/VencimientosPage";
import { RenovacionProvider } from "./features/vencimientos/RenovacionProvider";
import DocumentosPage from "./pages/DocumentosPage";
import DocumentosOperadorPage from "./pages/DocumentosOperadorPage";
import RecetasOperadorPage from "./pages/RecetasOperadorPage";
import { FichaRecetaOperador } from "./features/recetas/FichaRecetaOperador";
import HistorialVersionesPage from "./pages/HistorialVersionesPage";
import VisorPdfPage from "./pages/VisorPdfPage";
import IncidentesReportadosPage from "./pages/IncidentesReportadosPage";
import ProductosPage from "./pages/ProductosPage";
import LotesOperadorPage from "./pages/LotesOperadorPage";
import HistorialLotesPage from "./pages/HistorialLotesPage";
import DashboardPage from "./pages/DashboardPage";
import VistaPublicaPage from "./pages/VistaPublicaPage";
import VistaPublicaPublicaPage from "./pages/VistaPublicaVisitantePage";

const CHECKLIST_ITEMS: NavItem[] = [
  { to: "/checklist", label: "Checklist Diario", icon: FiCheckSquare },
  { to: "/historial", label: "Historial de Checklist", icon: FiArchive },
];

const LOTES_ITEMS: NavItem[] = [
  { to: "/lotes", label: "Nuevo Lote", icon: FiPlus },
  { to: "/historial-lotes", label: "Historial de Lotes", icon: FiClock },
];

function AppContent() {
  const { usuario, logout, loading } = useAuth();
  const [cerrarSesionAbierto, setCerrarSesionAbierto] = useState(false);

  // Mientras se rehidrata la sesión (refresh por cookie al recargar) todavía no
  // sabemos si hay sesión: mostramos un estado de carga. Evita el parpadeo del
  // login y que la rama sin sesión redirija y pierda la URL solicitada.
  if (loading) {
    return <LoadingState message='Cargando sesión...' />;
  }

  // RAMA SIN SESIÓN: solo existe la vista de login. Cualquier otra URL
  // redirige a "/". No se renderiza el SideBar ni contenido de gestión.
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

  // RAMA OPERADOR: quien no tiene "administrar". Ahora usa un layout propio
  // (OperadorLayout) con barra lateral responsiva: Checklist Diario + Documentos.
  // El logout vive en el layout. Entra directo al checklist diario.
  if (!esAdmin) {
    return (
      <OperadorLayout>
        <Routes>
          <Route path='/' element={<Navigate to='/checklist' replace />} />
          <Route
            path='/checklist'
            element={
              <RequireAuth>
                <ChecklistPage mostrarBarraInstitucional={false} />
              </RequireAuth>
            }
          />
          <Route
            path='/recetas'
            element={
              <RequireAuth>
                <RecetasOperadorPage />
              </RequireAuth>
            }
          />
          <Route
            path='/recetas/:id'
            element={
              <RequireAuth>
                <FichaRecetaOperador />
              </RequireAuth>
            }
          />
          <Route
            path='/documentos'
            element={
              <RequireAuth>
                <DocumentosOperadorPage />
              </RequireAuth>
            }
          />
          <Route
            path='/documentos/:id/versiones/:versionId/pdf'
            element={
              <RequireAuth>
                <VisorPdfPage />
              </RequireAuth>
            }
          />
          <Route
            path='/incidentes-reportados'
            element={
              <RequireAuth>
                <IncidentesReportadosPage />
              </RequireAuth>
            }
          />
          {/* Rutas Lotes Operador */}
          <Route
            path='/lotes'
            element={
              <RequireAuth>
                <LotesOperadorPage />
              </RequireAuth>
            }
          />
          <Route
            path='/lotes/mis-lotes'
            element={<Navigate to='/lotes' replace />}
          />
          <Route
            path='/lotes/registrar'
            element={<Navigate to='/lotes?crear=true' replace />}
          />
          <Route path='/lotes/historial' element={<Navigate to='/lotes' replace />} />
          <Route path='*' element={<Navigate to='/checklist' replace />} />
        </Routes>
      </OperadorLayout>
    );
  }

  // Accesos a checklists según las capacidades del usuario:
  // - administra + opera: grupo colapsable con nuevo lote y el historial.
  // - solo administra: únicamente el historial, como botón directo.
  const checklistItems = esOp ? CHECKLIST_ITEMS : [CHECKLIST_ITEMS[1]];
  const loteItems = esOp ? LOTES_ITEMS : [LOTES_ITEMS[1]];

  // RAMA ADMINISTRADOR: layout completo (SideBar + rutas protegidas).
  return (
    <>
      <Flex minH='100vh' w='100%'>
        <SideBar
          username={`${usuario.nombre} ${usuario.apellido}`}
          checklistItems={checklistItems}
          checklistColapsable={esOp}
          loteItems={loteItems}
          loteColapsable={esOp}
          onLogout={() => setCerrarSesionAbierto(true)}
        />
        <Box bg='gray.100' flex='1' minW='0'>
          <Routes>
            {/* La raíz, estando logueado, va a /dashboard */}
            <Route path='/' element={<Navigate to='/dashboard' replace />} />

            {/* Rutas activas (con guardia de autenticación) */}
            <Route
              path='/dashboard'
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path='/vista-publica'
              element={
                <RequireAuth>
                  <VistaPublicaPage />
                </RequireAuth>
              }
            />
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
              path='/productos'
              element={
                <RequireAuth>
                  <ProductosPage />
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
            <Route
              path='/documentos-personal'
              element={
                <RequireAuth>
                  <DocumentoPersonalPage />
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
            {/* Rutas Recetas */}
            <Route
              path='/recetas'
              element={
                <RequireAuth>
                  <RecetasPage />
                </RequireAuth>
              }
            />
            <Route
              path='/recetas/:recetaId'
              element={
                <RequireAuth>
                  <RecetaWorkspace />
                </RequireAuth>
              }
            />
            <Route
              path='/nueva-receta'
              element={
                <RequireAuth>
                  <NuevaRecetaPage />
                </RequireAuth>
              }
            />
            <Route
              path='/historial-recetas'
              element={<Navigate to='/recetas' replace />}
            />
            <Route
              path='/receta-workspace'
              element={<Navigate to='/recetas' replace />}
            />

            {/* Rutas Lotes */}
            {esOp ? (
              <>
                <Route
                  path='/lotes'
                  element={
                    <RequireAuth>
                      <LotesOperadorPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path='/lotes/registrar'
                  element={<Navigate to='/lotes?crear=true' replace />}
                />
                <Route
                  path='/lotes/mis-lotes'
                  element={<Navigate to='/lotes' replace />}
                />
              </>
            ) : (
              <>
                <Route
                  path='/lotes'
                  element={<Navigate to='/historial-lotes' replace />}
                />
                <Route
                  path='/lotes/registrar'
                  element={<Navigate to='/historial-lotes' replace />}
                />
                <Route
                  path='/lotes/mis-lotes'
                  element={<Navigate to='/historial-lotes' replace />}
                />
              </>
            )}
            <Route
              path='/historial-lotes'
              element={
                <RequireAuth>
                  <HistorialLotesPage />
                </RequireAuth>
              }
            />
            <Route
              path='/lotes/historial'
              element={<Navigate to='/historial-lotes' replace />}
            />

            <Route
              path='/vencimientos'
              element={
                <RequireAuth>
                  <VencimientosPage />
                </RequireAuth>
              }
            />

            {/* Checklists. El diario requiere "administrar" + "operar": quien solo
                administra no lo ve en el SideBar y, si escribe la URL a mano, cae
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
              <Route
                path='/checklist'
                element={<Navigate to='/historial' replace />}
              />
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
                  <IncidentesPage />
                </RequireAuth>
              }
            />

            {/* Rutas Documentos */}
            <Route
              path='/documentos'
              element={
                <RequireAuth>
                  <DocumentosPage />
                </RequireAuth>
              }
            />
            <Route
              path='/documentos/:id/historial'
              element={
                <RequireAuth>
                  <HistorialVersionesPage />
                </RequireAuth>
              }
            />
            <Route
              path='/documentos/:id/versiones/:versionId/pdf'
              element={
                <RequireAuth>
                  <VisorPdfPage />
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

function AppInterno() {
  return (
    <AuthProvider>
      {/*
        El modal de renovacion vive aca y no en la campana: la campana esta
        dentro de un Popover que se cierra en el mismo tick que el modal se
        abre, y los dos overlays se pisan. Fuera del SideBar el Dialog no
        comparte arbol con nadie.
      */}
      <RenovacionProvider>
        <AppContent />
      </RenovacionProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <Routes>
          {/*
            La vista pública se resuelve antes del árbol de autenticación: no
            debe intentar rehidratar sesión, redirigir al login ni enviar
            credenciales.
          */}
          <Route path='/publico/:token' element={<VistaPublicaPublicaPage />} />
          <Route path='/publico/*' element={<VistaPublicaPublicaPage />} />
          <Route path='*' element={<AppInterno />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  );
}
