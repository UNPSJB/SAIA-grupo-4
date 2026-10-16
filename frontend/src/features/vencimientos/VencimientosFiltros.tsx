import {
  FiltroNumero,
  FiltroSelect,
  FiltroTexto,
  FiltrosBar,
} from "../../components/ui";
import { tieneFiltros, type FiltrosVencimientos } from "./filtrosVencimientos";
import type { CategoriaDisponible, FiltroEstadoVencimiento } from "./types";

const OPCIONES_ESTADO = [
  { label: "Vencidos", value: "vencido" },
  { label: "Próximos a vencer", value: "proximo" },
  { label: "Vencidos y próximos a vencer", value: "por_vencer" },
  { label: "Vigentes", value: "vigente" },
];

interface VencimientosFiltrosProps {
  filtros: FiltrosVencimientos;
  categorias: CategoriaDisponible[];
  onCambiar: (filtros: FiltrosVencimientos) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
  loading?: boolean;
}

/*
 * Barra de filtros del tablero.
 *
 * Los controles viven acá y el listado guarda el borrador, pero la consulta se
 * dispara recién en "Filtrar": cambiar un desplegable no pide datos al backend
 * hasta que el usuario confirma. Es el mismo criterio del historial de
 * checklists.
 */
export const VencimientosFiltros = ({
  filtros,
  categorias,
  onCambiar,
  onAplicar,
  onLimpiar,
  loading = false,
}: VencimientosFiltrosProps) => (
  <FiltrosBar
    onAplicar={onAplicar}
    onLimpiar={onLimpiar}
    hayFiltrosActivos={tieneFiltros(filtros)}
    loading={loading}
  >
    {/* Búsqueda libre: coincide con el concepto y con el detalle de la fila. */}
    <FiltroTexto
      ariaLabel='Buscar en concepto o detalle'
      placeholder='Buscar concepto o detalle'
      value={filtros.busqueda}
      onChange={(valor) => onCambiar({ ...filtros, busqueda: valor })}
      onKeyDown={(e) => {
        if (e.key === "Enter") onAplicar();
      }}
    />

    <FiltroSelect
      ariaLabel='Estado del vencimiento'
      placeholder='Todos los estados'
      options={OPCIONES_ESTADO}
      value={filtros.estado}
      onChange={(valor) =>
        onCambiar({ ...filtros, estado: valor as FiltroEstadoVencimiento | "" })
      }
    />

    <FiltroSelect
      ariaLabel='Categoría del vencimiento'
      placeholder='Todas las categorías'
      options={categorias.map((c) => ({
        // El total viene de GET /vencimientos/categorias, que solo expone las
        // categorías con provider registrado. Cuando entren las demás, este
        // filtro las empieza a mostrar sin tocar el frontend.
        label: c.total > 0 ? `${c.nombre} (${c.total})` : c.nombre,
        value: c.valor,
      }))}
      value={filtros.categoria}
      onChange={(valor) => onCambiar({ ...filtros, categoria: valor })}
    />

    {/* Ventana de dias alrededor de hoy: acota lo que vencio o vence dentro de
        N dias, asi que tiene efecto en todos los estados (vencido, proximo y
        vigente). Vacío es "sin límite", que es el estado por defecto: sin esto
        no habría forma de volver a un recorte corto cuando el listado crece. */}
    <FiltroNumero
      ariaLabel='Ventana de días alrededor de hoy'
      placeholder='Sin límite de días'
      value={filtros.dias}
      onChange={(valor) => onCambiar({ ...filtros, dias: valor })}
    />
  </FiltrosBar>
);
