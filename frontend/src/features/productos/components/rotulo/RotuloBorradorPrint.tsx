import { useMemo } from "react";
import { Badge, Box, Heading, HStack, Image, Text, VStack } from "@chakra-ui/react";
import { useConfiguracion } from "../../../configuracion/useConfiguracion";
import type { VistaPreviaRotulo } from "../../types";
import { DocumentoRotuloBorrador } from "./DocumentoRotuloBorrador";

interface RotuloBorradorPrintProps {
  vistaPrevia: VistaPreviaRotulo;
}

export function RotuloBorradorPrint({ vistaPrevia }: RotuloBorradorPrintProps) {
  const { configuracion, logoSrc } = useConfiguracion();
  const nombreEstablecimiento = configuracion.nombre_establecimiento || "SAIA-4";
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
    <Box
      id="rotulo-borrador-print"
      className="rotulo-borrador-print light"
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
            .rotulo-borrador-print,
            .rotulo-borrador-print * {
              visibility: visible !important;
              color-scheme: light !important;
            }
            .rotulo-borrador-print {
              padding: 0 !important;
              margin: 0 !important;
              box-sizing: border-box !important;
            }
            nav,
            aside,
            header,
            footer,
            button,
            .no-print,
            [data-part="backdrop"],
            [data-part="positioner"]:not(:has(.rotulo-borrador-print)) {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Cabecera institucional consistente con FichaRecetaPrint */}
      <HStack
        justify="space-between"
        align="flex-start"
        borderBottomWidth="2px"
        borderColor="green.700"
        pb={3}
        mb={3}
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
              Borrador de Rótulo — {vistaPrevia.producto_nombre}
            </Heading>
          </VStack>
        </HStack>

        <VStack align="end" gap={1}>
          <Badge
            colorPalette="orange"
            variant="surface"
            fontSize="sm"
            px={2.5}
            py={1}
            borderRadius="md"
            fontWeight="bold"
            borderWidth="1px"
            borderColor="orange.300"
          >
            BORRADOR CAA
          </Badge>
          <Text fontSize="2xs" color="gray.600">
            Impreso: {fechaHoy}
            {vistaPrevia.receta_codigo ? ` · ${vistaPrevia.receta_codigo}` : ""}
          </Text>
        </VStack>
      </HStack>

      <DocumentoRotuloBorrador vistaPrevia={vistaPrevia} modoImpresion />
    </Box>
  );
}
