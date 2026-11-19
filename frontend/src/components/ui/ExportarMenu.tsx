import { useRef, useState } from "react";
import { Box, Button, HStack, Icon, Menu, Portal, Text, VStack } from "@chakra-ui/react";
import { FiChevronDown, FiDownload, FiFile, FiFileText } from "react-icons/fi";
import { AlertMessage } from "./form/feedback/AlertMessage";
import type { FormatoExportacion } from "../../utils/exportacion";

interface ExportarMenuProps {
  /** Genera y descarga el archivo. Si falla, el menú muestra el error. */
  onExportar: (formato: FormatoExportacion) => Promise<void> | void;
  /** Cantidad de registros a exportar: con 0 el botón queda deshabilitado. */
  cantidad: number;
  disabled?: boolean;
  /** Para el aria-label, ej. "Exportar equipos". */
  etiqueta?: string;
}

const OPCIONES: { formato: FormatoExportacion; titulo: string; detalle: string; icono: typeof FiFile }[] = [
  { formato: "pdf", titulo: "PDF", detalle: "Para imprimir o compartir", icono: FiFileText },
  { formato: "csv", titulo: "CSV", detalle: "Para abrir en Excel", icono: FiFile },
];

export const ExportarMenu = ({
  onExportar,
  cantidad,
  disabled = false,
  etiqueta = "Exportar listado",
}: ExportarMenuProps) => {
  const [exportando, setExportando] = useState<FormatoExportacion | null>(null);
  const [error, setError] = useState("");
  // El ref corta el doble clic antes de que llegue a re-renderizar el estado.
  const enCurso = useRef(false);

  const sinDatos = cantidad === 0;
  const deshabilitado = disabled || sinDatos || exportando !== null;

  const exportar = async (formato: FormatoExportacion) => {
    if (enCurso.current) return;
    enCurso.current = true;
    setExportando(formato);
    setError("");
    try {
      await onExportar(formato);
    } catch (e) {
      console.error(`No se pudo exportar el listado a ${formato.toUpperCase()}.`, e);
      setError(`No se pudo generar el ${formato.toUpperCase()}. Intentá nuevamente.`);
    } finally {
      enCurso.current = false;
      setExportando(null);
    }
  };

  return (
    <VStack align="stretch" gap={2}>
      <HStack justify="flex-end">
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <Button
              variant="outline"
              size="sm"
              colorPalette="green"
              disabled={deshabilitado}
              loading={exportando !== null}
              loadingText={`Generando ${exportando?.toUpperCase() ?? ""}...`}
              aria-label={sinDatos ? `${etiqueta} (no hay registros)` : etiqueta}
              title={sinDatos ? "No hay registros para exportar" : undefined}
            >
              <FiDownload />
              Exportar
              <FiChevronDown />
            </Button>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="220px">
                {OPCIONES.map((opcion) => (
                  <Menu.Item
                    key={opcion.formato}
                    value={opcion.formato}
                    onSelect={() => void exportar(opcion.formato)}
                  >
                    <HStack gap={3} align="center">
                      <Icon as={opcion.icono} boxSize={4} color="green.600" />
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">
                          {opcion.titulo}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {opcion.detalle}
                        </Text>
                      </Box>
                    </HStack>
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>
      {error && <AlertMessage type="error" message={error} />}
    </VStack>
  );
};
