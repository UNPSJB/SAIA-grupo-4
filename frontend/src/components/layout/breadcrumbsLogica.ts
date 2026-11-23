export interface MigaItem {
  nombre: string;
  to: string;
  esLink: boolean;
  state?: unknown;
}

export interface PadreBreadcrumb {
  nombre: string;
  to: string;
}

export interface BreadcrumbLocationState {
  origen?: string;
  from?: string;
  label?: string;
  padre?: PadreBreadcrumb;
  fromPathname?: string;
  fromSearch?: string;
  fromState?: unknown;
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
  "alimentos-referencia": "Alimentos de referencia",
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
  "receta-workspace": "Receta",
  lotes: "Lotes",
  "historial-lotes": "Historial de Lotes",
  "vista-publica": "Vista pública",
  configuracion: "Configuración",
  "configuracion-nutricional": "Configuración nutricional",
  historial: "Historial de Checklist",

  // Sub-rutas
  versiones: "Versiones",
  pdf: "Visor PDF",
  registrar: "Registrar",
  "mis-lotes": "Mis Lotes",
  editar: "Editar",
  nuevo: "Nuevo",
  ver: "Ver",
  "ficha-tecnica": "Ficha Técnica",
  rotulo: "Rótulo CAA",
};

// Segmentos que no tienen página propia directa: se muestran pero sin navegación
const SIN_LINK = new Set(["versiones", "editar", "ver", "nuevo", "registrar"]);

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

function leerState(state: unknown): BreadcrumbLocationState | null {
  return state && typeof state === "object"
    ? (state as BreadcrumbLocationState)
    : null;
}

function migaDesdePadre(padre: PadreBreadcrumb | undefined): MigaItem | null {
  if (!padre?.nombre || !padre?.to) return null;
  return {
    nombre: padre.nombre,
    to: padre.to,
    esLink: true,
  };
}

/**
 * Construye la lista de migas de pan a partir del pathname y el location.state.
 * Cada miga intermedia conserva el `state` necesario para reconstruir su propia
 * jerarquía al retroceder mediante clic en el breadcrumb.
 */
export function construirMigas(
  pathname: string,
  state: unknown,
  profundidad = 0,
): MigaItem[] {
  const segmentos = pathname.split("/").filter(Boolean);

  if (segmentos.length === 0) {
    return [];
  }

  const primerSegmento = segmentos[0];
  const origenState = leerState(state);

  // Navegación desde cualquier vista hacia Configuración (conserva el recorrido completo)
  if (
    profundidad < 4 &&
    (primerSegmento === "configuracion" ||
      primerSegmento === "configuracion-nutricional") &&
    typeof origenState?.fromPathname === "string" &&
    origenState.fromPathname !== pathname
  ) {
    const prevMigas = construirMigas(
      origenState.fromPathname,
      origenState.fromState,
      profundidad + 1,
    ).map((miga, idx, arr) => {
      const esPadreInmediato = idx === arr.length - 1;
      const search =
        esPadreInmediato && typeof origenState.fromSearch === "string"
          ? origenState.fromSearch
          : "";
      const segFinal = miga.to.split("/").filter(Boolean).pop() ?? "";

      return {
        ...miga,
        to: search && !miga.to.includes("?") ? `${miga.to}${search}` : miga.to,
        esLink: esPadreInmediato ? true : !SIN_LINK.has(segFinal),
        state: esPadreInmediato ? origenState.fromState : miga.state,
      };
    });

    return [
      ...prevMigas,
      { nombre: legible(primerSegmento), to: pathname, esLink: false },
    ];
  }

  const vinoDesdeDashboard = origenState?.origen === "dashboard";

  // Caso especial: si viene origen dinámico en el state (ej: { from: "/productos", label: "Productos" })
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
    const migas: MigaItem[] = [];
    const migaPadre = migaDesdePadre(origenState?.padre);
    if (migaPadre) migas.push(migaPadre);

    migas.push({
      nombre: dynamicLabel,
      to: dynamicFrom,
      esLink: true,
      state:
        dynamicFrom.startsWith("/insumos/") && dynamicFrom.endsWith("/lotes")
          ? { label: dynamicLabel }
          : migaPadre
            ? { from: migaPadre.to, label: migaPadre.nombre }
            : undefined,
    });
    migas.push({
      nombre: legible(primerSegmento),
      to: `/${primerSegmento}`,
      esLink: false,
    });
    return migas;
  }

  if (
    segmentos.length === 3 &&
    segmentos[0] === "productos" &&
    segmentos[2] === "rotulo" &&
    dynamicFrom &&
    dynamicLabel &&
    dynamicFrom !== "/productos"
  ) {
    const migas: MigaItem[] = [];
    const migaPadre = migaDesdePadre(origenState?.padre);
    if (migaPadre) migas.push(migaPadre);

    migas.push({
      nombre: dynamicLabel,
      to: dynamicFrom,
      esLink: true,
      state:
        dynamicFrom.startsWith("/insumos/") && dynamicFrom.endsWith("/lotes")
          ? { label: dynamicLabel }
          : migaPadre
            ? { from: migaPadre.to, label: migaPadre.nombre }
            : undefined,
    });
    migas.push({ nombre: legible("rotulo"), to: pathname, esLink: false });
    return migas;
  }

  // Historial de versiones de recetas (operador): /recetas/historial/:productoId
  if (segmentos[0] === "recetas" && segmentos[1] === "historial") {
    return [
      { nombre: legible("recetas"), to: "/recetas", esLink: true },
      { nombre: "Historial de versiones", to: pathname, esLink: false },
    ];
  }

  // Ficha técnica de receta viniendo desde historial de versiones (u otro origen intermedio con padre)
  if (
    segmentos[0] === "recetas" &&
    (segmentos.length === 2 || segmentos[2] === "ficha-tecnica") &&
    dynamicFrom &&
    dynamicLabel &&
    dynamicFrom !== "/recetas" &&
    origenState?.padre?.nombre &&
    origenState?.padre?.to
  ) {
    const migaPadre = migaDesdePadre(origenState.padre)!;
    return [
      migaPadre,
      {
        nombre: "Historial de versiones",
        to: dynamicFrom,
        esLink: true,
        state: { from: migaPadre.to, label: "Historial de versiones" },
      },
      { nombre: "Ficha Técnica", to: pathname, esLink: false },
    ];
  }

  // Visor PDF de un documento: muestra "Gestión documental / [Historial de versiones /] Visor PDF"
  // evitando el segmento sintético "versiones" sin ruta propia.
  if (
    segmentos.length === 5 &&
    segmentos[0] === "documentos" &&
    segmentos[2] === "versiones" &&
    segmentos[4] === "pdf"
  ) {
    const migas: MigaItem[] = [
      { nombre: legible("documentos"), to: "/documentos", esLink: true },
    ];
    if (dynamicFrom === `/documentos/${segmentos[1]}/historial`) {
      migas.push({
        nombre: dynamicLabel || "Historial de versiones",
        to: dynamicFrom,
        esLink: true,
      });
    }
    migas.push({ nombre: legible("pdf"), to: pathname, esLink: false });
    return migas;
  }

  // Caso especial: si es una ruta subordinada directa definida en PADRES_LOGICOS (ej: /capacidades)
  if (segmentos.length === 1 && PADRES_LOGICOS[primerSegmento]) {
    const padre = PADRES_LOGICOS[primerSegmento];
    return [
      { nombre: padre.nombre, to: padre.to, esLink: true },
      { nombre: legible(primerSegmento), to: `/${primerSegmento}`, esLink: false },
    ];
  }

  // Si vino derivado de una card del Dashboard (ej: Dashboard -> /vencimientos o /lotes/registrar)
  if (vinoDesdeDashboard && primerSegmento !== "dashboard") {
    const subMigas = construirMigas(pathname, null).map((miga, idx, arr) => ({
      ...miga,
      esLink: idx < arr.length - 1 ? miga.esLink : false,
      state: idx < arr.length - 1 ? (miga.state ?? { origen: "dashboard" }) : undefined,
    }));
    return [
      { nombre: "Dashboard", to: "/dashboard", esLink: true },
      ...subMigas,
    ];
  }

  // Caso general: la ruta arranca desde su propio módulo (ej: SideBar -> /recetas, /personal)
  const migas: MigaItem[] = [];
  let pathAcumulado = "";

  for (let i = 0; i < segmentos.length; i++) {
    const seg = segmentos[i];
    pathAcumulado += `/${seg}`;

    if (esId(seg)) {
      if (i === segmentos.length - 1 && segmentos[0] === "recetas") {
        const nombreItem =
          origenState?.label && origenState.label !== "Recetas"
            ? origenState.label
            : "Ficha Técnica";
        migas.push({
          nombre: nombreItem,
          to: pathAcumulado,
          esLink: false,
        });
      }
      continue;
    }

    const esUltima = i === segmentos.length - 1;
    const puedeTenerLink = !esUltima && !SIN_LINK.has(seg);

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

    if (seg === "historial" && segmentos[0] === "lotes") {
      migas.push({
        nombre: "Historial de Lotes",
        to: pathAcumulado,
        esLink: puedeTenerLink,
      });
      continue;
    }

    if (
      seg === "lotes" &&
      segmentos[0] === "insumos" &&
      typeof origenState?.label === "string" &&
      origenState.label.trim() !== "" &&
      origenState.label !== "Insumos"
    ) {
      migas.push({
        nombre: origenState.label,
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

  return migas;
}
