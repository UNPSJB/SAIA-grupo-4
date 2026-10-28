import { useState } from "react";
import { FiltroFechaRango } from "../../components/ui";

// Props del filtro del dashboard
interface DashboardFiltersProps {
  onFilterChange: (desde?: string, hasta?: string) => void;
  initialDesde?: string | null;
  initialHasta?: string | null;
}

// Componente reutilizable para filtrar el dashboard por rango de fechas
export function DashboardFilters({
  onFilterChange,
  initialDesde,
  initialHasta,
}: DashboardFiltersProps) {
  const [desde, setDesde] = useState(initialDesde || "");
  const [hasta, setHasta] = useState(initialHasta || "");

  // Aplica filtros al dashboard
  const handleApply = () => {
    onFilterChange(desde || undefined, hasta || undefined);
  };

  // Limpia filtros y recarga datos sin rango
  const handleClear = () => {
    setDesde("");
    setHasta("");
    onFilterChange(undefined, undefined);
  };

  // Selección rápida de períodos
  const handleSeleccionarRapido = (dias: number) => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - (dias - 1));

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const desdeStr = formatDate(desde);
    const hastaStr = formatDate(hasta);

    setDesde(desdeStr);
    setHasta(hastaStr);
    onFilterChange(desdeStr, hastaStr);
  };

  return (
    <FiltroFechaRango
      fechaDesde={desde}
      fechaHasta={hasta}
      fechaMax={new Date().toISOString().split("T")[0]}
      onCambiarFechaDesde={setDesde}
      onCambiarFechaHasta={setHasta}
      onAplicarFiltro={handleApply}
      onResetFiltro={handleClear}
      onSeleccionarRapido={handleSeleccionarRapido}
      mostrarAtajos={true}
    />
  );
}
