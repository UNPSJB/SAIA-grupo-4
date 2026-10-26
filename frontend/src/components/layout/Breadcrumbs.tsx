import { Fragment } from "react";
import { Breadcrumb } from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";

// Primer segmento de la URL (módulo).
const NOMBRES_RAIZ: Record<string, string> = {
  equipos: "Equipos",
  personal: "Personal",
  sectores: "Sectores",
  insumos: "Insumos",
  "insumos-quimicos": "Insumos Químicos",
  "elementos-limpieza": "Elementos de limpieza",
  "unidades-de-medida": "Unidades de medida",
  capacidades: "Capacidades",
  "documentos-personal": "Documentos del personal",
  "plan-poes": "Plan Vigente",
  "nuevo-plan": "Nuevo Plan",
  "historial-planes": "Historial de planes",
  vencimientos: "Vencimientos",
  checklist: "Checklist Diario",
  historial: "Historial de Checklist",
  incidentes: "Incidentes",
  documentos: "Gestión documental",
};

// Segmentos desde el segundo nivel en adelante.
const NOMBRES_SUB: Record<string, string> = {
  historial: "Historial de versiones",
  versiones: "Versiones",
  pdf: "Visor PDF",
};

// Segmentos que no tienen página propia: se muestran pero sin link.
const SIN_LINK = new Set(["versiones"]);

// Segmentos dinámicos (ids numéricos o UUID): no se muestran como miga.
const esId = (s: string) =>
  /^\d+$/.test(s) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const legible = (s: string, nivel: number) =>
  (nivel === 0 ? NOMBRES_RAIZ : NOMBRES_SUB)[s] ??
  s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const segmentos = pathname.split("/").filter(Boolean);

  const migas = segmentos
    .map((segmento, nivel) => ({
      segmento,
      nivel,
      to: "/" + segmentos.slice(0, nivel + 1).join("/"),
    }))
    .filter(({ segmento }) => !esId(segmento));

  if (migas.length === 0) {
    return (
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink>Inicio</Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    );
  }

  return (
    <Breadcrumb.Root>
      <Breadcrumb.List>
        {migas.map(({ segmento, nivel, to }, i) => {
          const esUltima = i === migas.length - 1;
          const nombre = legible(segmento, nivel);

          return (
            <Fragment key={to}>
              <Breadcrumb.Item>
                {esUltima || SIN_LINK.has(segmento) ? (
                  <Breadcrumb.CurrentLink>{nombre}</Breadcrumb.CurrentLink>
                ) : (
                  <Breadcrumb.Link asChild>
                    <RouterLink to={to}>{nombre}</RouterLink>
                  </Breadcrumb.Link>
                )}
              </Breadcrumb.Item>
              {!esUltima && <Breadcrumb.Separator />}
            </Fragment>
          );
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
};