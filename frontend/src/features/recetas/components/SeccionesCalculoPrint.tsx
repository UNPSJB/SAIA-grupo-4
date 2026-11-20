import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { formatearFechaISO } from "../../../utils/fecha";
import type {
  AplicabilidadFrontalOut,
  ComposicionPorcentualResponse,
  InformacionNutricionalResponse,
  SellosAdvertenciaOut,
} from "../types";
import { resolverVeredictoSello } from "./MemoriaCalculoSellos";
import { LeyendaRectangular, OctogonoReglamentario } from "./SellosGraficos";

interface SeccionComposicionPrintProps {
  composicion: ComposicionPorcentualResponse;
  titulo?: string;
  esOrdenManual?: boolean;
}

export function SeccionComposicionPrint({
  composicion,
  titulo = "Composición Porcentual de la Formulación",
  esOrdenManual = false,
}: SeccionComposicionPrintProps) {
  return (
    <Box mb={4} css={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
      <HStack
        justify="space-between"
        align="center"
        borderBottomWidth="1px"
        borderColor="gray.300"
        pb={1}
        mb={2}
        flexWrap="wrap"
        gap={2}
      >
        <Heading size="sm" color="green.700">
          {titulo}
        </Heading>
        <HStack gap={2} flexWrap="wrap">
          {esOrdenManual && (
            <Badge colorPalette="orange" variant="subtle" fontSize="2xs" px={2} py={0.5}>
              Orden manual CAA
            </Badge>
          )}
          <Badge
            colorPalette={composicion.verificacion_100 ? "teal" : "orange"}
            variant="surface"
            fontSize="2xs"
            px={2}
            py={0.5}
            borderWidth="1px"
          >
            Total: {composicion.suma_porcentajes.toFixed(1)}%{" "}
            {composicion.verificacion_100 ? "✓" : "⚠️"}
          </Badge>
          <Text fontSize="2xs" color="gray.600" fontWeight="medium">
            Peso total mezcla:{" "}
            {Number(composicion.peso_total_mezcla_g).toLocaleString("es-AR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 2,
            })}{" "}
            g
          </Text>
        </HStack>
      </HStack>

      {/* Tabla de Ingredientes */}
      <Box mb={2}>
        <Text
          fontSize="2xs"
          fontWeight="bold"
          textTransform="uppercase"
          color="gray.600"
          mb={1}
        >
          Ingredientes
        </Text>
        {composicion.ingredientes.length === 0 ? (
          <Text fontSize="xs" color="gray.500" fontStyle="italic">
            No hay ingredientes registrados.
          </Text>
        ) : (
          <Table.Root
            size="sm"
            variant="outline"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <Table.Header bg="gray.100">
              <Table.Row>
                <Table.ColumnHeader fontSize="2xs" color="gray.700">
                  Ingrediente (Denominación)
                </Table.ColumnHeader>
                <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                  Cant. Nominal
                </Table.ColumnHeader>
                <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                  Masa Equiv. (g)
                </Table.ColumnHeader>
                <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                  % en Mezcla
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {composicion.ingredientes.map((item) => (
                <Table.Row key={item.insumo_id}>
                  <Table.Cell fontSize="xs" py={1.5}>
                    {item.nombre}
                  </Table.Cell>
                  <Table.Cell fontSize="xs" py={1.5} textAlign="right">
                    {Number(item.cantidad_nominal).toLocaleString("es-AR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    {item.unidad_nominal}
                  </Table.Cell>
                  <Table.Cell fontSize="xs" py={1.5} textAlign="right">
                    {item.masa_equivalente_g != null
                      ? `${Number(item.masa_equivalente_g).toLocaleString("es-AR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })} g`
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
      </Box>

      {/* Tabla de Aditivos (si existen) */}
      {composicion.aditivos.length > 0 && (
        <Box mb={2}>
          <Text
            fontSize="2xs"
            fontWeight="bold"
            textTransform="uppercase"
            color="gray.600"
            mb={1}
          >
            Aditivos
          </Text>
          <Table.Root
            size="sm"
            variant="outline"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
          >
            <Table.Header bg="gray.100">
              <Table.Row>
                <Table.ColumnHeader fontSize="2xs" color="gray.700">
                  Aditivo (Denominación)
                </Table.ColumnHeader>
                <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                  Cant. Nominal
                </Table.ColumnHeader>
                <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                  Masa Equiv. (g)
                </Table.ColumnHeader>
                <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                  % en Mezcla
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {composicion.aditivos.map((item) => (
                <Table.Row key={item.insumo_id}>
                  <Table.Cell fontSize="xs" py={1.5}>
                    {item.nombre}
                  </Table.Cell>
                  <Table.Cell fontSize="xs" py={1.5} textAlign="right">
                    {Number(item.cantidad_nominal).toLocaleString("es-AR", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    {item.unidad_nominal}
                  </Table.Cell>
                  <Table.Cell fontSize="xs" py={1.5} textAlign="right">
                    {item.masa_equivalente_g != null
                      ? `${Number(item.masa_equivalente_g).toLocaleString("es-AR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })} g`
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
        </Box>
      )}

      {composicion.insumos_sin_equivalencia &&
        composicion.insumos_sin_equivalencia.length > 0 && (
          <Text fontSize="2xs" color="red.600" fontStyle="italic" mt={1}>
            * Nota: Insumos sin conversión equivalente registrada (
            {composicion.insumos_sin_equivalencia.map((i) => i.nombre).join(", ")}).
          </Text>
        )}
    </Box>
  );
}

interface SeccionNutricionPrintProps {
  infoNutricional: InformacionNutricionalResponse;
  titulo?: string;
  baseEtiqueta?: string;
}

export function SeccionNutricionPrint({
  infoNutricional,
  titulo = "Información Nutricional (CAA Cap. V / Mercosur)",
  baseEtiqueta = "100 g",
}: SeccionNutricionPrintProps) {
  return (
    <Box mb={4} css={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
      <Heading
        size="sm"
        color="green.700"
        borderBottomWidth="1px"
        borderColor="gray.300"
        pb={1}
        mb={2}
      >
        {titulo}
      </Heading>
      <Box
        p={3}
        bg="white"
        borderWidth="1px"
        borderColor="gray.300"
        borderRadius="md"
      >
        <HStack justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
          <Heading size="xs" color="gray.800" textTransform="uppercase">
            Información Nutricional
          </Heading>
          <HStack gap={1.5}>
            <Badge colorPalette="blue" variant="subtle" size="xs">
              Rendimiento:{" "}
              {Number(infoNutricional.rendimiento_estandar_g).toLocaleString("es-AR")} g
            </Badge>
            {infoNutricional.tiene_porcion && infoNutricional.tamano_porcion_g != null ? (
              <Badge colorPalette="teal" variant="subtle" size="xs">
                Porción:{" "}
                {Number(infoNutricional.tamano_porcion_g).toLocaleString("es-AR")} g
              </Badge>
            ) : (
              <Badge colorPalette="gray" variant="outline" size="xs">
                Sin porción configurada
              </Badge>
            )}
          </HStack>
        </HStack>

        {!infoNutricional.es_calculable ? (
          <Box
            bg="orange.50"
            p={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor="orange.200"
          >
            <Text fontSize="2xs" fontWeight="bold" color="orange.900" mb={0.5}>
              Información nutricional incompleta:
            </Text>
            {infoNutricional.insumos_nutricion_pendiente.map((item) => (
              <Text key={item.insumo_id} fontSize="2xs" color="orange.800">
                • {item.nombre}: faltan {item.campos_faltantes.join(", ")}
              </Text>
            ))}
            {infoNutricional.insumos_sin_equivalencia.map((sin) => (
              <Text key={sin.insumo_id} fontSize="2xs" color="orange.800">
                • {sin.mensaje}
              </Text>
            ))}
          </Box>
        ) : (
          <>
            <Table.Root size="sm" variant="line" mb={1.5}>
              <Table.Header bg="gray.100">
                <Table.Row>
                  <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                    Nutriente
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    fontSize="2xs"
                    py={1}
                    textAlign="right"
                    color="gray.700"
                  >
                    Por {baseEtiqueta}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    fontSize="2xs"
                    py={1}
                    textAlign="right"
                    color="gray.700"
                  >
                    {infoNutricional.tiene_porcion && infoNutricional.tamano_porcion_g != null
                      ? `Por porción (${Number(infoNutricional.tamano_porcion_g).toLocaleString("es-AR")} g)`
                      : "Por porción"}
                  </Table.ColumnHeader>
                  <Table.ColumnHeader
                    fontSize="2xs"
                    py={1}
                    textAlign="right"
                    color="gray.700"
                  >
                    % VD (*)
                  </Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {infoNutricional.filas.map((fila) => (
                  <Table.Row key={fila.codigo_nutriente}>
                    <Table.Cell
                      fontSize="2xs"
                      py={1}
                      pl={
                        fila.nivel_indentacion === 0
                          ? 2
                          : fila.nivel_indentacion === 1
                            ? 5
                            : 8
                      }
                      fontWeight={fila.nivel_indentacion === 0 ? "semibold" : "normal"}
                      color="gray.800"
                    >
                      {fila.nombre_etiqueta}
                    </Table.Cell>
                    <Table.Cell fontSize="2xs" py={1} textAlign="right" color="gray.800">
                      {fila.valor_100g_formateado ?? "—"}
                    </Table.Cell>
                    <Table.Cell fontSize="2xs" py={1} textAlign="right" color="gray.800">
                      {infoNutricional.tiene_porcion
                        ? (fila.valor_porcion_formateado ?? "—")
                        : "—"}
                    </Table.Cell>
                    <Table.Cell fontSize="2xs" py={1} textAlign="right" color="gray.800">
                      {!fila.lleva_vd || !infoNutricional.tiene_porcion
                        ? "—"
                        : fila.porcentaje_vd != null
                          ? `${fila.porcentaje_vd}%`
                          : "—"}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
            <Text fontSize="2xs" color="gray.600" lineHeight="1.3">
              {infoNutricional.leyenda_vd}
            </Text>
          </>
        )}
      </Box>
    </Box>
  );
}

interface SeccionAplicabilidadPrintProps {
  aplicabilidad: AplicabilidadFrontalOut;
  titulo?: string;
}

export function SeccionAplicabilidadPrint({
  aplicabilidad,
  titulo = "Evaluación de Aplicabilidad (Ley 27.642)",
}: SeccionAplicabilidadPrintProps) {
  return (
    <Box mb={4} css={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
      <Heading
        size="sm"
        color="green.700"
        borderBottomWidth="1px"
        borderColor="gray.300"
        pb={1}
        mb={2}
      >
        {titulo}
      </Heading>
      <Box
        p={3}
        bg="white"
        borderWidth="1px"
        borderColor="gray.300"
        borderRadius="md"
      >
        <HStack justify="space-between" align="center" mb={1.5} flexWrap="wrap" gap={2}>
          <Text fontSize="xs" fontWeight="bold" color="gray.800">
            {aplicabilidad.dictamen_titulo}
          </Text>
          <Badge
            colorPalette={aplicabilidad.dictamen === "APLICA" ? "green" : "gray"}
            variant="subtle"
            size="xs"
          >
            {aplicabilidad.dictamen.replace(/_/g, " ")}
          </Badge>
        </HStack>
        <Text fontSize="2xs" color="gray.700" mb={2} lineHeight="1.35">
          {aplicabilidad.motivo}
        </Text>

        <Table.Root size="sm" variant="line" mb={2}>
          <Table.Header bg="gray.100">
            <Table.Row>
              <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                Criterio evaluado
              </Table.ColumnHeader>
              <Table.ColumnHeader
                fontSize="2xs"
                py={1}
                textAlign="right"
                color="gray.700"
              >
                Resultado
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {[
              {
                label: "Azúcares agregados",
                presente: aplicabilidad.tiene_azucares_agregados,
                esSustancia: false,
              },
              {
                label: "Grasas agregadas",
                presente: aplicabilidad.tiene_grasas_agregadas,
                esSustancia: false,
              },
              {
                label: "Sodio agregado",
                presente: aplicabilidad.tiene_sodio_agregado,
                esSustancia: false,
              },
              {
                label: "Edulcorantes",
                presente: aplicabilidad.contiene_edulcorantes,
                esSustancia: true,
              },
              {
                label: "Cafeína",
                presente: aplicabilidad.contiene_cafeina,
                esSustancia: true,
              },
            ].map((criterio) => (
              <Table.Row key={criterio.label}>
                <Table.Cell fontSize="2xs" py={1} color="gray.800">
                  {criterio.label}
                </Table.Cell>
                <Table.Cell
                  fontSize="2xs"
                  py={1}
                  textAlign="right"
                  fontWeight="medium"
                  color="gray.800"
                >
                  {criterio.esSustancia
                    ? criterio.presente
                      ? "Presente"
                      : "Ausente"
                    : criterio.presente
                      ? "Sí"
                      : "No"}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>

        <Text fontSize="2xs" color="gray.600">
          Marco normativo: {aplicabilidad.version_normativa}
        </Text>
      </Box>
    </Box>
  );
}

interface SeccionSellosCalculoPrintProps {
  sellos: SellosAdvertenciaOut;
  titulo?: string;
  mostrarGraficosSellos?: boolean;
  mostrarCuandoNoAplica?: boolean;
}

export function SeccionSellosCalculoPrint({
  sellos,
  titulo = "Sellos de Advertencia y Leyendas Precautorias",
  mostrarGraficosSellos = true,
  mostrarCuandoNoAplica = false,
}: SeccionSellosCalculoPrintProps) {
  if (!mostrarCuandoNoAplica && !sellos.aplica_evaluacion_sellos) {
    return null;
  }

  return (
    <Box mb={4} css={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
      <Heading
        size="sm"
        color="green.700"
        borderBottomWidth="1px"
        borderColor="gray.300"
        pb={1}
        mb={2}
      >
        {titulo}
      </Heading>
      <Box
        p={3}
        bg="white"
        borderWidth="1px"
        borderColor="gray.300"
        borderRadius="md"
      >
        <Text fontSize="2xs" color="gray.600" mb={2}>
          Base de cálculo: {sellos.base_calculo} (
          {sellos.es_liquido ? "Líquido" : "Sólido"})
          {sellos.valor_energetico_100 != null &&
            ` • Energía total: ${sellos.valor_energetico_100.toLocaleString("es-AR")} kcal / ${sellos.base_calculo}`}
        </Text>

        {!sellos.es_calculable ? (
          <Box
            bg="orange.50"
            p={2}
            borderRadius="md"
            borderWidth="1px"
            borderColor="orange.200"
            mb={2}
          >
            <Text fontSize="2xs" color="orange.900">
              {sellos.mensaje_bloqueo ||
                "No se pueden calcular los sellos porque la información nutricional está incompleta."}
            </Text>
          </Box>
        ) : (
          <>
            {mostrarGraficosSellos && (
              <>
                {sellos.sellos.length === 0 &&
                sellos.leyendas_precautorias.length === 0 ? (
                  <Box
                    bg="gray.50"
                    p={2}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                    mb={2}
                  >
                    <Text fontSize="xs" fontWeight="medium" color="gray.700">
                      Sin sellos de advertencia aplicables
                    </Text>
                  </Box>
                ) : (
                  <VStack align="stretch" gap={2.5} mb={3}>
                    {sellos.sellos.length > 0 && (
                      <Flex gap={3} flexWrap="wrap" align="center">
                        {sellos.sellos.map((sello) => (
                          <OctogonoReglamentario
                            key={sello.codigo}
                            codigo={sello.codigo}
                            texto={sello.texto}
                            compact
                          />
                        ))}
                      </Flex>
                    )}
                    {sellos.leyendas_precautorias.length > 0 && (
                      <Flex gap={2.5} flexWrap="wrap" align="center">
                        {sellos.leyendas_precautorias.map((leyenda) => (
                          <LeyendaRectangular
                            key={leyenda.codigo}
                            codigo={leyenda.codigo}
                            texto={leyenda.texto}
                            compact
                          />
                        ))}
                      </Flex>
                    )}
                  </VStack>
                )}
              </>
            )}

            {sellos.memoria_calculo.length > 0 ? (
              <Table.Root size="sm" variant="line" mb={2}>
                <Table.Header bg="gray.100">
                  <Table.Row>
                    <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                      Nutriente / Criterio
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                      Valor obtenido
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                      Umbral legal
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontSize="2xs"
                      py={1}
                      textAlign="right"
                      color="gray.700"
                    >
                      Veredicto
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sellos.memoria_calculo.map((paso) => (
                    <Table.Row key={paso.codigo}>
                      <Table.Cell
                        fontSize="2xs"
                        py={1}
                        fontWeight="medium"
                        color="gray.800"
                      >
                        {paso.nutriente_etiqueta}
                      </Table.Cell>
                      <Table.Cell fontSize="2xs" py={1} color="gray.700">
                        {!paso.se_evalua ? (
                          "No corresponde evaluar"
                        ) : (
                          <>
                            {paso.formula_aplicada && (
                              <Text fontSize="2xs" color="gray.500">
                                {paso.formula_aplicada}
                              </Text>
                            )}
                            <Text fontSize="2xs" color="gray.700">
                              {paso.calculo_sustituido ||
                                (paso.valor_obtenido != null
                                  ? `${paso.valor_obtenido} ${paso.unidad_obtenida || ""}`
                                  : "—")}
                            </Text>
                          </>
                        )}
                      </Table.Cell>
                      <Table.Cell fontSize="2xs" py={1} color="gray.700">
                        {paso.umbral_normativo}
                      </Table.Cell>
                      <Table.Cell fontSize="2xs" py={1} textAlign="right">
                        {(() => {
                          const veredicto = resolverVeredictoSello(paso);
                          return (
                            <Text
                              as="span"
                              fontSize="2xs"
                              fontWeight={veredicto.printWeight}
                              color={veredicto.printColor}
                            >
                              {veredicto.label}
                            </Text>
                          );
                        })()}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            ) : (
              <Text fontSize="2xs" color="gray.600" fontStyle="italic" mb={2}>
                No se registraron pasos de evaluación de nutrientes críticos para el dictamen actual.
              </Text>
            )}
          </>
        )}

        <Text fontSize="2xs" color="gray.600">
          Parámetros de cálculo: {sellos.version_normativa} (Vigente desde:{" "}
          {formatearFechaISO(sellos.fecha_vigencia_normativa)})
        </Text>
      </Box>
    </Box>
  );
}
