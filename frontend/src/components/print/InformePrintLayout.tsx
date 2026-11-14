import { useMemo, type ReactNode } from "react";
import { Badge, Box, Heading, HStack, Text, VStack } from "@chakra-ui/react";

interface InformePrintLayoutProps {
  /** Título principal del informe. Ej: "Dashboard Consolidado". */
  titulo: string;
  /** Texto del período informado. Ej: "01/03/2026 al 31/03/2026". Si no se pasa, no se muestra. */
  periodo?: string;
  /** Etiqueta opcional a la derecha del encabezado (como el código en la ficha de receta). */
  etiqueta?: string;
  /** Contenido del informe. */
  children: ReactNode;
}

/**
 * Contenedor común para los informes imprimibles (dashboard, vista pública, etc.).
 *
 * Sigue el mismo esquema que FichaRecetaPrint: está montado en la página pero oculto
 * en pantalla (display: none) y solo se muestra al imprimir (@media print). Define la
 * hoja A4 con márgenes y numeración de páginas, oculta el resto de la aplicación y
 * dibuja el encabezado con título, período y fecha de generación.
 *
 * Se usa junto con imprimirInforme(), que abre el diálogo de impresión.
 */
export function InformePrintLayout({
  titulo,
  periodo,
  etiqueta,
  children,
}: InformePrintLayoutProps) {
  // Se calcula al montar el componente; el informe se monta cuando la pantalla tiene datos.
  const fechaGeneracion = useMemo(
    () =>
      new Date().toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  return (
    <Box
      className="informe-print light"
      data-theme="light"
      display="none"
      _print={{
        display: "block !important",
        position: "absolute !important",
        left: "0 !important",
        top: "0 !important",
        width: "100% !important",
        backgroundColor: "#ffffff !important",
        color: "#1a202c !important",
        zIndex: 999999,
      }}
      bg="white"
      color="gray.900"
      p={0}
      m={0}
      w="100%"
      colorPalette="green"
    >
      {/* Estilos globales de impresión: tamaño A4, márgenes por página y ocultar la pantalla */}
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 14mm 16mm;
            @bottom-right {
              content: counter(page) " / " counter(pages);
              font-size: 8.5pt;
              color: #718096;
            }
          }
          @media print {
            html, body {
              background-color: #ffffff !important;
              color: #1a202c !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Ocultar todo lo que no sea el informe */
            body * {
              visibility: hidden;
            }
            .informe-print,
            .informe-print * {
              visibility: visible !important;
              color-scheme: light !important;
            }
            .informe-print {
              padding: 0 !important;
              margin: 0 !important;
              box-sizing: border-box !important;
            }
            /* Evita que un bloque marcado quede partido entre dos hojas */
            .informe-print .no-cortar {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            nav,
            aside,
            header,
            footer,
            button,
            .no-print,
            [data-part="backdrop"],
            [data-part="positioner"]:not(:has(.informe-print)) {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Encabezado del informe */}
      <HStack
        justify="space-between"
        align="flex-start"
        borderBottomWidth="2px"
        borderColor="green.700"
        pb={3}
        mb={4}
      >
        <VStack align="start" gap={0.5}>
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="gray.600"
          >
            SAIA · Sistema de Apoyo para la Inocuidad Alimentaria
          </Text>
          <Heading size="xl" color="green.800" fontWeight="extrabold">
            {titulo}
          </Heading>
        </VStack>
        <VStack align="end" gap={1}>
          {etiqueta && (
            <Badge
              colorPalette="teal"
              variant="surface"
              fontSize="sm"
              px={2.5}
              py={1}
              borderRadius="md"
              fontWeight="bold"
              borderWidth="1px"
              borderColor="teal.200"
            >
              {etiqueta}
            </Badge>
          )}
          {periodo && (
            <Text fontSize="xs" color="gray.700" fontWeight="semibold">
              Período: {periodo}
            </Text>
          )}
          <Text fontSize="2xs" color="gray.600">
            Generado: {fechaGeneracion}
          </Text>
        </VStack>
      </HStack>

      {children}
    </Box>
  );
}
