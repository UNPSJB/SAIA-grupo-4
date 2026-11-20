import { ListadoDocumentosOperador } from "../features/documentos/ListadoDocumentosOperador";

/**
 * Vista de documentos del operador (sólo lectura). El layout y la navegación
 * los provee OperadorLayout; acá sólo vive el contenido.
 */
export default function DocumentosOperadorPage() {
  return (
    <>
      <ListadoDocumentosOperador />
    </>
  );
}
