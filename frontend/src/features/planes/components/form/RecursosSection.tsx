import { Text } from "@chakra-ui/react";
import { AlertMessage } from "../../../../components/ui";
import { InsumosSelector } from "./InsumosSelector";
import { ElementosSelector } from "./ElementosSelector";
import type { InsumoQuimicoCatalogo, OpcionRecurso } from "../../types";

interface RecursosSectionProps {
  recursosCargando: boolean;
  errorRecursos?: string;
  opcionesInsumos: OpcionRecurso[];
  opcionesElementos: OpcionRecurso[];
  insumosSeleccionados: number[];
  elementosSeleccionados: number[];
  consumos: Record<string, string>;
  diluciones: Record<string, string>;
  cantidades: Record<string, string>;
  erroresConsumo: Record<string, string>;
  erroresCantidad: Record<string, string>;
  recursosInsumos: InsumoQuimicoCatalogo[];
  disabled: boolean;
  onChangeInsumos: (ids: number[]) => void;
  onChangeElementos: (ids: number[]) => void;
  onActualizarConsumo: (id: number, texto: string) => void;
  onActualizarDilucion: (id: number, texto: string) => void;
  onActualizarCantidad: (id: number, texto: string) => void;
  errorElementos?: string;
}

/**
 * Sección de recursos requeridos de la tarea.
 *
 * Orquesta los tres estados posibles del origen de los datos:
 * cargando, con error, o con datos. Con datos, muestra los dos selectores
 * (insumos y elementos) y avisa cuando alguno viene vacío para el destino
 * elegido, porque el usuario necesita saber si le falta elegir algo.
 */
export const RecursosSection = ({
  recursosCargando,
  errorRecursos,
  opcionesInsumos,
  opcionesElementos,
  insumosSeleccionados,
  elementosSeleccionados,
  consumos,
  diluciones,
  cantidades,
  erroresConsumo,
  erroresCantidad,
  recursosInsumos,
  disabled,
  onChangeInsumos,
  onChangeElementos,
  onActualizarConsumo,
  onActualizarDilucion,
  onActualizarCantidad,
  errorElementos,
}: RecursosSectionProps) => {
  if (recursosCargando) {
    return (
      <Text fontSize="sm" color="gray.600">
        Cargando recursos del destino seleccionado...
      </Text>
    );
  }

  if (errorRecursos) {
    return <AlertMessage type="error" message={errorRecursos} />;
  }

  const sinInsumos = opcionesInsumos.length === 0;
  const sinElementos = opcionesElementos.length === 0;

  return (
    <>
      {sinInsumos && sinElementos ? (
        <AlertMessage
          type="warning"
          message="No hay insumos químicos ni elementos de limpieza disponibles para el destino seleccionado."
        />
      ) : (
        <>
          {!sinInsumos && (
            <InsumosSelector
              opciones={opcionesInsumos}
              seleccionados={insumosSeleccionados}
              onChange={onChangeInsumos}
              consumos={consumos}
              diluciones={diluciones}
              erroresConsumo={erroresConsumo}
              recursosInsumos={recursosInsumos}
              onActualizarConsumo={onActualizarConsumo}
              onActualizarDilucion={onActualizarDilucion}
              disabled={disabled}
            />
          )}

          {!sinElementos && (
            <ElementosSelector
              opciones={opcionesElementos}
              seleccionados={elementosSeleccionados}
              onChange={onChangeElementos}
              cantidades={cantidades}
              erroresCantidad={erroresCantidad}
              onActualizarCantidad={onActualizarCantidad}
              disabled={disabled}
              error={errorElementos}
            />
          )}

          {sinInsumos && (
            <AlertMessage
              type="warning"
              message="No hay insumos químicos disponibles para el destino seleccionado."
            />
          )}

          {sinElementos && (
            <AlertMessage
              type="warning"
              message="No hay elementos de limpieza disponibles para el destino seleccionado."
            />
          )}
        </>
      )}
    </>
  );
};
