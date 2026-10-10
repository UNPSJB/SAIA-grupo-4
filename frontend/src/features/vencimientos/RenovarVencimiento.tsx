import type { FC } from "react";
import { RegistrarRecambioForm } from "../recambios/RegistrarRecambioForm";
import type { ElementoLimpieza } from "../elementosLimpieza/types";
import { renovacionDe } from "./renovacionVencimientos";
import type { CategoriaVencimiento } from "./types";

type PropsFormulario = {
  elemento: ElementoLimpieza;
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
  elemento,
  titulo,
  onCancelar,
  onGuardado,
}) => (
  <RegistrarRecambioForm
    elemento={elemento}
    titulo={titulo}
    onCancelar={onCancelar}
    onGuardado={onGuardado}
    enModal
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
  };

type Props = {
  categoria: CategoriaVencimiento;
  elemento: ElementoLimpieza;
  onCancelar: () => void;
  /**
   * Cierra el modal. La página además recarga el listado desde acá, porque la
   * fecha de vencimiento de la fila cambia al registrar el recambio.
   */
  onGuardado: () => void;
};

export const RenovarVencimiento = ({
  categoria,
  elemento,
  onCancelar,
  onGuardado,
}: Props) => {
  const entrada = renovacionDe(categoria);
  const Formulario = FORMULARIOS[categoria];

  if (!entrada || !Formulario) return null;

  return (
    <Formulario
      elemento={elemento}
      titulo={entrada.titulo}
      onCancelar={onCancelar}
      onGuardado={onGuardado}
    />
  );
};
