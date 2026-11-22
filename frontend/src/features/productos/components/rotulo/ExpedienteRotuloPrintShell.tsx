import type { ReactNode } from "react";
import { Badge, Box, Heading, HStack, Image, Text, VStack } from "@chakra-ui/react";
import { useConfiguracion } from "../../../configuracion/useConfiguracion";

interface ExpedienteRotuloPrintShellProps {
  id: string;
  className: string;
  tituloDocumento: string;
  badgeTexto?: string;
  detalleDerecha?: string | null;
  fechaTexto: string;
  leyendaBorrador: string;
  children: ReactNode;
}

export function ExpedienteRotuloPrintShell({
  id,
  className,
  tituloDocumento,
  badgeTexto = "BORRADOR CAA",
  detalleDerecha,
  fechaTexto,
  leyendaBorrador,
  children,
}: ExpedienteRotuloPrintShellProps) {
  const { configuracion, logoSrc } = useConfiguracion();
  const nombreEstablecimiento = configuracion.nombre_establecimiento || "SAIA-4";

  return (
    <Box
      id={id}
      className={`${className} light`}
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
            body * {
              visibility: hidden;
            }
            .${className},
            .${className} * {
              visibility: visible !important;
              color-scheme: light !important;
            }
            .${className} {
              padding: 0 !important;
              margin: 0 !important;
              box-sizing: border-box !important;
            }
            .tabla-expediente-print {
              width: 100%;
              border-collapse: collapse;
            }
            .tabla-expediente-print > thead {
              display: table-header-group;
            }
            .tabla-expediente-print > tfoot {
              display: table-footer-group;
            }
            .tabla-expediente-print > tbody > tr > td {
              padding: 0;
              vertical-align: top;
            }
            nav,
            aside,
            header,
            footer,
            button,
            .no-print,
            [data-part="backdrop"],
            [data-part="positioner"]:not(:has(.${className})) {
              display: none !important;
            }
          }
        `}
      </style>

      <table
        className="tabla-expediente-print"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <td style={{ paddingBottom: "12px" }}>
              <HStack
                justify="space-between"
                align="flex-start"
                borderBottomWidth="2px"
                borderColor="green.700"
                pb={2.5}
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
                    <Heading size="lg" color="green.800" fontWeight="extrabold">
                      {tituloDocumento}
                    </Heading>
                  </VStack>
                </HStack>

                <VStack align="end" gap={1} flexShrink={0}>
                  <Badge
                    colorPalette="orange"
                    variant="surface"
                    fontSize="xs"
                    px={2.5}
                    py={0.5}
                    borderRadius="md"
                    fontWeight="bold"
                    borderWidth="1px"
                    borderColor="orange.300"
                  >
                    {badgeTexto}
                  </Badge>
                  {detalleDerecha && (
                    <Text fontSize="2xs" color="gray.700" fontWeight="semibold">
                      {detalleDerecha}
                    </Text>
                  )}
                  <Text fontSize="2xs" color="gray.600">
                    {fechaTexto}
                  </Text>
                </VStack>
              </HStack>
            </td>
          </tr>
        </thead>

        <tfoot>
          <tr>
            <td style={{ paddingTop: "10px" }}>
              <Box
                bg="orange.100"
                borderRadius="md"
                px={3}
                py={1.5}
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  color="orange.800"
                  textAlign="center"
                >
                  {leyendaBorrador}
                </Text>
                <Text fontSize="2xs" color="orange.700" textAlign="center">
                  Documento de trabajo de carácter informativo y no vinculante. No constituye
                  aprobación ni certificación sanitaria oficial.
                </Text>
              </Box>
              {configuracion.pie_informes && (
                <Text fontSize="2xs" color="gray.600" textAlign="center" mt={1}>
                  {configuracion.pie_informes}
                </Text>
              )}
            </td>
          </tr>
        </tfoot>

        <tbody>
          <tr>
            <td>{children}</td>
          </tr>
        </tbody>
      </table>
    </Box>
  );
}
