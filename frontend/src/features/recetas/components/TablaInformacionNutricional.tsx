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
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiEdit,
  FiInfo,
} from "react-icons/fi";
import type { InformacionNutricionalResponse } from "../types";

interface TablaInformacionNutricionalProps {
  informacion: InformacionNutricionalResponse;
}

export const TablaInformacionNutricional = ({
  informacion,
}: TablaInformacionNutricionalProps) => {
  const navigate = useNavigate();

  const {
    rendimiento_estandar_g,
    tamano_porcion_g,
    es_calculable,
    tiene_porcion,
    insumos_sin_equivalencia,
    insumos_nutricion_pendiente,
    filas,
    leyenda_vd,
  } = informacion;

  const tienePendientes = insumos_nutricion_pendiente.length > 0;
  const tieneSinEquivalencia = insumos_sin_equivalencia.length > 0;

  return (
    <Card.Root
      variant="outline"
      bg="white"
      shadow="xs"
      borderColor={es_calculable ? "gray.200" : "orange.300"}
    >
      <Card.Header pb={3}>
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <HStack gap={2}>
            <Icon as={FiActivity} color="teal.600" boxSize={5} />
            <Heading size="md" color="gray.800">
              Información Nutricional
            </Heading>
          </HStack>

          <HStack gap={2} flexWrap="wrap">
            {es_calculable ? (
              <Badge colorPalette="green" variant="subtle" px={2.5} py={1}>
                <Icon as={FiCheckCircle} mr={1} />
                Cálculo completo
              </Badge>
            ) : (
              <Badge colorPalette="orange" variant="solid" px={2.5} py={1}>
                <Icon as={FiAlertTriangle} mr={1} />
                Cálculo incompleto
              </Badge>
            )}

            <Badge colorPalette="blue" variant="subtle" px={2.5} py={1}>
              Rendimiento: {Number(rendimiento_estandar_g).toLocaleString("es-AR")} g
            </Badge>

            {tiene_porcion && tamano_porcion_g != null ? (
              <Badge colorPalette="teal" variant="subtle" px={2.5} py={1}>
                Porción: {Number(tamano_porcion_g).toLocaleString("es-AR")} g
              </Badge>
            ) : (
              <Badge colorPalette="gray" variant="outline" px={2.5} py={1}>
                Sin porción configurada
              </Badge>
            )}
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body pt={0}>
        <VStack align="stretch" gap={4}>
          {tienePendientes && (
            <Box
              p={3.5}
              bg="orange.50"
              borderWidth="1px"
              borderColor="orange.200"
              borderRadius="md"
            >
              <HStack align="start" gap={2.5} mb={2.5}>
                <Icon as={FiAlertTriangle} color="orange.600" mt={0.5} flexShrink={0} />
                <VStack align="start" gap={0.5} flex={1}>
                  <Text fontSize="sm" fontWeight="semibold" color="orange.900">
                    No se puede calcular la información nutricional porque hay insumos con datos en estado Pendiente:
                  </Text>
                </VStack>
              </HStack>
              <VStack align="stretch" gap={2} pl={{ base: 0, sm: 6 }}>
                {insumos_nutricion_pendiente.map((item) => (
                  <HStack
                    key={item.insumo_id}
                    justify="space-between"
                    align="center"
                    flexWrap="wrap"
                    gap={3}
                    p={2.5}
                    bg="white"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="orange.200"
                  >
                    <Box fontSize="xs" color="orange.800" flex={1}>
                      <Text fontWeight="semibold" color="gray.800">
                        {item.nombre} ({item.categoria})
                      </Text>
                      <Text color="orange.700">
                        Faltan: {item.campos_faltantes.join(", ")}
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      colorPalette="orange"
                      variant="outline"
                      onClick={() =>
                        navigate(`/insumos?editarId=${item.insumo_id}`, {
                          state: {
                            from: `/recetas/${informacion.receta_id}/ficha-tecnica`,
                            label: "Ficha Técnica",
                            padre: { nombre: "Recetas", to: "/recetas" },
                          },
                        })
                      }
                    >
                      <Icon as={FiEdit} />
                      Completar nutrición en Insumos
                    </Button>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}

          {tieneSinEquivalencia && (
            <Box
              p={3.5}
              bg="orange.50"
              borderWidth="1px"
              borderColor="orange.200"
              borderRadius="md"
            >
              <HStack align="start" gap={2.5} mb={2.5}>
                <Icon as={FiAlertTriangle} color="orange.600" mt={0.5} flexShrink={0} />
                <Text fontSize="sm" fontWeight="semibold" color="orange.900">
                  Falta configurar equivalencias a gramos para algunos insumos:
                </Text>
              </HStack>
              <VStack align="stretch" gap={2} pl={{ base: 0, sm: 6 }}>
                {insumos_sin_equivalencia.map((sin) => (
                  <HStack
                    key={sin.insumo_id}
                    justify="space-between"
                    align="center"
                    flexWrap="wrap"
                    gap={3}
                    p={2.5}
                    bg="white"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="orange.200"
                  >
                    <Text fontSize="xs" color="orange.800" flex={1}>
                      {sin.mensaje}
                    </Text>
                    <Button
                      size="xs"
                      colorPalette="orange"
                      variant="outline"
                      onClick={() =>
                        navigate(`/insumos?editarId=${sin.insumo_id}`, {
                          state: {
                            from: `/recetas/${informacion.receta_id}/ficha-tecnica`,
                            label: "Ficha Técnica",
                            padre: { nombre: "Recetas", to: "/recetas" },
                          },
                        })
                      }
                    >
                      <Icon as={FiEdit} />
                      Completar equivalencia en Insumos
                    </Button>
                  </HStack>
                ))}
              </VStack>
            </Box>
          )}

          {es_calculable && !tiene_porcion && (
            <Box
              p={3}
              bg="blue.50"
              borderWidth="1px"
              borderColor="blue.200"
              borderRadius="md"
            >
              <HStack align="center" gap={2}>
                <Icon as={FiInfo} color="blue.600" flexShrink={0} />
                <Text fontSize="xs" color="blue.900">
                  La receta no tiene configurado un <strong>tamaño de porción (g)</strong>. Se muestran los valores cada 100 g; configurá el tamaño de porción en la receta para calcular los valores por porción y % VD.
                </Text>
              </HStack>
            </Box>
          )}

          {es_calculable && (
            <>
              <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md">
                <Table.Root size="sm" variant="line">
                  <Table.Header bg="gray.50">
                    <Table.Row>
                      <Table.ColumnHeader fontWeight="bold" color="gray.700">
                        Nutriente
                      </Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right" fontWeight="bold" color="gray.700">
                        Cantidad por 100 g
                      </Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right" fontWeight="bold" color="gray.700">
                        {tiene_porcion && tamano_porcion_g != null
                          ? `Por porción (${Number(tamano_porcion_g).toLocaleString("es-AR")} g)`
                          : "Por porción"}
                      </Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right" fontWeight="bold" color="gray.700">
                        % VD (*)
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filas.map((fila) => {
                      const paddingLeft =
                        fila.nivel_indentacion === 0
                          ? 3
                          : fila.nivel_indentacion === 1
                          ? 7
                          : 11;
                      const esPrincipal = fila.nivel_indentacion === 0;

                      return (
                        <Table.Row key={fila.codigo_nutriente}>
                          <Table.Cell
                            pl={paddingLeft}
                            fontSize="sm"
                            fontWeight={esPrincipal ? "semibold" : "normal"}
                            color={esPrincipal ? "gray.900" : "gray.700"}
                          >
                            {fila.nombre_etiqueta}
                          </Table.Cell>
                          <Table.Cell textAlign="right" fontSize="sm" color="gray.800">
                            {fila.valor_100g_formateado ?? "—"}
                          </Table.Cell>
                          <Table.Cell textAlign="right" fontSize="sm" color="gray.900" fontWeight="medium">
                            {tiene_porcion ? (fila.valor_porcion_formateado ?? "—") : "—"}
                          </Table.Cell>
                          <Table.Cell textAlign="right" fontSize="sm" color="gray.800">
                            {!fila.lleva_vd || !tiene_porcion
                              ? "—"
                              : fila.porcentaje_vd != null
                              ? `${fila.porcentaje_vd}%`
                              : "—"}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>

              <Text fontSize="xs" color="gray.600" lineHeight="short">
                {leyenda_vd}
              </Text>
            </>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
};
