import { Fragment } from "react";
import { Breadcrumb } from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";

interface BreadcrumbsProps {
  homeLabel: string;
  homePath: string;
}

// Mapa completo de nombres legibles para cada segmento de ruta
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

  // Sub-rutas (segundo nivel en adelante)
  versiones: "Versiones",
  pdf: "Visor PDF",
  registrar: "Registrar",
  "mis-lotes": "Mis Lotes",
  editar: "Editar",
  nuevo: "Nuevo",
  ver: "Ver",
};

// Segmentos que no tienen página propia: se muestran pero sin link
const SIN_LINK = new Set(["versiones", "pdf", "editar", "ver", "nuevo", "registrar"]);

// Segmentos dinámicos (ids numéricos o UUID): no se muestran como miga
const esId = (s: string) =>
  /^\d+$/.test(s) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const legible = (segmento: string) =>
  NOMBRES_RUTA[segmento] ??
  segmento.charAt(0).toUpperCase() + segmento.slice(1).replace(/-/g, " ");

export const Breadcrumbs = ({ homeLabel, homePath }: BreadcrumbsProps) => {
  const { pathname } = useLocation();
  const segmentos = pathname.split("/").filter(Boolean);

  // Filtrar IDs y segmentos vacíos
  const migasValidas = segmentos.filter((s) => !esId(s));

  // Si estamos en la home, solo mostramos el home
  if (
    migasValidas.length === 0 ||
    (migasValidas.length === 1 && migasValidas[0] === homePath.replace("/", ""))
  ) {
    return (
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink as="span" fontSize="sm" fontWeight="medium" color="green.700">
              {homeLabel}
            </Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    );
  }

  // Construir el path del home
  const homeSegmento = homePath.replace("/", "");

  // Verificar si el primer segmento ya es el home
  const empiezaEnHome = migasValidas[0] === homeSegmento;

  // Las migas a mostrar: home + resto de segmentos válidos (sin duplicar home)
  const migasAmostrar = empiezaEnHome
    ? migasValidas
    : [homeSegmento, ...migasValidas];

  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        {migasAmostrar.map((segmento, index) => {
          const esUltima = index === migasAmostrar.length - 1;
          const esHome = index === 0 && segmento === homeSegmento;
          const nombre = esHome ? homeLabel : legible(segmento);
          const to = "/" + migasAmostrar.slice(0, index + 1).join("/");

          return (
            <Fragment key={to}>
              <Breadcrumb.Item>
                {esUltima || SIN_LINK.has(segmento) ? (
                  <Breadcrumb.CurrentLink
                    as="span"
                    fontSize="sm"
                    fontWeight={esUltima ? "medium" : "normal"}
                    color={esUltima ? "green.700" : "gray.600"}
                    _dark={{
                      color: esUltima ? "green.300" : "gray.400",
                    }}
                  >
                    {nombre}
                  </Breadcrumb.CurrentLink>
                ) : (
                  <Breadcrumb.Link asChild>
                    <RouterLink
                      to={to}
                      style={{
                        fontSize: "sm",
                        fontWeight: "normal",
                        color: "gray.600",
                        textDecoration: "none",
                      }}
                    >
                      {nombre}
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
};