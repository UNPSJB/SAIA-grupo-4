import { useState } from "react";
import type { FC } from "react";
import { Button, Text, VStack } from "@chakra-ui/react";
import { FiFileText, FiRefreshCw, FiUpload, FiXCircle } from "react-icons/fi";

import { RegistrarRecambioForm } from "../recambios/RegistrarRecambioForm";
import { RegistrarCalibracionForm } from "../equipos/RegistrarCalibracionModal";
import { RegistrarRevisionForm } from "../documentos/components/RegistrarRevisionModal";
import { SubirVersionForm } from "../documentos/components/SubirVersionModal";
import {
  CancelButton,
  FormActions,
  FormContainer,
  FormHeader,
} from "../../components/ui";
import type { ElementoLimpieza } from "../elementosLimpieza/types";
import type { Equipo } from "../equipos/types";
import type { Documento } from "../documentos/types";
import { RegistrarVencimientoForm } from "../personal/RegistrarVencimientoForm";
import type { Persona } from "../personal/types";
import { renovacionDe } from "./renovacionVencimientos";
import type { RegistroOrigen } from "./origenVencimientos";
import type { CategoriaVencimiento, Vencimiento } from "./types";

type PropsFormulario = {
  registro: RegistroOrigen;
  /** Fila consolidada del tablero que se está renovando. */
  vencimiento: Vencimiento;
  titulo: string;
  onCancelar: () => void;
  onGuardado: () => void;
};

/**
 * Renovación de un elemento de limpieza.
 *
 * No es un formulario nuevo: delega en el `RegistrarRecambioForm` que ya usa
 * el listado de elementos de limpieza, que pega a `POST /recambios/`. Así la
 * escritura del recambio y sus validaciones quedan en una sola implementación.
 */
const RenovarElementoLimpieza: FC<PropsFormulario> = ({
  registro,
  titulo,
  onCancelar,
  onGuardado,
}) => (
  <RegistrarRecambioForm
    elemento={registro as ElementoLimpieza}
    titulo={titulo}
    onCancelar={onCancelar}
    onGuardado={onGuardado}
    enModal
  />
);

/**
 * Renovación de un equipo: registrar la calibración que lo vuelve a dejar al
 * día. Delega en `RegistrarCalibracionForm`, el mismo que usa el módulo de
 * equipos, que pega a `POST /equipos/{equipo_id}/calibraciones`.
 */
const RenovarEquipo: FC<PropsFormulario> = ({
  registro,
  onCancelar,
  onGuardado,
}) => (
  <RegistrarCalibracionForm
    equipo={registro as Equipo}
    enModal
    onCancelar={onCancelar}
    onGuardado={onGuardado}
  />
);

type AccionDocumento = "revision" | "version";

/**
 * Renovación de un documento.
 *
 * A diferencia de las otras categorías, acá hay dos formas válidas de renovar y
 * no una sola: una revisión periódica (el PDF sigue vigente, solo se corre el
 * vencimiento) o una versión nueva (cambia el PDF). Por eso primero se elige la
 * acción y recién después se monta el formulario correspondiente, ambos ya
 * existentes en el módulo de documentos.
 */
const RenovarDocumento: FC<PropsFormulario> = ({
  registro,
  titulo,
  onCancelar,
  onGuardado,
}) => {
  const [accion, setAccion] = useState<AccionDocumento | null>(null);
  const documento = registro as Documento;

  if (accion === "revision") {
    return (
      <RegistrarRevisionForm
        documento={documento}
        enModal
        onCancelar={() => setAccion(null)}
        onGuardado={onGuardado}
      />
    );
  }

  if (accion === "version") {
    return (
      <SubirVersionForm
        documento={documento}
        enModal
        onCancelar={() => setAccion(null)}
        onGuardado={onGuardado}
      />
    );
  }

  return (
    <FormContainer modal>
      <FormHeader title={titulo} icon={FiFileText} />
      <VStack gap={4} align='stretch'>
        <Text fontSize='sm' color='gray.600'>
          {documento.codigo ? `${documento.codigo} — ` : ""}
          {documento.titulo}
        </Text>
        <Text fontSize='sm' color='gray.500'>
          Elegí cómo querés renovar el documento.
        </Text>

        <Button
          colorPalette='blue'
          justifyContent='flex-start'
          onClick={() => setAccion("revision")}
        >
          <FiRefreshCw /> Registrar Revisión
        </Button>

        <Button
          colorPalette='green'
          justifyContent='flex-start'
          onClick={() => setAccion("version")}
        >
          <FiUpload /> Subir Nueva Versión
        </Button>

        <FormActions>
          <CancelButton text='Cancelar' onClick={onCancelar} icon={FiXCircle} />
        </FormActions>
      </VStack>
    </FormContainer>
  );
};

/**
 * Renovación de un vencimiento de personal. Delega en el
 * `RegistrarVencimientoForm` del módulo de personal, que renueva con
 * `PATCH /personal/{persona_id}/vencimientos/{vencimiento_id}` cuando la
 * persona ya tiene cargado el documento elegido.
 */
const RenovarPersonal: FC<PropsFormulario> = ({
  registro,
  vencimiento,
  onCancelar,
  onGuardado,
}) => {
  const persona = registro as unknown as Persona;
  // La fila consolidada usa la clave "personal:{vencimiento_id}": con ese id
  // ubicamos el documento exacto que se renueva para fijarlo en el formulario.
  const idVencimiento = Number(vencimiento.id.split(":")[1]);
  const objetivo = (persona.vencimientos || []).find(
    (v) => v.id === idVencimiento,
  );

  return (
    <RegistrarVencimientoForm
      persona={persona}
      documentoFijo={objetivo?.documento}
      onCancelar={onCancelar}
      onGuardado={onGuardado}
      enModal
    />
  );
};

/**
 * Qué formulario de renovación corresponde a cada categoría.
 *
 * Es el dispatcher de la renovación: cuando entren las otras categorías alcanza
 * con sumar una entrada acá y su botón empieza a aparecer solo, porque
 * `renovacionDe` decide la visibilidad en la tabla.
 */
const FORMULARIOS: Partial<Record<CategoriaVencimiento, FC<PropsFormulario>>> =
  {
    elemento_limpieza: RenovarElementoLimpieza,
    equipo: RenovarEquipo,
    documento: RenovarDocumento,
    personal: RenovarPersonal,
  };

type Props = {
  categoria: CategoriaVencimiento;
  registro: RegistroOrigen;
  /** Fila consolidada del tablero que se está renovando. */
  vencimiento: Vencimiento;
  onCancelar: () => void;
  /**
   * Cierra el modal. La página además recarga el listado desde acá, porque la
   * fecha de vencimiento de la fila cambia al registrar el recambio, la
   * calibración o la revisión del documento.
   */
  onGuardado: () => void;
};

export const RenovarVencimiento = ({
  categoria,
  registro,
  vencimiento,
  onCancelar,
  onGuardado,
}: Props) => {
  const entrada = renovacionDe(categoria);
  const Formulario = FORMULARIOS[categoria];

  if (!entrada || !Formulario) return null;

  return (
    <Formulario
      registro={registro}
      vencimiento={vencimiento}
      titulo={entrada.titulo}
      onCancelar={onCancelar}
      onGuardado={onGuardado}
    />
  );
};
