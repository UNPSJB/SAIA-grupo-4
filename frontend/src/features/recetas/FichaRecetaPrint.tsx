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
  Image,
  Text,
  VStack,
} from "@chakra-ui/react";
import type {
  AplicabilidadFrontalOut,
  ComposicionPorcentualResponse,
  DeclaracionIngredientesResponse,
  InformacionNutricionalResponse,
  PasoReceta,
  Receta,
  SellosAdvertenciaOut,
} from "./types";
import { useConfiguracion } from "../configuracion/useConfiguracion";
import { formatearCantidadEscalada } from "./utils/escalarReceta";
import {
  SeccionAplicabilidadPrint,
  SeccionComposicionPrint,
  SeccionNutricionPrint,
  SeccionSellosCalculoPrint,
} from "./components/SeccionesCalculoPrint";

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
  composicion?: ComposicionPorcentualResponse | null;
  declaracion?: DeclaracionIngredientesResponse | null;
  infoNutricional?: InformacionNutricionalResponse | null;
  aplicabilidad?: AplicabilidadFrontalOut | null;
  sellos?: SellosAdvertenciaOut | null;
  esModoAdmin?: boolean;
  factorEscala?: number;
  cantidadObjetivo?: number | null;
}

const consolidarRecursosParaPrint = (pasos: PasoReceta[] = []) => {
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
export const FichaRecetaPrint = ({
  receta,
  composicion,
  declaracion,
  infoNutricional,
  aplicabilidad,
  sellos,
  esModoAdmin = false,
  factorEscala = 1,
  cantidadObjetivo = null,
}: FichaRecetaPrintProps) => {
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
  const { configuracion, logoSrc } = useConfiguracion();
  const nombreEstablecimiento = configuracion.nombre_establecimiento || "SAIA-4";
  const unidadRendimiento = "g";
  const rendimientoStr = `${receta.rendimiento_estandar} ${unidadRendimiento}`;
  const estaEscalada = !esModoAdmin && Math.abs(factorEscala - 1) > 0.0001 && cantidadObjetivo != null;
  const rendimientoMostrado = estaEscalada
    ? `${Number(cantidadObjetivo).toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${unidadRendimiento} (Estándar: ${rendimientoStr} · ${factorEscala.toFixed(2)}x)`
    : rendimientoStr;

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
           {receta.nombre_receta}
         </Heading>
       </VStack>
     </HStack>
        <VStack align="end" gap={1}>
          <HStack gap={1.5}>
            <Badge
              colorPalette={receta.estado === "ARCHIVADA" ? "red" : "teal"}
              variant="surface"
              fontSize="sm"
              px={2.5}
              py={1}
              borderRadius="md"
              fontWeight="bold"
              borderWidth="1px"
              borderColor={receta.estado === "ARCHIVADA" ? "red.200" : "teal.200"}
            >
              {receta.codigo_receta}
            </Badge>
            <Badge
              colorPalette="gray"
              variant="surface"
              fontSize="sm"
              px={2}
              py={1}
              borderRadius="md"
              fontWeight="bold"
              borderWidth="1px"
              borderColor="gray.300"
            >
              v{receta.version}
            </Badge>
          </HStack>
          <Text
            fontSize="2xs"
            color={receta.estado === "ARCHIVADA" ? "red.600" : "gray.600"}
            fontWeight={receta.estado === "ARCHIVADA" ? "bold" : "normal"}
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
            {estaEscalada ? "Cantidad calculada" : "Rendimiento estándar"}
          </Text>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {rendimientoMostrado}
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

      {/* Composición Porcentual de la Receta */}
      {composicion && <SeccionComposicionPrint composicion={composicion} />}

      {/* Declaración de Ingredientes para Rótulo (CAA Cap. V) */}
      {declaracion && (
        <Box mb={4} css={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
          <HStack
            justify="space-between"
            align="center"
            borderBottomWidth="1px"
            borderColor="gray.300"
            pb={1}
            mb={2}
          >
            <Heading size="sm" color="green.700">
              Declaración de Ingredientes para Rótulo (CAA Cap. V)
            </Heading>
            <Badge
              colorPalette={declaracion.es_orden_manual ? "orange" : "teal"}
              variant="surface"
              fontSize="2xs"
              px={2}
              py={0.5}
              borderWidth="1px"
            >
              {declaracion.es_orden_manual
                ? "Orden Manual Personalizado"
                : "Orden Automático (por %)"}
            </Badge>
          </HStack>

          {declaracion.items.length === 0 ? (
            <Text fontSize="xs" color="gray.500" fontStyle="italic">
              No hay ingredientes para declarar.
            </Text>
          ) : (
            <Table.Root
              size="sm"
              variant="outline"
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              mb={2}
            >
              <Table.Header bg="gray.100">
                <Table.Row>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700" width="40px" textAlign="center">
                    #
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700">
                    Denominación Rótulo
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700">
                    Tipo
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700">
                    Clase / INS
                  </Table.ColumnHeader>
                  <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                    % en Mezcla
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {declaracion.items.map((item, idx) => (
                  <Table.Row key={item.insumo_id}>
                    <Table.Cell fontSize="xs" py={1.5} textAlign="center" fontWeight="bold">
                      {idx + 1}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" py={1.5} fontWeight="medium">
                      {item.denominacion_rotulo}
                    </Table.Cell>
                    <Table.Cell fontSize="2xs" py={1.5} textTransform="capitalize">
                      {item.categoria}
                    </Table.Cell>
                    <Table.Cell fontSize="2xs" py={1.5} color="gray.600">
                      {item.clase_funcional
                        ? item.numero_ins
                          ? `${item.clase_funcional} (INS ${item.numero_ins})`
                          : `${item.clase_funcional} (Sin INS)`
                        : "—"}
                    </Table.Cell>
                    <Table.Cell fontSize="xs" py={1.5} textAlign="right" fontWeight="bold">
                      {item.porcentaje_mezcla != null
                        ? `${Number(item.porcentaje_mezcla).toLocaleString("es-AR", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 2,
                          })}%`
                        : "—"}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}

          {declaracion.texto_legal_rotulo && (
            <Box
              bg="gray.50"
              p={2}
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
              mt={1}
            >
              <Text fontSize="2xs" fontWeight="bold" color="gray.700" mb={0.5}>
                Texto Legal para Rótulo:
              </Text>
              <Text fontSize="2xs" color="gray.800" fontStyle="italic" lineHeight="1.4">
                {declaracion.texto_legal_rotulo}
              </Text>
              {declaracion.leyenda_alergenos_caa && (
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                  color="gray.900"
                  mt={1}
                >
                  {declaracion.leyenda_alergenos_caa}
                </Text>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Información Nutricional del Producto Terminado (CAA / Mercosur) */}
      {infoNutricional && <SeccionNutricionPrint infoNutricional={infoNutricional} />}

      {/* Evaluación de Aplicabilidad (Ley 27.642) */}
      {aplicabilidad && <SeccionAplicabilidadPrint aplicabilidad={aplicabilidad} />}

      {/* Sellos de Advertencia y Leyendas Precautorias */}
      {sellos && <SeccionSellosCalculoPrint sellos={sellos} />}

      {/* Recursos Generales Requeridos: Insumos y Equipos (solo en modo operador) */}
      {!esModoAdmin && (
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
                        {formatearCantidadEscalada(ins.cantidadTotal, factorEscala)} {ins.unidad}
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
      )}

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
                            .map((i) => {
                              const cant = !esModoAdmin
                                ? formatearCantidadEscalada(
                                    Number(i.cantidad_consumo_estimada) || 0,
                                    factorEscala,
                                  )
                                : i.cantidad_consumo_estimada;
                              return `${i.insumo?.nombre ?? `Insumo #${i.insumo_id}`} (${cant} ${i.insumo?.unidad_medida ?? ""})`;
                            })
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
        {configuracion.pie_informes && (
          <Box
            mt={4}
            pt={2}
            borderTopWidth="1px"
            borderColor="gray.300"
            textAlign="center"
          >
            <Text fontSize="2xs" color="gray.600">
              {configuracion.pie_informes}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};