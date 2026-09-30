import { RadioGroupField, SelectField, AlertMessage } from "../../../../components/ui";
import type { DestinoTipo } from "../../types";

interface DestinoSelectorProps {
  destinoTipo: DestinoTipo | undefined;
  onChangeDestino: (value: string) => void;
  opcionesEquipos: Array<{ label: string; value: string }>;
  opcionesSectores: Array<{ label: string; value: string }>;
  catalogosCargando: boolean;
  errorCatalogos?: string;
  disabled: boolean;
  errorEquipo?: string;
  errorSector?: string;
  equipoId?: number | string;
  sectorId?: number | string;
  onChangeEquipo: (value: string) => void;
  onChangeSector: (value: string) => void;
}

/**
 * Selector de destino (Equipo/Sector) con select condicional.
 * Incluye estados de loading, error y empty.
 */
export const DestinoSelector = ({
  destinoTipo,
  onChangeDestino,
  opcionesEquipos,
  opcionesSectores,
  catalogosCargando,
  errorCatalogos,
  disabled,
  errorEquipo,
  errorSector,
  equipoId,
  sectorId,
  onChangeEquipo,
  onChangeSector,
}: DestinoSelectorProps) => (
  <>
    {/* Radio Group: Equipo vs Sector */}
    <RadioGroupField
      label="Destino de la Tarea"
      disabled={disabled}
      value={destinoTipo}
      onChange={onChangeDestino}
      options={[
        { label: "Equipo", value: "equipo" },
        { label: "Sector", value: "sector" },
      ]}
    />

    {/* Select condicional según destino */}
    {destinoTipo === "equipo" ? (
      <>
        <SelectField
          label="Seleccionar Equipo"
          placeholder="Seleccione un equipo"
          readOnly={disabled}
          disabled={!disabled && catalogosCargando}
          options={
            catalogosCargando
              ? [{ label: "Cargando equipos...", value: "" }]
              : opcionesEquipos
          }
          error={errorEquipo}
          value={equipoId as string}
          onChange={(e) => onChangeEquipo(e.target.value)}
        />
        {!catalogosCargando && opcionesEquipos.length === 0 && (
          <AlertMessage
            type="warning"
            message="No hay equipos cargados en el sistema. Cargá un equipo para poder asignar un destino."
          />
        )}
      </>
    ) : (
      <>
        <SelectField
          label="Seleccionar Sector / Área"
          placeholder="Seleccione un sector"
          readOnly={disabled}
          disabled={!disabled && catalogosCargando}
          options={
            catalogosCargando
              ? [{ label: "Cargando sectores...", value: "" }]
              : opcionesSectores
          }
          error={errorSector}
          value={sectorId as string}
          onChange={(e) => onChangeSector(e.target.value)}
        />
        {!catalogosCargando && opcionesSectores.length === 0 && (
          <AlertMessage
            type="warning"
            message="No hay sectores cargados en el sistema. Cargá un sector para poder asignar un destino."
          />
        )}
      </>
    )}

    {/* Error general de catálogos */}
    {errorCatalogos && !disabled && (
      <AlertMessage type="error" message={errorCatalogos} />
    )}
  </>
);