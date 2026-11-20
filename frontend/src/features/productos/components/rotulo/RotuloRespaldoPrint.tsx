import {
  Box,
  Heading,
  SimpleGrid,
  Table,
  Text,
} from "@chakra-ui/react";
import {
  SeccionAplicabilidadPrint,
  SeccionComposicionPrint,
  SeccionNutricionPrint,
  SeccionSellosCalculoPrint,
} from "../../../recetas/components/SeccionesCalculoPrint";
import type { RespaldoCalculoRotulo } from "../../types";
import { DocumentoRotuloBorrador } from "./DocumentoRotuloBorrador";
import { ExpedienteRotuloPrintShell } from "./ExpedienteRotuloPrintShell";

interface RotuloRespaldoPrintProps {
  respaldo: RespaldoCalculoRotulo;
}

function formatearFechaHora(iso?: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearFecha(iso?: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function RotuloRespaldoPrint({ respaldo }: RotuloRespaldoPrintProps) {
  const fechaEmisionStr = formatearFechaHora(respaldo.fecha_emision);
  const detalleDerecha = [
    `Receta: ${respaldo.codigo_receta_empleada || "Sin receta activa"}`,
    respaldo.version_parametros_aplicada,
  ]
    .filter(Boolean)
    .join(" · ");

  const {
    anexo_receta: anexoReceta,
    anexo_composicion: anexoComposicion,
    anexo_nutricion: anexoNutricion,
    anexo_memoria_sellos: anexoSellos,
  } = respaldo;

  return (
    <ExpedienteRotuloPrintShell
      id="rotulo-respaldo-print"
      className="rotulo-respaldo-print"
      tituloDocumento={`Borrador de Rótulo y Respaldo de Cálculo — ${respaldo.producto_nombre}`}
      detalleDerecha={detalleDerecha}
      fechaTexto={`Emitido: ${fechaEmisionStr}`}
      leyendaBorrador={respaldo.leyenda_borrador_obligatoria}
    >
      {/* MAQUETA DEL BORRADOR DEL RÓTULO (Pág. 1: Cara Principal + Sellos | Pág. 2: Cara de Información Reglamentaria) */}
      <DocumentoRotuloBorrador
        vistaPrevia={respaldo.vista_previa}
        modoImpresion
        ocultarFranjaBorradorSuperior
      />

      {!respaldo.tiene_receta_activa ? (
        <Box
          mt={4}
          p={4}
          bg="orange.50"
          borderWidth="1px"
          borderColor="orange.200"
          borderRadius="md"
          style={{ breakBefore: "page", pageBreakBefore: "always" }}
        >
          <Heading size="sm" color="orange.900" mb={1}>
            Anexos Técnicos de Respaldo No Disponibles
          </Heading>
          <Text fontSize="xs" color="orange.800">
            El producto no posee una receta en estado ACTIVA al momento de emitir este borrador,
            por lo que no fue posible generar los Anexos I a IV (desglose de receta, composición
            porcentual, tabla nutricional detallada y memoria de cálculo de sellos).
          </Text>
        </Box>
      ) : (
        <>
          {/* ANEXO I: DESGLOSE DE LA RECETA ACTIVA */}
          {anexoReceta && (
            <Box
              mb={4}
              style={{ breakBefore: "page", pageBreakBefore: "always" }}
            >
              <Heading
                size="sm"
                color="green.700"
                borderBottomWidth="1px"
                borderColor="gray.300"
                pb={1}
                mb={2}
              >
                Anexo I — Desglose de la Receta Activa ({anexoReceta.codigo_receta})
              </Heading>

              <SimpleGrid
                columns={4}
                gap={3}
                p={3}
                bg="gray.50"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                mb={3}
              >
                <Box>
                  <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                    Receta / Código
                  </Text>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.800">
                    {anexoReceta.nombre_receta} ({anexoReceta.codigo_receta})
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                    Estado / Creación
                  </Text>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.800">
                    {anexoReceta.estado_receta} · {formatearFecha(anexoReceta.fecha_creacion)}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                    Rendimiento estándar
                  </Text>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.800">
                    {anexoReceta.rendimiento_estandar.toLocaleString("es-AR")}{" "}
                    {anexoReceta.unidad_rendimiento}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="2xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                    Tamaño de porción
                  </Text>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.800">
                    {anexoReceta.tamano_porcion != null
                      ? `${anexoReceta.tamano_porcion.toLocaleString("es-AR")} ${anexoReceta.unidad_rendimiento}`
                      : "No declarado"}
                  </Text>
                </Box>
              </SimpleGrid>

              <Text
                fontSize="2xs"
                fontWeight="bold"
                textTransform="uppercase"
                color="gray.600"
                mb={1}
              >
                Ingredientes ({anexoReceta.ingredientes.length})
              </Text>
              <Table.Root
                size="sm"
                variant="outline"
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                mb={3}
              >
                <Table.Header bg="gray.100">
                  <Table.Row>
                    <Table.ColumnHeader fontSize="2xs" color="gray.700">
                      Insumo
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontSize="2xs" color="gray.700">
                      Denominación en rótulo
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontSize="2xs" color="gray.700">
                      Categoría
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                      Cant. Nominal
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {anexoReceta.ingredientes.map((item) => (
                    <Table.Row key={item.insumo_id}>
                      <Table.Cell fontSize="xs" py={1.5} fontWeight="medium">
                        {item.nombre}
                      </Table.Cell>
                      <Table.Cell fontSize="xs" py={1.5}>
                        {item.denominacion_rotulo || item.nombre}
                      </Table.Cell>
                      <Table.Cell fontSize="xs" py={1.5} textTransform="capitalize">
                        {item.categoria}
                      </Table.Cell>
                      <Table.Cell fontSize="xs" py={1.5} textAlign="right">
                        {item.cantidad_nominal.toLocaleString("es-AR")} {item.unidad_simbolo}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>

              <Text
                fontSize="2xs"
                fontWeight="bold"
                textTransform="uppercase"
                color="gray.600"
                mb={1}
              >
                Aditivos Alimentarios ({anexoReceta.aditivos.length})
              </Text>
              {anexoReceta.aditivos.length > 0 ? (
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
                        Aditivo
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontSize="2xs" color="gray.700">
                        Clase funcional
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontSize="2xs" color="gray.700">
                        N.° INS
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontSize="2xs" color="gray.700" textAlign="right">
                        Cant. Nominal
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {anexoReceta.aditivos.map((ad) => (
                      <Table.Row key={ad.insumo_id}>
                        <Table.Cell fontSize="xs" py={1.5} fontWeight="medium">
                          {ad.denominacion_rotulo || ad.nombre}
                        </Table.Cell>
                        <Table.Cell fontSize="xs" py={1.5}>
                          {ad.clase_funcional || "Sin declarar"}
                        </Table.Cell>
                        <Table.Cell fontSize="xs" py={1.5}>
                          {ad.numero_ins ? `INS ${ad.numero_ins}` : "—"}
                        </Table.Cell>
                        <Table.Cell fontSize="xs" py={1.5} textAlign="right">
                          {ad.cantidad_nominal.toLocaleString("es-AR")} {ad.unidad_simbolo}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              ) : (
                <Text fontSize="xs" color="gray.500" fontStyle="italic">
                  La receta activa no declara aditivos alimentarios.
                </Text>
              )}
            </Box>
          )}

          {/* ANEXO II: COMPOSICIÓN PORCENTUAL */}
          {anexoComposicion && (
            <Box style={{ breakBefore: "page", pageBreakBefore: "always" }}>
              <SeccionComposicionPrint
                composicion={anexoComposicion}
                titulo="Anexo II — Composición Porcentual de la Formulación (Orden CAA)"
                esOrdenManual={respaldo.es_orden_ingredientes_manual}
              />
            </Box>
          )}

          {/* ANEXO III: INFORMACIÓN NUTRICIONAL DETALLADA + FUENTES */}
          {anexoNutricion && (
            <Box style={{ breakBefore: "page", pageBreakBefore: "always" }}>
              <SeccionNutricionPrint
                infoNutricional={anexoNutricion.informacion_nutricional}
                titulo="Anexo III — Información Nutricional Detallada (CAA Cap. V / Mercosur)"
                baseEtiqueta={respaldo.vista_previa.nutricion.base_etiqueta}
              />

              <Box mb={4} css={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                <Heading
                  size="sm"
                  color="green.700"
                  borderBottomWidth="1px"
                  borderColor="gray.300"
                  pb={1}
                  mb={2}
                >
                  Fuentes de Datos Nutricionales por Insumo
                </Heading>
                <Box
                  p={3}
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.300"
                  borderRadius="md"
                >
                  <Table.Root size="sm" variant="line">
                    <Table.Header bg="gray.100">
                      <Table.Row>
                        <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                          Insumo
                        </Table.ColumnHeader>
                        <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                          Fuente declarada
                        </Table.ColumnHeader>
                        <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                          Estado
                        </Table.ColumnHeader>
                        <Table.ColumnHeader fontSize="2xs" py={1} color="gray.700">
                          Observaciones / Faltantes
                        </Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {anexoNutricion.fuentes_datos_insumos.map((f) => (
                        <Table.Row key={f.insumo_id}>
                          <Table.Cell fontSize="2xs" py={1} fontWeight="medium" color="gray.800">
                            {f.nombre}
                          </Table.Cell>
                          <Table.Cell fontSize="2xs" py={1} color="gray.700">
                            {f.fuente_nutricional || "Sin fuente declarada"}
                          </Table.Cell>
                          <Table.Cell
                            fontSize="2xs"
                            py={1}
                            fontWeight="semibold"
                            color={f.nutricion_completa ? "green.700" : "red.700"}
                          >
                            {f.nutricion_completa ? "Completo" : "Pendiente"}
                          </Table.Cell>
                          <Table.Cell fontSize="2xs" py={1} color="gray.700">
                            {!f.nutricion_completa && f.campos_faltantes.length > 0
                              ? `Faltan: ${f.campos_faltantes.join(", ")}`
                              : f.es_nutricion_modificada
                                ? `Editado manualmente (${formatearFecha(f.fecha_modificacion_nutricional)})`
                                : f.fecha_carga_nutricional
                                  ? `Cargado el ${formatearFecha(f.fecha_carga_nutricional)}`
                                  : "—"}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Box>
            </Box>
          )}

          {/* ANEXO IV: APLICABILIDAD Y MEMORIA DE CÁLCULO DE SELLOS (sin repetir PNGs) */}
          {anexoSellos && (
            <Box style={{ breakBefore: "page", pageBreakBefore: "always" }}>
              <SeccionAplicabilidadPrint
                aplicabilidad={anexoSellos.aplicabilidad}
                titulo="Anexo IV (A) — Evaluación de Aplicabilidad (Ley 27.642)"
              />
              <SeccionSellosCalculoPrint
                sellos={anexoSellos.sellos}
                titulo="Anexo IV (B) — Memoria de Cálculo de Nutrientes Críticos y Sellos"
                mostrarGraficosSellos={false}
                mostrarCuandoNoAplica
              />
            </Box>
          )}
        </>
      )}
    </ExpedienteRotuloPrintShell>
  );
}
