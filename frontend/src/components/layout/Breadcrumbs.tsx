import { Fragment } from "react";
import { Breadcrumb } from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";

interface BreadcrumbsProps {
  homeLabel?: string;
  homePath?: string;
}

interface MigaItem {
  nombre: string;
  to: string;
  esLink: boolean;
}

// Mapa de nombres legibles para cada segmento de ruta
const NOMBRES_RUTA: Record<string, string> = {
  // Raíces principales
  dashboard: "Dashboard",
  checklist: "Checklist Diario",
  vencimientos: "Vencimientos",
  incidentes: "Incidentes",
  "incidentes-reportados": "Incidentes Reportados",
  documentos: "Gestión documental",
  equipos: "Equipos",
  personal: "Personal",
  sectores: "Sectores",
  insumos: "Insumos",
  "insumos-quimicos": "Insumos Químicos",
  "elementos-limpieza": "Elementos de limpieza",
  productos: "Productos",
  "unidades-de-medida": "Unidades de medida",
  capacidades: "Capacidades",
  "documentos-personal": "Documentos del personal",
  "plan-poes": "Plan Vigente",
  "nuevo-plan": "Nuevo Plan",
  "historial-planes": "Historial de planes",
  recetas: "Recetas",
  "nueva-receta": "Nueva Receta",
  lotes: "Lotes",
  "historial-lotes": "Historial de Lotes",
  "vista-publica": "Vista pública",
  historial: "Historial de Checklist",

  // Sub-rutas
  versiones: "Versiones",
  pdf: "Visor PDF",
  registrar: "Registrar",
  "mis-lotes": "Mis Lotes",
  editar: "Editar",
  nuevo: "Nuevo",
  ver: "Ver",
};

// Segmentos que no tienen página propia directa: se muestran pero sin navegación
const SIN_LINK = new Set(["versiones", "pdf", "editar", "ver", "nuevo", "registrar"]);

// Jerarquías lógicas conocidas para rutas de primer nivel que dependen de otra pantalla
const PADRES_LOGICOS: Record<string, { to: string; nombre: string }> = {
  capacidades: { to: "/personal", nombre: "Personal" },
  "documentos-personal": { to: "/personal", nombre: "Personal" },
  "unidades-de-medida": { to: "/insumos", nombre: "Insumos" },
};

// Segmentos dinámicos (IDs numéricos o UUIDs)
const esId = (s: string) =>
  /^\d+$/.test(s) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const legible = (segmento: string) =>
  NOMBRES_RUTA[segmento] ??
  segmento.charAt(0).toUpperCase() + segmento.slice(1).replace(/-/g, " ");

export const Breadcrumbs = ({ homeLabel, homePath }: BreadcrumbsProps) => {
  const location = useLocation();
  const { pathname, state } = location;
  const segmentos = pathname.split("/").filter(Boolean);

  // 1. Detectar si la navegación vino desde una card del Dashboard
  const vinoDesdeDashboard = state && typeof state === "object" && (state as any).origen === "dashboard";

  // 2. Si la ruta es exactamente la raíz (o dashboard/checklist puro)
  if (segmentos.length === 0) {
    return null;
  }

  const primerSegmento = segmentos[0];

  // Caso especial: si viene origen dinámico en el state (ej: { from: "/productos", label: "Productos" })
  const origenState = state && typeof state === "object" ? (state as any) : null;
  let dynamicFrom = origenState?.from;
  let dynamicLabel = origenState?.label;

  // Fallbacks si sólo vino la propiedad origen
  if (!dynamicFrom || !dynamicLabel) {
    if (origenState?.origen === "nuevo-plan") {
      dynamicFrom = "/nuevo-plan";
      dynamicLabel = "Nuevo Plan";
    } else if (
      origenState?.origen === "plan-vigente" ||
      origenState?.origen === "plan-poes" ||
      origenState?.origen === "plan-activo"
    ) {
      dynamicFrom = "/plan-poes";
      dynamicLabel = "Plan Vigente";
    } else if (origenState?.origen === "nueva-receta") {
      dynamicFrom = "/nueva-receta";
      dynamicLabel = "Nueva Receta";
    } else if (origenState?.origen === "receta-activa") {
      dynamicFrom = "/recetas";
      dynamicLabel = "Receta Activa";
    }
  }

  if (segmentos.length === 1 && dynamicFrom && dynamicLabel) {
    const migas: MigaItem[] = [
      { nombre: dynamicLabel, to: dynamicFrom, esLink: true },
      { nombre: legible(primerSegmento), to: `/${primerSegmento}`, esLink: false },
    ];
    return renderBreadcrumb(migas);
  }

  // Caso especial: si es una ruta subordinada directa definida en PADRES_LOGICOS (ej: /capacidades)
  if (segmentos.length === 1 && PADRES_LOGICOS[primerSegmento]) {
    const padre = PADRES_LOGICOS[primerSegmento];
    const migas: MigaItem[] = [
      { nombre: padre.nombre, to: padre.to, esLink: true },
      { nombre: legible(primerSegmento), to: `/${primerSegmento}`, esLink: false },
    ];
    return renderBreadcrumb(migas);
  }

  // Si vino derivado de una card del Dashboard (ej: Dashboard -> /vencimientos)
  if (vinoDesdeDashboard && primerSegmento !== "dashboard") {
    const migas: MigaItem[] = [
      { nombre: "Dashboard", to: "/dashboard", esLink: true },
      { nombre: legible(primerSegmento), to: `/${primerSegmento}`, esLink: false },
    ];
    return renderBreadcrumb(migas);
  }

  // 3. Caso general: la ruta arranca desde su propio módulo (ej: SideBar -> /recetas, /personal, /vencimientos)
  // Construir las migas filtrando IDs dinámicos
  const migas: MigaItem[] = [];
  let pathAcumulado = "";

  for (let i = 0; i < segmentos.length; i++) {
    const seg = segmentos[i];
    pathAcumulado += `/${seg}`;

    if (esId(seg)) {
      // Si es un id al final de la ruta (ej: /recetas/12), agregamos la entidad
      if (i === segmentos.length - 1 && segmentos[0] === "recetas") {
        migas.push({
          nombre: origenState?.label || "Receta Activa",
          to: pathAcumulado,
          esLink: false,
        });
      }
      continue;
    }

    const esUltima = i === segmentos.length - 1;
    const puedeTenerLink = !esUltima && !SIN_LINK.has(seg);

    // Casos particulares de subrutas compuestas
    if (
      seg === "historial" &&
      i > 0 &&
      (segmentos[i - 1] === "documentos" || segmentos[0] === "documentos")
    ) {
      migas.push({
        nombre: "Historial de versiones",
        to: pathAcumulado,
        esLink: puedeTenerLink,
      });
      continue;
    }

    migas.push({
      nombre: legible(seg),
      to: pathAcumulado,
      esLink: puedeTenerLink,
    });
  }

  // Si por los filtros de ID no quedó ninguna miga válida
  if (migas.length === 0) {
    return null;
  }

  // Si la ruta es solo 1 nivel (ej: /recetas, /checklist, /dashboard, /vencimientos)
  // Muestra solo ese nombre ("Recetas", "Checklist Diario", etc.)
  return renderBreadcrumb(migas);
};

function renderBreadcrumb(migas: MigaItem[]) {
  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        {migas.map((miga, index) => {
          const esUltima = index === migas.length - 1;

          return (
            <Fragment key={miga.to || index}>
              <Breadcrumb.Item>
                {esUltima || !miga.esLink ? (
                  <Breadcrumb.CurrentLink
                    as="span"
                    fontSize="sm"
                    fontWeight={esUltima ? "medium" : "normal"}
                    color={esUltima ? "green.700" : "gray.600"}
                    _dark={{
                      color: esUltima ? "green.300" : "gray.400",
                    }}
                  >
                    {miga.nombre}
                  </Breadcrumb.CurrentLink>
                ) : (
                  <Breadcrumb.Link asChild>
                    <RouterLink
                      to={miga.to}
                      style={{
                        fontSize: "sm",
                        fontWeight: "normal",
                        color: "gray.600",
                        textDecoration: "none",
                      }}
                    >
                      {miga.nombre}
                    </RouterLink>
                  </Breadcrumb.Link>
                )}
              </Breadcrumb.Item>
              {!esUltima && (
                <Breadcrumb.Separator
                  fontSize="sm"
                  color="gray.400"
                  mx={1}
                  _dark={{ color: "gray.500" }}
                >
                  /
                </Breadcrumb.Separator>
              )}
            </Fragment>
          );
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}