import { useMemo } from "react";
import {
  Badge,
  Box,
  Card,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { PasoReceta, Receta } from "./types";

interface InsumoConsolidado {
  id: number;
  nombre: string;
  unidad: string;
  cantidadTotal: number;
  pasos: number[];
}

interface EquipoConsolidado {
  id: number;
  nombre: string;
  cantidadMax: number;
  pasos: number[];
}

export interface FichaRecetaPrintProps {
  receta: Receta;
}

export const consolidarRecursosParaPrint = (pasos: PasoReceta[] = []) => {
  const insumosMap = new Map<number, InsumoConsolidado>();
  const equiposMap = new Map<number, EquipoConsolidado>();

  const pasosOrdenados = [...pasos].sort((a, b) => a.numero_orden - b.numero_orden);

  pasosOrdenados.forEach((paso) => {
    // Insumos
    paso.insumos?.forEach((pi) => {
      const id = pi.insumo_id;
      const nombre = pi.insumo?.nombre ?? `Insumo #${id}`;
      const unidad = pi.insumo?.unidad_medida ?? "";
      const cant = Number(pi.cantidad_consumo_estimada) || 0;

      if (!insumosMap.has(id)) {
        insumosMap.set(id, {
          id,
          nombre,
          unidad,
          cantidadTotal: cant,
          pasos: [paso.numero_orden],
        });
      } else {
        const item = insumosMap.get(id)!;
        item.cantidadTotal += cant;
        if (!item.pasos.includes(paso.numero_orden)) {
          item.pasos.push(paso.numero_orden);
        }
      }
    });

    // Equipos
    paso.equipos?.forEach((pe) => {
      const id = pe.equipo_id;
      const nombre = pe.equipo?.nombre ?? `Equipo #${id}`;
      const cant = Number(pe.cantidad) || 1;

      if (!equiposMap.has(id)) {
        equiposMap.set(id, {
          id,
          nombre,
          cantidadMax: cant,
          pasos: [paso.numero_orden],
        });
      } else {
        const item = equiposMap.get(id)!;
        item.cantidadMax = Math.max(item.cantidadMax, cant);
        if (!item.pasos.includes(paso.numero_orden)) {
          item.pasos.push(paso.numero_orden);
        }
      }
    });
  });

  return {
    insumos: Array.from(insumosMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    equipos: Array.from(equiposMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    pasosOrdenados,
  };
};

/**
 * Componente nativo de Chakra UI para la impresión de la Ficha Técnica de Receta.
 * Permanece oculto en pantalla (display: none) y se activa exclusivamente mediante
 * @media print forzando fondo blanco y texto oscuro (independiente de Dark Mode).
 */
export const FichaRecetaPrint = ({ receta }: FichaRecetaPrintProps) => {
  const { insumos, equipos, pasosOrdenados } = useMemo(
    () => consolidarRecursosParaPrint(receta.pasos ?? []),
    [receta.pasos],
  );

  const fechaHoy = useMemo(
    () =>
      new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [],
  );

  const unidadRendimiento = receta.producto?.unidad_medida?.simbolo || "";
  const rendimientoStr = unidadRendimiento
    ? `${receta.rendimiento_estandar} ${unidadRendimiento}`
    : `${receta.rendimiento_estandar}`;

  return (
    <Box
      id="ficha-receta-print"
      className="ficha-receta-print light"
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
      {/* Estilos globales de impresión: define tamaño A4, márgenes por página y reseteo de pantalla */}
      <style>
        {`
          @page {
            size: A4 portrait;
            /* Margen en cada página: asegura que la 2da y sucesivas hojas tengan margen superior uniforme */
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
            /* Ocultar elementos generales de navegación o pantalla */
            body * {
              visibility: hidden;
            }
            .ficha-receta-print,
            .ficha-receta-print * {
              visibility: visible !important;
              color-scheme: light !important;
            }
            .ficha-receta-print {
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
            [data-part="positioner"]:not(:has(.ficha-receta-print)) {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Cabecera del Documento Imprimible */}
      <HStack
        justify="space-between"
        align="flex-start"
        borderBottomWidth="2px"
        borderColor="green.700"
        pb={3}
        mb={3}
      >
        <VStack align="start" gap={0.5}>
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="gray.600"
          >
            SAIA · Sistema de Administración de la Industria Alimenticia
          </Text>
          <Heading size="xl" color="green.800" fontWeight="extrabold">
            {receta.nombre_receta}
          </Heading>
        </VStack>
        <VStack align="end" gap={1}>
          <Badge
            colorPalette={receta.estado === "INHABILITADA" ? "red" : "teal"}
            variant="surface"
            fontSize="sm"
            px={2.5}
            py={1}
            borderRadius="md"
            fontWeight="bold"
            borderWidth="1px"
            borderColor={receta.estado === "INHABILITADA" ? "red.200" : "teal.200"}
          >
            {receta.codigo_receta}
          </Badge>
          <Text
            fontSize="2xs"
            color={receta.estado === "INHABILITADA" ? "red.600" : "gray.600"}
            fontWeight={receta.estado === "INHABILITADA" ? "bold" : "normal"}
          >
            Impreso: {fechaHoy} · Estado: {receta.estado}
          </Text>
        </VStack>
      </HStack>

      {/* Grilla de Especificaciones */}
      <SimpleGrid
        columns={4}
        gap={3}
        p={3}
        bg="gray.50"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        mb={4}
      >
        <Box>
          <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
            Producto elaborado
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {receta.producto?.nombre || `Producto #${receta.producto_id}`}
          </Text>
        </Box>
        <Box>
          <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
            Rendimiento estándar
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {rendimientoStr}
          </Text>
        </Box>
        <Box>
          <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
            Tiempo estimado total
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {receta.tiempo_estimado_total != null ? `${receta.tiempo_estimado_total} min` : "—"}
          </Text>
        </Box>
        <Box>
          <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
            Cantidad de pasos
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {pasosOrdenados.length} pasos
          </Text>
        </Box>
        {receta.observaciones && (
          <Box
            gridColumn="span 4"
            borderTopWidth="1px"
            borderStyle="dashed"
            borderColor="gray.300"
            pt={2}
            mt={1}
          >
            <Text fontSize="xs" color="gray.700">
              <Text as="span" fontWeight="bold">
                Observaciones:{" "}
              </Text>
              {receta.observaciones}
            </Text>
          </Box>
        )}
      </SimpleGrid>

      {/* Recursos Generales Requeridos: Insumos y Equipos */}
      <SimpleGrid
        columns={2}
        gap={4}
        mb={4}
        css={{ pageBreakInside: "avoid", breakInside: "avoid" }}
      >
        {/* Tabla de Insumos */}
        <Box>
          <Heading
            size="sm"
            color="green.700"
            borderBottomWidth="1px"
            borderColor="gray.300"
            pb={1}
            mb={2}
          >
            Insumos Generales Requeridos
          </Heading>
          {insumos.length === 0 ? (
            <Text fontSize="xs" color="gray.500">
              No requiere insumos específicos.
            </Text>
          ) : (
            <Table.Root size="sm" variant="outline" bg="white" borderWidth="1px" borderColor="gray.200">
              <Table.Header bg="gray.100">
                <Table.Row>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700">
                    Insumo
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                    Total
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700">
                    Pasos
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {insumos.map((ins, idx) => (
                  <Table.Row key={idx}>
                    <Table.Cell fontSize="xs" py={1.5}>
                      {ins.nombre}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" py={1.5} textAlign="right" fontWeight="medium">
                      {ins.cantidadTotal} {ins.unidad}
                    </Table.Cell>
                    <Table.Cell fontSize="2xs" color="gray.600" py={1.5}>
                      Paso{ins.pasos.length > 1 ? "s" : ""} {ins.pasos.join(", ")}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>

        {/* Tabla de Equipos */}
        <Box>
          <Heading
            size="sm"
            color="green.700"
            borderBottomWidth="1px"
            borderColor="gray.300"
            pb={1}
            mb={2}
          >
            Equipos a Utilizar
          </Heading>
          {equipos.length === 0 ? (
            <Text fontSize="xs" color="gray.500">
              No requiere equipos registrados.
            </Text>
          ) : (
            <Table.Root size="sm" variant="outline" bg="white" borderWidth="1px" borderColor="gray.200">
              <Table.Header bg="gray.100">
                <Table.Row>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700">
                    Equipo
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                    Cant.
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700">
                    Pasos
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {equipos.map((eq, idx) => (
                  <Table.Row key={idx}>
                    <Table.Cell fontSize="xs" py={1.5}>
                      {eq.nombre}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" py={1.5} textAlign="right" fontWeight="medium">
                      x{eq.cantidadMax}
                    </Table.Cell>
                    <Table.Cell fontSize="2xs" color="gray.600" py={1.5}>
                      Paso{eq.pasos.length > 1 ? "s" : ""} {eq.pasos.join(", ")}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </SimpleGrid>

      {/* Secuencia de Pasos */}
      <Box mb={2}>
        <Heading
          size="sm"
          color="green.700"
          borderBottomWidth="1px"
          borderColor="gray.300"
          pb={1}
          mb={3}
        >
          Secuencia de Pasos e Instrucciones de Trabajo
        </Heading>

        {pasosOrdenados.length === 0 ? (
          <Text fontSize="xs" color="gray.500">
            La receta no cuenta con pasos cargados.
          </Text>
        ) : (
          <Stack gap={3}>
            {pasosOrdenados.map((paso) => (
              <Card.Root
                key={paso.id}
                variant="outline"
                bg="white"
                borderColor="gray.300"
                borderLeftWidth="4px"
                borderLeftColor="green.600"
                p={3}
                css={{ pageBreakInside: "avoid", breakInside: "avoid" }}
              >
                <Card.Header p={0} pb={2}>
                  <HStack justify="space-between" align="baseline">
                    <HStack gap={2}>
                      <Badge colorPalette="green" variant="solid" size="sm">
                        Paso {paso.numero_orden}
                      </Badge>
                      <Heading size="sm" color="gray.900" fontWeight="bold">
                        {paso.titulo}
                      </Heading>
                    </HStack>
                  </HStack>
                </Card.Header>
                <Card.Body p={0} gap={2}>
                  <Box
                    bg="gray.50"
                    p={2.5}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Text fontSize="xs" color="gray.800" whiteSpace="pre-wrap" lineHeight="1.45">
                      {paso.instrucciones}
                    </Text>
                  </Box>
                  <HStack
                    gap={4}
                    fontSize="2xs"
                    color="gray.600"
                    borderTopWidth="1px"
                    borderStyle="dashed"
                    borderColor="gray.200"
                    pt={2}
                  >
                    <Box flex={1}>
                      <Text as="span" fontWeight="bold" color="gray.800">
                        Insumos:{" "}
                      </Text>
                      {paso.insumos && paso.insumos.length > 0
                        ? paso.insumos
                            .map(
                              (i) =>
                                `${i.insumo?.nombre ?? `Insumo #${i.insumo_id}`} (${i.cantidad_consumo_estimada} ${i.insumo?.unidad_medida ?? ""})`,
                            )
                            .join(", ")
                        : "Ninguno"}
                    </Box>
                    <Box flex={1}>
                      <Text as="span" fontWeight="bold" color="gray.800">
                        Equipos:{" "}
                      </Text>
                      {paso.equipos && paso.equipos.length > 0
                        ? paso.equipos
                            .map(
                              (e) =>
                                `${e.equipo?.nombre ?? `Equipo #${e.equipo_id}`} (x${e.cantidad})`,
                            )
                            .join(", ")
                        : "Ninguno"}
                    </Box>
                  </HStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};
