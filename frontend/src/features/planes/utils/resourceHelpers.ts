/**
 * Utilidades para manejo de estado de recursos (insumos/elementos).
 * Mantienen sincronizados los datos locales cuando el usuario agrega/quita selecciones.
 */

/**
 * Filtra un objeto Record manteniendo solo las claves cuyos IDs están en la lista permitida.
 * Se usa cuando el usuario deselecciona un recurso: limpiar su consumo/dilución/cantidad.
 */
export const conservarSolo = <T>(
  prev: Record<string, T>,
  ids: number[],
): Record<string, T> => {
  const permitidos = ids.map(String);
  return Object.fromEntries(
    Object.entries(prev).filter(([id]) => permitidos.includes(id)),
  );
};

/**
 * Actualiza el consumo de un insumo químico.
 * Limpia el error asociado al modificar el valor.
 */
export const actualizarConsumo = (
  id: number,
  texto: string,
  setConsumos: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setErroresConsumo: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) => {
  setConsumos((prev) => ({ ...prev, [String(id)]: texto }));
  setErroresConsumo((prev) => {
    const next = { ...prev };
    delete next[String(id)];
    return next;
  });
};

/**
 * Actualiza la dilución de un insumo químico.
 * La dilución es opcional, no tiene validación estricta.
 */
export const actualizarDilucion = (
  id: number,
  texto: string,
  setDiluciones: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) => {
  setDiluciones((prev) => ({ ...prev, [String(id)]: texto }));
};

/**
 * Actualiza la cantidad de un elemento de limpieza.
 * Limpia el error asociado al modificar el valor.
 */
export const actualizarCantidad = (
  id: number,
  texto: string,
  setCantidades: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  setErroresCantidad: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) => {
  setCantidades((prev) => ({ ...prev, [String(id)]: texto }));
  setErroresCantidad((prev) => {
    const next = { ...prev };
    delete next[String(id)];
    return next;
  });
};

/**
 * Inicializa el estado de consumos desde una tarea existente (modo editar/ver).
 * Solo incluye insumos que tengan dosis_sugerida definida.
 */
export const inicializarConsumos = (
  insumos: Array<{ insumo_quimico_id: number; dosis_sugerida?: number }>,
): Record<string, string> =>
  Object.fromEntries(
    insumos
      .filter((iq) => iq.dosis_sugerida !== undefined && iq.dosis_sugerida !== null)
      .map((iq) => [String(iq.insumo_quimico_id), String(iq.dosis_sugerida)]),
  );

/**
 * Inicializa el estado de diluciones desde una tarea existente.
 * Incluye todos los insumos (dilución puede ser string vacío).
 */
export const inicializarDiluciones = (
  insumos: Array<{ insumo_quimico_id: number; dilucion_especifica?: string }>,
): Record<string, string> =>
  Object.fromEntries(
    insumos.map((iq) => [String(iq.insumo_quimico_id), iq.dilucion_especifica ?? ""]),
  );

/**
 * Inicializa el estado de cantidades desde una tarea existente.
 * Default a "1" si no tiene cantidad_requerida.
 */
export const inicializarCantidades = (
  elementos: Array<{ elemento_limpieza_id: number; cantidad_requerida?: number }>,
): Record<string, string> =>
  Object.fromEntries(
    elementos.map((el) => [
      String(el.elemento_limpieza_id),
      String(el.cantidad_requerida ?? 1),
    ]),
  );