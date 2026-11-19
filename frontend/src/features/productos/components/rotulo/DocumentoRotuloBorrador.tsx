import {
  Badge,
  Box,
  Flex,
  Heading,
  HStack,
  Separator,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiAlertTriangle, FiInfo } from "react-icons/fi";
import {
  LeyendaRectangular,
  OctogonoReglamentario,
} from "../../../recetas/components/SellosGraficos";
import type { VistaPreviaRotulo } from "../../types";

interface DocumentoRotuloBorradorProps {
  vistaPrevia: VistaPreviaRotulo;
  modoImpresion?: boolean;
}

function ValorODatoFaltante({
  valor,
  faltante = "Dato obligatorio pendiente",
}: {
  valor?: string | null;
  faltante?: string;
}) {
  if (valor && valor.trim().length > 0) {
    return <>{valor}</>;
  }
  return (
    <Text as='span' color='red.600' fontStyle='italic' fontWeight='medium'>
      [{faltante}]
    </Text>
  );
}

function formatearTemperatura(
  min?: number | null,
  max?: number | null,
): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `Entre ${min} °C y ${max} °C`;
  if (min != null) return `Mínimo ${min} °C`;
  return `Máximo ${max} °C`;
}

export function DocumentoRotuloBorrador({
  vistaPrevia,
  modoImpresion = false,
}: DocumentoRotuloBorradorProps) {
  const {
    cara_principal: caraPrincipal,
    nutricion,
    origen,
    conservacion_lote: cons,
    completitud_caa: completitud,
    advertencias,
  } = vistaPrevia;

  const tieneAdvertencias =
    advertencias.length > 0 ||
    !completitud.esta_completo ||
    vistaPrevia.tabla_nutricional_incompleta;

  const rangoTemp = formatearTemperatura(
    cons.temp_conservacion_min_c,
    cons.temp_conservacion_max_c,
  );

  const panelCaraPrincipal = (
    <Box
      bg='white'
      borderWidth='2px'
      borderColor='gray.800'
      borderRadius='md'
      p={modoImpresion ? 5 : 5}
      boxShadow={modoImpresion ? "none" : "sm"}
      breakInside='avoid'
      style={
        modoImpresion
          ? { breakBefore: "page", pageBreakBefore: "always" }
          : undefined
      }
    >
      <HStack justify='space-between' mb={3}>
        <Text
          fontSize='xs'
          fontWeight='bold'
          textTransform='uppercase'
          letterSpacing='0.08em'
          color='gray.500'
        >
          Cara Principal (Frente del envase)
        </Text>
        {caraPrincipal.dictamen_aplicabilidad && (
          <Badge
            colorPalette={
              caraPrincipal.dictamen_aplicabilidad === "APLICA"
                ? "blue"
                : "gray"
            }
            variant='subtle'
            size='sm'
          >
            Ley 27.642: {caraPrincipal.dictamen_aplicabilidad}
          </Badge>
        )}
      </HStack>

      {/* Octógonos y Leyendas Precautorias (E12) */}
      <Box
        minH='120px'
        borderWidth='1px'
        borderStyle='dashed'
        borderColor='gray.300'
        borderRadius='md'
        p={4}
        mb={5}
        bg='gray.50'
        style={{
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {caraPrincipal.sellos_advertencia.length > 0 ||
        caraPrincipal.leyendas_precautorias.length > 0 ? (
          <VStack gap={4} align='center'>
            {caraPrincipal.sellos_advertencia.length > 0 && (
              <Flex wrap='wrap' gap={3} justify='center' align='center'>
                {caraPrincipal.sellos_advertencia.map((s) => (
                  <OctogonoReglamentario
                    key={s.codigo}
                    codigo={s.codigo}
                    texto={s.texto}
                  />
                ))}
              </Flex>
            )}
            {caraPrincipal.leyendas_precautorias.length > 0 && (
              <Flex wrap='wrap' gap={3} justify='center' align='center'>
                {caraPrincipal.leyendas_precautorias.map((l) => (
                  <LeyendaRectangular
                    key={l.codigo}
                    codigo={l.codigo}
                    texto={l.texto}
                  />
                ))}
              </Flex>
            )}
          </VStack>
        ) : (
          <HStack gap={2.5} align='start' color='gray.700'>
            <Box mt='3px' flexShrink={0}>
              <FiInfo size={18} />
            </Box>
            <VStack align='start' gap={0.5}>
              <Text fontSize='sm' fontWeight='semibold'>
                Sin sellos de advertencia frontal
              </Text>
              <Text fontSize='sm' color='gray.600'>
                {caraPrincipal.aviso_sin_sellos ||
                  "No corresponden sellos ni leyendas precautorias."}
              </Text>
            </VStack>
          </HStack>
        )}
      </Box>

      {/* Denominación de venta y Contenido neto */}
      <VStack align='center' textAlign='center' gap={3} py={3}>
        <Heading size={modoImpresion ? "lg" : "xl"} color='gray.900'>
          <ValorODatoFaltante
            valor={caraPrincipal.denominacion_venta}
            faltante='Denominación de venta pendiente'
          />
        </Heading>

        <Separator w='60%' borderColor='gray.300' />

        <HStack gap={5} justify='center' flexWrap='wrap' pt={1}>
          <Text fontSize='md' fontWeight='bold' color='gray.800'>
            CONT. NETO:{" "}
            <ValorODatoFaltante
              valor={caraPrincipal.contenido_neto}
              faltante='Pendiente'
            />
          </Text>
          {caraPrincipal.aplica_peso_escurrido && (
            <Text fontSize='md' fontWeight='semibold' color='gray.700'>
              PESO ESCURRIDO:{" "}
              <ValorODatoFaltante
                valor={caraPrincipal.peso_escurrido}
                faltante='Pendiente'
              />
            </Text>
          )}
        </HStack>
      </VStack>
    </Box>
  );

  const panelInformacionReglamentaria = (
    <Box
      bg='white'
      borderWidth='2px'
      borderColor='gray.800'
      borderRadius='md'
      p={modoImpresion ? 4 : 5}
      boxShadow={modoImpresion ? "none" : "sm"}
    >
      <Text
        fontSize='xs'
        fontWeight='bold'
        textTransform='uppercase'
        letterSpacing='0.08em'
        color='gray.500'
        mb={3}
      >
        Cara de Información Reglamentaria (CAA Cap. V)
      </Text>

      <VStack align='stretch' gap={modoImpresion ? 3 : 4}>
        {/* 1. Lista de Ingredientes + Alérgenos */}
        <Box>
          <Text
            fontSize={modoImpresion ? "xs" : "sm"}
            color='gray.900'
            lineHeight={modoImpresion ? "1.45" : "1.6"}
          >
            <Text as='span' fontWeight='bold'>
              INGREDIENTES:{" "}
            </Text>
            <ValorODatoFaltante
              valor={vistaPrevia.lista_ingredientes_texto}
              faltante='Lista de ingredientes no declarada'
            />
          </Text>

          {vistaPrevia.leyenda_alergenos_declarada && (
            <Text
              mt={modoImpresion ? 1 : 2}
              fontSize={modoImpresion ? "xs" : "sm"}
              fontWeight='extrabold'
              textTransform='uppercase'
              color='gray.900'
            >
              {vistaPrevia.leyenda_alergenos_declarada}
            </Text>
          )}
        </Box>

        <Separator borderColor='gray.300' />

        {/* 2. Tabla de Información Nutricional (E11) */}
        <Box breakInside='avoid'>
          <Text
            fontSize={modoImpresion ? "xs" : "sm"}
            fontWeight='bold'
            color='gray.900'
            mb={1}
          >
            INFORMACIÓN NUTRICIONAL
          </Text>
          <Text
            fontSize={modoImpresion ? "xs" : "sm"}
            color='gray.700'
            mb={modoImpresion ? 1.5 : 2}
          >
            Porción:{" "}
            <ValorODatoFaltante
              valor={nutricion.tamano_porcion}
              faltante='Porción no declarada'
            />
          </Text>

          {nutricion.filas.length > 0 ? (
            <>
              <Table.Root size='sm' variant='outline'>
                <Table.Header>
                  <Table.Row bg='gray.100'>
                    <Table.ColumnHeader
                      fontSize={modoImpresion ? "2xs" : "xs"}
                      py={modoImpresion ? 1 : 1.5}
                    >
                      Nutriente
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontSize={modoImpresion ? "2xs" : "xs"}
                      py={modoImpresion ? 1 : 1.5}
                      textAlign='right'
                    >
                      Cada {nutricion.base_etiqueta}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontSize={modoImpresion ? "2xs" : "xs"}
                      py={modoImpresion ? 1 : 1.5}
                      textAlign='right'
                    >
                      Por porción
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontSize={modoImpresion ? "2xs" : "xs"}
                      py={modoImpresion ? 1 : 1.5}
                      textAlign='right'
                    >
                      % VD (*)
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {nutricion.filas.map((fila) => (
                    <Table.Row key={fila.codigo_nutriente}>
                      <Table.Cell
                        fontSize={modoImpresion ? "2xs" : "xs"}
                        py={modoImpresion ? 0.5 : 1.5}
                        pl={fila.nivel_indentacion > 0 ? 5 : 2}
                        fontWeight={
                          fila.nivel_indentacion === 0 ? "medium" : "normal"
                        }
                      >
                        {fila.nombre_etiqueta} ({fila.unidad})
                      </Table.Cell>
                      <Table.Cell
                        fontSize={modoImpresion ? "2xs" : "xs"}
                        py={modoImpresion ? 0.5 : 1.5}
                        textAlign='right'
                      >
                        {fila.valor_100g ?? "—"}
                      </Table.Cell>
                      <Table.Cell
                        fontSize={modoImpresion ? "2xs" : "xs"}
                        py={modoImpresion ? 0.5 : 1.5}
                        textAlign='right'
                      >
                        {fila.valor_porcion ?? "—"}
                      </Table.Cell>
                      <Table.Cell
                        fontSize={modoImpresion ? "2xs" : "xs"}
                        py={modoImpresion ? 0.5 : 1.5}
                        textAlign='right'
                      >
                        {fila.porcentaje_vd ?? "—"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
              {nutricion.leyenda_vd && (
                <Text
                  fontSize={modoImpresion ? "2xs" : "xs"}
                  color='gray.600'
                  mt={1.5}
                >
                  {nutricion.leyenda_vd}
                </Text>
              )}
            </>
          ) : (
            <Box
              bg='red.50'
              borderWidth='1px'
              borderColor='red.300'
              borderRadius='sm'
              p={modoImpresion ? 2.5 : 3}
            >
              <Text
                fontSize={modoImpresion ? "xs" : "sm"}
                color='red.800'
                fontWeight='medium'
              >
                Tabla nutricional incompleta:{" "}
                {nutricion.motivo_incompleta ||
                  "No hay datos nutricionales calculados."}
              </Text>
            </Box>
          )}
        </Box>

        <Separator borderColor='gray.300' />

        {/* 3. Origen / Elaborador / Importador */}
        <Box
          fontSize={modoImpresion ? "xs" : "sm"}
          color='gray.800'
          lineHeight={modoImpresion ? "1.45" : "1.6"}
          breakInside='avoid'
        >
          <Text fontWeight='bold' color='gray.900' mb={1}>
            IDENTIFICACIÓN DEL ORIGEN
          </Text>
          <Text>
            <Text as='span' fontWeight='semibold'>
              Elaborado por:{" "}
            </Text>
            <ValorODatoFaltante valor={origen.razon_social_elaborador} />
          </Text>
          <Text>
            <Text as='span' fontWeight='semibold'>
              Domicilio:{" "}
            </Text>
            <ValorODatoFaltante valor={origen.domicilio_elaborador} />
          </Text>
          <HStack gap={4} flexWrap='wrap'>
            <Text>
              <Text as='span' fontWeight='semibold'>
                Industria / Origen:{" "}
              </Text>
              <ValorODatoFaltante valor={origen.pais_origen} />
            </Text>
            <Text>
              <Text as='span' fontWeight='semibold'>
                RNE:{" "}
              </Text>
              <ValorODatoFaltante valor={origen.rne_elaborador} />
            </Text>
            <Text>
              <Text as='span' fontWeight='semibold'>
                RNPA / RPPA:{" "}
              </Text>
              <ValorODatoFaltante valor={origen.rnpa_rppa} />
            </Text>
          </HStack>

          {origen.es_importado && (
            <Box mt={1.5} pl={2.5} borderLeftWidth='2px' borderColor='gray.400'>
              <Text>
                <Text as='span' fontWeight='semibold'>
                  Importado por:{" "}
                </Text>
                <ValorODatoFaltante valor={origen.nombre_importador} />
              </Text>
              <Text>
                <Text as='span' fontWeight='semibold'>
                  Domicilio importador:{" "}
                </Text>
                <ValorODatoFaltante valor={origen.domicilio_importador} />
              </Text>
              <Text>
                <Text as='span' fontWeight='semibold'>
                  RNE importador:{" "}
                </Text>
                <ValorODatoFaltante valor={origen.rne_importador} />
              </Text>
            </Box>
          )}
        </Box>

        <Separator borderColor='gray.300' />

        {/* 4. Lote, Vencimiento, Conservación e Instrucciones */}
        <Box
          fontSize={modoImpresion ? "xs" : "sm"}
          color='gray.800'
          lineHeight={modoImpresion ? "1.45" : "1.6"}
          breakInside='avoid'
        >
          <Text fontWeight='bold' color='gray.900' mb={1}>
            TRAZABILIDAD, DURACIÓN Y CONSERVACIÓN
          </Text>
          <HStack gap={4} flexWrap='wrap'>
            <Text>
              <Text as='span' fontWeight='semibold'>
                Lote:{" "}
              </Text>
              <ValorODatoFaltante valor={cons.codigo_lote} />
            </Text>
            <Text>
              <Text as='span' fontWeight='semibold'>
                Consumir preferentemente antes del / Venc.:{" "}
              </Text>
              <ValorODatoFaltante valor={cons.fecha_duracion_minima} />
            </Text>
          </HStack>

          {rangoTemp && (
            <Text>
              <Text as='span' fontWeight='semibold'>
                Temperatura de conservación:{" "}
              </Text>
              {rangoTemp}
            </Text>
          )}
          {cons.durabilidad_antes_abrir && (
            <Text>
              <Text as='span' fontWeight='semibold'>
                Durabilidad envase cerrado:{" "}
              </Text>
              {cons.durabilidad_antes_abrir}
            </Text>
          )}
          {cons.durabilidad_despues_abrir && (
            <Text>
              <Text as='span' fontWeight='semibold'>
                Una vez abierto:{" "}
              </Text>
              {cons.durabilidad_despues_abrir}
            </Text>
          )}
          <Text>
            <Text as='span' fontWeight='semibold'>
              Modo de conservación:{" "}
            </Text>
            <ValorODatoFaltante valor={cons.condiciones_conservacion} />
          </Text>
          {cons.aplica_instrucciones_uso && (
            <Text mt={1}>
              <Text as='span' fontWeight='semibold'>
                Modo de preparación / uso:{" "}
              </Text>
              <ValorODatoFaltante valor={cons.instrucciones_uso} />
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  );

  return (
    <VStack align='stretch' gap={modoImpresion ? 3 : 5} w='100%'>
      {/* Franja superior INMUTABLE de BORRADOR */}
      <Box
        bg='orange.100'
        borderRadius='md'
        px={4}
        py={3}
        style={{
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <HStack gap={2.5} align='center' justify='center' textAlign='center'>
          <FiInfo size={18} color='#9c4221' />
          <Text
            fontSize={modoImpresion ? "xs" : "sm"}
            fontWeight='bold'
            color='orange.700'
            letterSpacing='0.02em'
          >
            {vistaPrevia.leyenda_borrador_obligatoria}
          </Text>
        </HStack>
      </Box>

      {/* Banner destacado de completitud / advertencias (Criterio 4) */}
      {tieneAdvertencias && (
        <Box
          bg='red.50'
          borderWidth='1px'
          borderColor='red.400'
          borderLeftWidth='5px'
          borderLeftColor='red.600'
          borderRadius='md'
          p={4}
          style={{
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        >
          <HStack
            justify='space-between'
            align='center'
            mb={2}
            flexWrap='wrap'
            gap={2}
          >
            <HStack gap={2} color='red.800'>
              <FiAlertTriangle size={18} />
              <Text fontWeight='bold' fontSize='sm'>
                Rótulo borrador incompleto o pendiente de validación
              </Text>
            </HStack>
            <Badge colorPalette='red' variant='solid' size='sm'>
              Completitud CAA: {completitud.porcentaje}% (
              {completitud.total_completados}/{completitud.total_obligatorios})
            </Badge>
          </HStack>
          <VStack align='start' gap={1} pl={1}>
            {advertencias.map((adv, idx) => (
              <Text key={idx} fontSize='xs' color='red.900'>
                • {adv}
              </Text>
            ))}
          </VStack>
        </Box>
      )}

      {/* En pantalla: Cara Principal (con sellos) encima de la Cara de Información Reglamentaria.
          En PDF: Cara de Información Reglamentaria en la 1ª página y Cara Principal en la 2ª página. */}
      {modoImpresion ? (
        <>
          {panelInformacionReglamentaria}
          {panelCaraPrincipal}
        </>
      ) : (
        <>
          {panelCaraPrincipal}
          {panelInformacionReglamentaria}
        </>
      )}
    </VStack>
  );
}
