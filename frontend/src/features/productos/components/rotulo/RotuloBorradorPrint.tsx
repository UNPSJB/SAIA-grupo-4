import { useMemo } from "react";
import type { VistaPreviaRotulo } from "../../types";
import { DocumentoRotuloBorrador } from "./DocumentoRotuloBorrador";
import { ExpedienteRotuloPrintShell } from "./ExpedienteRotuloPrintShell";

interface RotuloBorradorPrintProps {
  vistaPrevia: VistaPreviaRotulo;
}

export function RotuloBorradorPrint({ vistaPrevia }: RotuloBorradorPrintProps) {
  const fechaHoy = useMemo(
    () =>
      new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [],
  );

  return (
    <ExpedienteRotuloPrintShell
      id="rotulo-borrador-print"
      className="rotulo-borrador-print"
      tituloDocumento={`Borrador de Rótulo — ${vistaPrevia.producto_nombre}`}
      detalleDerecha={
        vistaPrevia.receta_codigo
          ? `Receta: ${vistaPrevia.receta_codigo}`
          : "Sin receta activa"
      }
      fechaTexto={`Impreso: ${fechaHoy}`}
      leyendaBorrador={vistaPrevia.leyenda_borrador_obligatoria}
    >
      <DocumentoRotuloBorrador
        vistaPrevia={vistaPrevia}
        modoImpresion
        ocultarFranjaBorradorSuperior
      />
    </ExpedienteRotuloPrintShell>
  );
}
