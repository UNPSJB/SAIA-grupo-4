import type { FC } from "react";
import { RegistrarRecambioForm } from "../recambios/RegistrarRecambioForm";
import { RegistrarCalibracionForm } from "../equipos/RegistrarCalibracionModal";
import type { ElementoLimpieza } from "../elementosLimpieza/types";
import type { Equipo } from "../equipos/types";
import { renovacionDe } from "./renovacionVencimientos";
import type { RegistroOrigen } from "./origenVencimientos";
import type { CategoriaVencimiento } from "./types";

type PropsFormulario = {
  registro: RegistroOrigen;
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
  };

type Props = {
  categoria: CategoriaVencimiento;
  registro: RegistroOrigen;
  onCancelar: () => void;
  /**
   * Cierra el modal. La página además recarga el listado desde acá, porque la
   * fecha de vencimiento de la fila cambia al registrar el recambio o la
   * calibración.
   */
  onGuardado: () => void;
};

export const RenovarVencimiento = ({
  categoria,
  registro,
  onCancelar,
  onGuardado,
}: Props) => {
  const entrada = renovacionDe(categoria);
  const Formulario = FORMULARIOS[categoria];

  if (!entrada || !Formulario) return null;

  return (
    <Formulario
      registro={registro}
      titulo={entrada.titulo}
      onCancelar={onCancelar}
      onGuardado={onGuardado}
    />
  );
};
