import type { TareaPOES } from "../types";
import type { TareaFormInput, TareaFormValues } from "../validationSchema";
import type { TareaPOESCreatePayload } from "../hooks/planApi";
import {
  DIAS_COMPLETOS,
  frecuenciaToPeriodicidad,
  momentoToTipoPOES,
  parsearDetalleFrecuencia,
  periodicidadToFrecuencia,
  tipoPOESToMomento,
} from "../utils";

/**
 * Transforma una TareaPOES del backend al formato del formulario (TareaFormInput).
 * Se usa al editar/ver una tarea existente para poblar el formulario.
 */
export const tareaAFormulario = (tarea: TareaPOES): TareaFormInput => {
  // Convertir frecuencia del backend (ej: "semanal") a periodicidad del form (ej: "semanal")
  const periodicidad = frecuenciaToPeriodicidad[tarea.frecuencia];

  // Parsear el detalle de frecuencia según el tipo:
  // - semanal: "lunes" -> { dias: ["lun"] }
  // - mensual: "15" -> { dia_mes: 15 }
  // - dias_especificos: "lun,mar" -> { dias: ["lun", "mar"] }
  const detalle = parsearDetalleFrecuencia(tarea.frecuencia, tarea.detalle_frecuencia);

  return {
    nombre: tarea.nombre,
    // Determinar destino por presencia de equipo_id vs sector_id
    destino_tipo: tarea.equipo_id ? "equipo" : "sector",
    // El formulario espera strings (input type), convertir desde number del backend
    equipo_id: tarea.equipo_id ? String(tarea.equipo_id) : undefined,
    sector_id: tarea.sector_id ? String(tarea.sector_id) : undefined,
    // Convertir tipo_poes (backend) a momento (form)
    momento: tipoPOESToMomento[tarea.tipo_poes],
    periodicidad,
    dias: detalle.dias,
    // El formulario espera string (input type), convertir desde number
    dia_mes: detalle.dia_mes ? String(detalle.dia_mes) : undefined,
    pasos: tarea.metodo,
    // Extraer solo IDs de los recursos asociados
    insumos_quimicos: tarea.insumos_quimicos.map((iq) => iq.insumo_quimico_id),
    elementos_limpieza: tarea.elementos_limpieza.map((el) => el.elemento_limpieza_id),
  };
};

/**
 * Tipo para agrupar los detalles de recursos que se mantienen en estado local
 * (consumos, diluciones, cantidades) y no vienen directo del formulario.
 */
export type DetalleRecursos = {
  consumos: Record<string, string>;
  diluciones: Record<string, string>;
  cantidades: Record<string, string>;
};

/**
 * Arma el payload final para enviar al backend (crear/modificar tarea).
 * Combina valores del formulario + estado local de recursos.
 */
export const armarPayload = (
  values: TareaFormValues,
  { consumos, diluciones, cantidades }: DetalleRecursos,
): TareaPOESCreatePayload => {
  // Convertir periodicidad del form a frecuencia del backend
  const frecuencia = periodicidadToFrecuencia[values.periodicidad];

  // Construir detalle_frecuencia según periodicidad:
  // - semanal: tomar primer día seleccionado -> "lunes"
  // - mensual: día del mes -> "15"
  // - dias_especificos: array de días -> "lun,mar"
  let detalle_frecuencia: string | undefined;
  if (frecuencia === "semanal" && values.dias.length) {
    detalle_frecuencia = DIAS_COMPLETOS[values.dias[0]];
  } else if (frecuencia === "mensual" && values.dia_mes) {
    detalle_frecuencia = String(values.dia_mes);
  } else if (frecuencia === "dias_especificos" && values.dias.length) {
    detalle_frecuencia = values.dias.join(",");
  }

  return {
    nombre: values.nombre.trim(),
    // Convertir momento (form) a tipo_poes (backend)
    tipo_poes: momentoToTipoPOES[values.momento],
    frecuencia,
    detalle_frecuencia,
    // Solo enviar ID según destino seleccionado
    equipo_id: values.destino_tipo === "equipo" ? values.equipo_id : undefined,
    sector_id: values.destino_tipo === "sector" ? values.sector_id : undefined,
    metodo: values.pasos.trim(),
    // Mapear insumos con sus consumos/diluciones del estado local
    insumos_quimicos: (values.insumos_quimicos ?? []).map((id) => {
      const consumo = Number((consumos[String(id)] ?? "").trim());
      const dilucion = (diluciones[String(id)] ?? "").trim();
      return {
        insumo_quimico_id: id,
        dosis_sugerida:
          Number.isFinite(consumo) && consumo > 0 ? consumo : undefined,
        // Dilución opcional: solo enviar si el usuario la completó
        dilucion_especifica: dilucion.length > 0 ? dilucion : undefined,
      };
    }),
    // Mapear elementos con cantidades del estado local
    elementos_limpieza: (values.elementos_limpieza ?? []).map((id) => ({
      elemento_limpieza_id: id,
      cantidad_requerida: Math.max(
        1,
        Number.parseInt(cantidades[String(id)] ?? "1", 10) || 1,
      ),
    })),
  };
};