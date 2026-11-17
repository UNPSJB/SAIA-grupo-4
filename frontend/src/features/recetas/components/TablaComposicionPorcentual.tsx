import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Icon,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiEdit,
  FiPieChart,
} from "react-icons/fi";
import type { ComposicionPorcentualResponse, ItemComposicionPorcentual } from "../types";

interface TablaComposicionPorcentualProps {
  composicion: ComposicionPorcentualResponse;
  loading?: boolean;
}

export const TablaComposicionPorcentual = ({
  composicion,
  loading: _loading = false,
}: TablaComposicionPorcentualProps) => {
  const navigate = useNavigate();

  const {
    ingredientes,
    aditivos,
    peso_total_mezcla_g,
    suma_porcentajes,
    verificacion_100,
    es_completa,
    insumos_sin_equivalencia,
  } = composicion;

  const tieneSinEquivalencia = insumos_sin_equivalencia && insumos_sin_equivalencia.length > 0;

  const renderFilas = (items: ItemComposicionPorcentual[]) => {
    if (items.length === 0) {
      return (
        <Table.Row>
          <Table.Cell colSpan={4} textAlign="center" color="gray.500" py={4} fontSize="sm">
            No hay elementos registrados en este grupo.
          </Table.Cell>
        </Table.Row>
      );
    }

    return items.map((item) => (
      <Table.Row key={item.insumo_id}>
        <Table.Cell fontSize="sm" fontWeight="medium" color="gray.900" py={2.5}>
          {item.nombre}
        </Table.Cell>
        <Table.Cell fontSize="sm" textAlign="right" color="gray.800" py={2.5}>
          {Number(item.cantidad_nominal).toLocaleString("es-AR", {
            maximumFractionDigits: 3,
          })}{" "}
          {item.unidad_nominal}
        </Table.Cell>
        <Table.Cell fontSize="sm" textAlign="right" color="gray.900" py={2.5}>
          {item.masa_equivalente_g != null ? (
            `${Number(item.masa_equivalente_g).toLocaleString("es-AR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 2,
            })} g`
          ) : (
            <Badge colorPalette="orange" variant="outline" size="sm">
              Sin equivalencia
            </Badge>
          )}
        </Table.Cell>
        <Table.Cell fontSize="sm" textAlign="right" py={2.5}>
          {item.porcentaje_mezcla != null ? (
            <Badge
              colorPalette="teal"
              variant="subtle"
              size="md"
              px={2.5}
              py={0.5}
              fontSize="xs"
              fontWeight="bold"
            >
              {Number(item.porcentaje_mezcla).toLocaleString("es-AR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              })}%
            </Badge>
          ) : (
            <Text as="span" color="gray.400" fontSize="sm">
              —
            </Text>
          )}
        </Table.Cell>
      </Table.Row>
    ));
  };

  return (
    <Card.Root variant="outline" bg="white" shadow="xs" w="full">
      <Card.Header pb={3}>
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
          <HStack gap={2}>
            <Icon as={FiPieChart} color="teal.600" />
            <Heading size="md" color="gray.800">
              Composición Porcentual
            </Heading>
          </HStack>

          {es_completa && verificacion_100 ? (
            <Badge colorPalette="green" variant="solid" size="md">
              <Icon as={FiCheckCircle} mr={1} /> Total: {suma_porcentajes.toFixed(1)}%
            </Badge>
          ) : (
            <Badge colorPalette="orange" variant="outline" size="md">
              <Icon as={FiAlertTriangle} mr={1} /> Verificación: {es_completa ? `${suma_porcentajes.toFixed(1)}%` : "Incompleta"}
            </Badge>
          )}
        </HStack>
      </Card.Header>

      <Card.Body pt={0} gap={4}>
        {/* Banner de advertencia si faltan equivalencias */}
        {tieneSinEquivalencia && (
          <Box
            p={4}
            bg="orange.50"
            border="1px solid"
            borderColor="orange.200"
            borderLeftWidth="5px"
            borderLeftColor="orange.500"
            borderRadius="md"
          >
            <HStack align="flex-start" gap={3} mb={3}>
              <Icon as={FiAlertTriangle} color="orange.600" boxSize={6} mt={0.5} flexShrink={0} />
              <VStack align="start" gap={1} flex="1">
                <Text fontSize="md" fontWeight="bold" color="orange.900">
                  Faltan equivalencias de conversión a masa
                </Text>
                <Text fontSize="sm" color="orange.800" lineHeight="short">
                  Para calcular el porcentaje real sobre el peso total de la formulación, los siguientes insumos deben tener configurada su equivalencia en gramos:
                </Text>
              </VStack>
            </HStack>

            <VStack align="stretch" gap={2} pl={{ base: 0, sm: 9 }}>
              {insumos_sin_equivalencia.map((sinEq) => (
                <HStack
                  key={sinEq.insumo_id}
                  justify="space-between"
                  align="center"
                  flexWrap="wrap"
                  gap={3}
                  p={2.5}
                  bg="white"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="orange.200"
                >
                  <Text fontSize="sm" color="gray.800">
                    <strong>{sinEq.nombre}</strong> ({sinEq.unidad_simbolo}):{" "}
                    <Text as="span" color="orange.700" fontWeight="medium">
                      requiere {sinEq.equivalencia_requerida}
                    </Text>
                  </Text>
                  <Button
                    size="xs"
                    colorPalette="orange"
                    variant="outline"
                    onClick={() =>
                      navigate(`/insumos?editarId=${sinEq.insumo_id}`, {
                        state: {
                          from: `/recetas/${composicion.receta_id}/ficha-tecnica`,
                          label: "Ficha Técnica",
                          padre: { nombre: "Recetas", to: "/recetas" },
                        },
                      })
                    }
                  >
                    <FiEdit /> Completar equivalencia en Insumos
                  </Button>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Tabla consolidada con secciones separadas */}
        <Table.Root size="md" variant="outline" borderWidth="1px" borderColor="gray.200">
          <Table.Header bg="gray.100">
            <Table.Row>
              <Table.ColumnHeader fontSize="sm" fontWeight="bold" color="gray.800" py={3}>
                Ingrediente (Denominación)
              </Table.ColumnHeader>
              <Table.ColumnHeader fontSize="sm" fontWeight="bold" color="gray.800" textAlign="right" py={3}>
                Cantidad / Unidad Nominal
              </Table.ColumnHeader>
              <Table.ColumnHeader fontSize="sm" fontWeight="bold" color="gray.800" textAlign="right" py={3}>
                Masa Equivalente (g)
              </Table.ColumnHeader>
              <Table.ColumnHeader fontSize="sm" fontWeight="bold" color="gray.800" textAlign="right" py={3}>
                % en Mezcla
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {/* Grupo 1: Ingredientes / Materias Primas */}
            <Table.Row bg="gray.50">
              <Table.Cell colSpan={4} py={2} px={3}>
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="teal.800">
                  Ingredientes (Materias Primas)
                </Text>
              </Table.Cell>
            </Table.Row>
            {renderFilas(ingredientes)}

            {/* Grupo 2: Aditivos */}
            <Table.Row bg="gray.50">
              <Table.Cell colSpan={4} py={2} px={3}>
                <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="teal.800">
                  Aditivos
                </Text>
              </Table.Cell>
            </Table.Row>
            {renderFilas(aditivos)}
          </Table.Body>
        </Table.Root>

        {/* Pie de Tabla con Resumen y Verificación */}
        <HStack
          justify="space-between"
          align="center"
          p={3.5}
          bg="gray.50"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="md"
          flexWrap="wrap"
          gap={3}
        >
          <HStack gap={1.5}>
            <Text fontSize="sm" color="gray.700">
              Peso total de la mezcla:
            </Text>
            <Text fontSize="md" fontWeight="bold" color="gray.900">
              {Number(peso_total_mezcla_g).toLocaleString("es-AR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2,
              })}{" "}
              g
            </Text>
          </HStack>

          <HStack gap={2}>
            <Text fontSize="sm" color="gray.700">
              Suma de porcentajes:
            </Text>
            <Badge
              colorPalette={verificacion_100 ? "green" : "orange"}
              variant="surface"
              size="md"
              px={3}
              py={1}
              fontSize="sm"
              fontWeight="bold"
            >
              {suma_porcentajes.toFixed(1)}% {verificacion_100 ? "✓" : "⚠️"}
            </Badge>
          </HStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
};
