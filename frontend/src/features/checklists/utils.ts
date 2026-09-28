import type {
  EjecucionTarea,
  OperadorChecklist,
  TareaParaChecklist,
  TipoPoes,
} from "./types";

const API_BASE_URL = "http://127.0.0.1:8000";

export const ETIQUETA_TIPO_POE: Record<TipoPoes, string> = {
  pre_operacional: "Pre-operacional",
  operacional: "Operacional",
  post_operacional: "Post-operacional",
};

export const etiquetaTipoPoe = (tipo: TipoPoes) =>
  ETIQUETA_TIPO_POE[tipo] ?? tipo;

// El destino de una tarea es su equipo o, si no tiene, su sector. El backend los
// devuelve como recursos separados (equipo / sector), ninguno de los dos es obligatorio.
export const obtenerDestino = (tarea: TareaParaChecklist) => {
  if (tarea.equipo) return `Equipo - ${tarea.equipo.nombre}`;
  if (tarea.sector) return `Sector - ${tarea.sector.nombre}`;
  return "—";
};

// El método POES se guarda como un único texto multilínea.
export const obtenerPasosPoes = (metodo: string) =>
  metodo
    .split("\n")
    .map((paso) => paso.trim())
    .filter((paso) => paso.length > 0);

export const obtenerNombreOperador = (operador: OperadorChecklist | null) =>
  operador ? `${operador.nombre} ${operador.apellido}`.trim() : "Operario";

// El backend persiste la ruta relativa de la evidencia y la sirve desde /uploads.
export const obtenerUrlEvidencia = (foto_url: string | null) =>
  foto_url ? `${API_BASE_URL}/${foto_url}` : null;

export const obtenerNombreEvidencia = (foto_url: string | null) =>
  foto_url ? foto_url.split("/").pop() ?? foto_url : null;

export const formatearHora = (fechaHora: string | null) => {
  if (!fechaHora) return "--:--";
  return new Date(fechaHora).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatearFecha = (fecha: string | null) => {
  if (!fecha) return "—";
  // El backend devuelve "YYYY-MM-DD"; se parsea como fecha local para no
  // correr el día por el offset de zona horaria.
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
};

// Los consumos guardados solo traen el id del insumo y la cantidad. Para mostrar el
// nombre y la unidad hay que cruzarlos contra los insumos de la tarea.
export const obtenerDescripcionConsumos = (ejecucion: EjecucionTarea) =>
  ejecucion.consumos_insumos.map((consumo) => {
    const insumo = ejecucion.tarea.insumos_quimicos.find(
      (item) => item.insumo_quimico.id === consumo.insumo_quimico_id,
    );

    if (!insumo) return `${consumo.cantidad_utilizada}`;

    const unidad = insumo.insumo_quimico.unidad_medida.simbolo;
    return `${consumo.cantidad_utilizada} ${unidad} de ${insumo.insumo_quimico.nombre}`;
  });
