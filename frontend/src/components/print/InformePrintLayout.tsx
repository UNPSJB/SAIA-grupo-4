import { useMemo, type ReactNode } from "react";
import { Badge, Box, Heading, HStack, Image, Text, VStack } from "@chakra-ui/react";
import { useConfiguracion } from "../../features/configuracion/useConfiguracion";

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
  const { configuracion, logoSrc } = useConfiguracion();
  const nombreEstablecimiento =
    configuracion.nombre_establecimiento?.trim() || "SAIA-4";

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
          /* Textos de los ejes de los gráficos: el reset de Chakra les hace heredar
             16px e ignorar el fontSize de Recharts, y en la hoja no entran */
          .informe-print .recharts-cartesian-axis-tick-value {
            font-size: 10px !important;
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
            /* Además, que el resto de la app no ocupe lugar: si no, su altura
               (aunque esté invisible) agrega hojas en blanco al final */
            body *:not(:has(.informe-print)):not(.informe-print):not(.informe-print *) {
              display: none !important;
            }
            html,
            body,
            body *:has(.informe-print) {
              min-height: 0 !important;
              height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
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
        <HStack align="center" gap={3}>
          {logoSrc && (
            <Image
              src={logoSrc}
              alt={nombreEstablecimiento}
              maxH="42px"
              maxW="100px"
              objectFit="contain"
            />
          )}
          <VStack align="start" gap={0.5}>
            <Text
              fontSize="xs"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wider"
              color="gray.600"
            >
              {nombreEstablecimiento} · Sistema de Apoyo para la Inocuidad Alimentaria
            </Text>
            <Heading size="xl" color="green.800" fontWeight="extrabold">
              {titulo}
            </Heading>
          </VStack>
        </HStack>
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

      {(configuracion.pie_informes ||
        configuracion.direccion ||
        configuracion.telefono ||
        configuracion.email) && (
        <Box
          mt={5}
          pt={2.5}
          borderTopWidth="1px"
          borderColor="gray.300"
          className="no-cortar"
        >
          {configuracion.pie_informes && (
            <Text fontSize="2xs" fontWeight="medium" color="gray.700">
              {configuracion.pie_informes}
            </Text>
          )}
          {(configuracion.direccion ||
            configuracion.localidad ||
            configuracion.provincia ||
            configuracion.telefono ||
            configuracion.email ||
            configuracion.sitio_web) && (
            <Text fontSize="2xs" color="gray.600" mt={0.5}>
              {[
                configuracion.direccion,
                configuracion.localidad,
                configuracion.provincia,
                configuracion.telefono,
                configuracion.email,
                configuracion.sitio_web,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
