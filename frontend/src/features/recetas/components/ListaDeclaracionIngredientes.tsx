import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Icon,
  IconButton,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiAlertCircle,
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiCopy,
  FiFileText,
  FiInfo,
  FiRefreshCw,
  FiSliders,
} from "react-icons/fi";
import type { DeclaracionIngredientesResponse, ItemDeclaracionIngrediente } from "../types";
import { recetasApi } from "../hooks/recetaApi";

interface ListaDeclaracionIngredientesProps {
  recetaId: number;
  declaracion: DeclaracionIngredientesResponse;
  onDeclaracionChange: (nueva: DeclaracionIngredientesResponse) => void;
}

interface BloqueAditivo {
  clase_funcional: string;
  items: ItemDeclaracionIngrediente[];
}

export const ListaDeclaracionIngredientes = ({
  recetaId,
  declaracion,
  onDeclaracionChange,
}: ListaDeclaracionIngredientesProps) => {
  const [copiado, setCopiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");
  const [mostrarCriterios, setMostrarCriterios] = useState(false);

  const { items, es_orden_manual, texto_legal_rotulo } = declaracion;

  // 1. Separación estricta de materias primas y aditivos
  const materiasPrimas = useMemo(
    () => items.filter((it) => it.categoria !== "aditivo"),
    [items],
  );

  const aditivos = useMemo(
    () => items.filter((it) => it.categoria === "aditivo"),
    [items],
  );

  // 2. Agrupamiento de aditivos en bloques contiguos por clase funcional
  const bloquesAditivos = useMemo<BloqueAditivo[]>(() => {
    const bloques: BloqueAditivo[] = [];
    aditivos.forEach((it) => {
      const clase = it.clase_funcional?.trim() || "Sin clase funcional";
      const ultimo = bloques[bloques.length - 1];
      if (ultimo && ultimo.clase_funcional.toLowerCase() === clase.toLowerCase()) {
        ultimo.items.push(it);
      } else {
        bloques.push({
          clase_funcional: clase,
          items: [it],
        });
      }
    });
    return bloques;
  }, [aditivos]);

  const copiarTexto = async () => {
    if (!texto_legal_rotulo) return;
    try {
      await navigator.clipboard.writeText(texto_legal_rotulo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback
    }
  };

  const guardarNuevoOrden = async (idsOrdenados: number[]) => {
    setGuardando(true);
    setErrorAccion("");
    try {
      const res = await recetasApi.guardarOrdenManualDeclaracion(recetaId, idsOrdenados);
      onDeclaracionChange(res);
    } catch (e: any) {
      setErrorAccion(e?.message || "No se pudo actualizar el orden manual.");
    } finally {
      setGuardando(false);
    }
  };

  // --- REGLAS DE MOVIMIENTO PARA MATERIAS PRIMAS ---
  const puedeSubirMP = (idx: number): { posible: boolean; motivo: string } => {
    if (idx === 0) {
      return { posible: false, motivo: "Primer elemento de materias primas." };
    }
    const actual = materiasPrimas[idx];
    const anterior = materiasPrimas[idx - 1];
    const mismoPct =
      actual.porcentaje_mezcla != null && anterior.porcentaje_mezcla != null
        ? Math.abs(actual.porcentaje_mezcla - anterior.porcentaje_mezcla) < 0.001
        : actual.masa_equivalente_g === anterior.masa_equivalente_g;

    if (!mismoPct) {
      return {
        posible: false,
        motivo: "Solo se permite reordenar materias primas con idéntica proporción",
      };
    }
    return {
      posible: true,
      motivo: "Intercambiar posición con la materia prima anterior (mismo %)",
    };
  };

  const puedeBajarMP = (idx: number): { posible: boolean; motivo: string } => {
    if (idx === materiasPrimas.length - 1) {
      return {
        posible: false,
        motivo:
          "Límite de zona: una materia prima no puede pasar a la zona de aditivos (Frontera CAA)",
      };
    }
    const actual = materiasPrimas[idx];
    const siguiente = materiasPrimas[idx + 1];
    const mismoPct =
      actual.porcentaje_mezcla != null && siguiente.porcentaje_mezcla != null
        ? Math.abs(actual.porcentaje_mezcla - siguiente.porcentaje_mezcla) < 0.001
        : actual.masa_equivalente_g === siguiente.masa_equivalente_g;

    if (!mismoPct) {
      return {
        posible: false,
        motivo: "Solo se permite reordenar materias primas con idéntica proporción",
      };
    }
    return {
      posible: true,
      motivo: "Intercambiar posición con la siguiente materia prima (mismo %)",
    };
  };

  const moverMateriaPrima = async (indexActual: number, direccion: "up" | "down") => {
    const nuevoIndex = direccion === "up" ? indexActual - 1 : indexActual + 1;
    if (nuevoIndex < 0 || nuevoIndex >= materiasPrimas.length) return;

    const copiaMP = [...materiasPrimas];
    const [movido] = copiaMP.splice(indexActual, 1);
    copiaMP.splice(nuevoIndex, 0, movido);

    const idsOrdenados = [
      ...copiaMP.map((it) => it.insumo_id),
      ...aditivos.map((it) => it.insumo_id),
    ];

    await guardarNuevoOrden(idsOrdenados);
  };

  // --- REGLAS DE MOVIMIENTO PARA ADITIVOS ---
  const moverAditivo = async (
    bloqueIdx: number,
    itemInBlockIdx: number,
    direccion: "up" | "down",
  ) => {
    const bloque = bloquesAditivos[bloqueIdx];
    const esPrimeroDelBloque = itemInBlockIdx === 0;
    const esUltimoDelBloque = itemInBlockIdx === bloque.items.length - 1;

    if (direccion === "up") {
      if (!esPrimeroDelBloque) {
        // Mover dentro del mismo bloque
        const copiaBloques = bloquesAditivos.map((b) => ({ ...b, items: [...b.items] }));
        const b = copiaBloques[bloqueIdx];
        const [movido] = b.items.splice(itemInBlockIdx, 1);
        b.items.splice(itemInBlockIdx - 1, 0, movido);
        const nuevosAditivosIds = copiaBloques.flatMap((b) => b.items.map((it) => it.insumo_id));
        await guardarNuevoOrden([
          ...materiasPrimas.map((it) => it.insumo_id),
          ...nuevosAditivosIds,
        ]);
      } else if (bloqueIdx > 0) {
        // Mover bloque completo hacia arriba
        const copiaBloques = [...bloquesAditivos];
        const [bloqueMovido] = copiaBloques.splice(bloqueIdx, 1);
        copiaBloques.splice(bloqueIdx - 1, 0, bloqueMovido);
        const nuevosAditivosIds = copiaBloques.flatMap((b) => b.items.map((it) => it.insumo_id));
        await guardarNuevoOrden([
          ...materiasPrimas.map((it) => it.insumo_id),
          ...nuevosAditivosIds,
        ]);
      }
    } else {
      if (!esUltimoDelBloque) {
        // Mover dentro del mismo bloque
        const copiaBloques = bloquesAditivos.map((b) => ({ ...b, items: [...b.items] }));
        const b = copiaBloques[bloqueIdx];
        const [movido] = b.items.splice(itemInBlockIdx, 1);
        b.items.splice(itemInBlockIdx + 1, 0, movido);
        const nuevosAditivosIds = copiaBloques.flatMap((b) => b.items.map((it) => it.insumo_id));
        await guardarNuevoOrden([
          ...materiasPrimas.map((it) => it.insumo_id),
          ...nuevosAditivosIds,
        ]);
      } else if (bloqueIdx < bloquesAditivos.length - 1) {
        // Mover bloque completo hacia abajo
        const copiaBloques = [...bloquesAditivos];
        const [bloqueMovido] = copiaBloques.splice(bloqueIdx, 1);
        copiaBloques.splice(bloqueIdx + 1, 0, bloqueMovido);
        const nuevosAditivosIds = copiaBloques.flatMap((b) => b.items.map((it) => it.insumo_id));
        await guardarNuevoOrden([
          ...materiasPrimas.map((it) => it.insumo_id),
          ...nuevosAditivosIds,
        ]);
      }
    }
  };

  const restablecerOrdenAutomatico = async () => {
    setGuardando(true);
    setErrorAccion("");
    try {
      const res = await recetasApi.restablecerOrdenAutomaticoDeclaracion(recetaId);
      onDeclaracionChange(res);
    } catch (e: any) {
      setErrorAccion(e?.message || "No se pudo restablecer el orden automático.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card.Root variant="outline" bg="white" shadow="xs" w="full">
      <Card.Header pb={3}>
        <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack gap={2} align="center" flexWrap="wrap">
            <Icon as={FiFileText} color="green.700" />
            <Heading size="md" color="gray.800">
              Declaración de Ingredientes y Aditivos (Rótulo CAA Cap. V)
            </Heading>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="gray"
              onClick={() => setMostrarCriterios((prev) => !prev)}
              title="Criterios de ordenamiento CAA Cap. V:
• Zona de materias primas: orden decreciente (solo se reordenan con idéntico %).
• Zona de aditivos: agrupados por clase funcional (reordenamiento por bloque).
• Frontera: los aditivos nunca preceden a las materias primas."
            >
              <Icon as={FiInfo} />
              <Text as="span" fontSize="2xs">
                {mostrarCriterios ? "Ocultar criterios CAA" : "Ver criterios de ordenamiento CAA"}
              </Text>
            </Button>
          </HStack>

          <HStack gap={2} flexWrap="wrap">
            {es_orden_manual ? (
              <Badge colorPalette="orange" variant="subtle" size="md">
                <Icon as={FiSliders} mr={1} /> Orden Manual
              </Badge>
            ) : (
              <Badge colorPalette="teal" variant="subtle" size="md">
                Orden Automático (por %)
              </Badge>
            )}

            {es_orden_manual && (
              <Button
                size="xs"
                variant="outline"
                colorPalette="orange"
                onClick={restablecerOrdenAutomatico}
                loading={guardando}
              >
                <FiRefreshCw /> Restablecer Orden por %
              </Button>
            )}
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body pt={0} gap={4}>
        {errorAccion && (
          <Box
            p={3}
            bg="red.50"
            borderWidth="1px"
            borderColor="red.300"
            borderRadius="md"
            color="red.800"
            fontSize="xs"
          >
            <HStack align="center" gap={2}>
              <Icon as={FiAlertCircle} color="red.600" />
              <Text fontWeight="medium">{errorAccion}</Text>
            </HStack>
          </Box>
        )}

        {/* Criterios normativos CAA (desplegable) */}
        {mostrarCriterios && (
          <Box
            p={3}
            bg="blue.50"
            borderWidth="1px"
            borderColor="blue.200"
            borderRadius="md"
            fontSize="xs"
            color="blue.950"
          >
            <Text fontWeight="bold" mb={1} color="blue.900">
              Criterios de ordenamiento normativo (CAA Cap. V):
            </Text>
            <VStack align="start" gap={0.5} pl={2}>
              <Text>
                • <strong>Zona de Materias Primas:</strong> Orden decreciente por proporción. Solo se permite reordenar materias primas con <em>idéntico porcentaje</em>.
              </Text>
              <Text>
                • <strong>Zona de Aditivos:</strong> Agrupados obligatoriamente por <em>clase funcional</em>. El reordenamiento opera manteniendo los bloques funcionales contiguos.
              </Text>
              <Text>
                • <strong>Frontera Infranqueable:</strong> Un aditivo nunca puede preceder a una materia prima, ni una materia prima ingresar a la zona de aditivos.
              </Text>
            </VStack>
          </Box>
        )}

        {/* Tabla con cabecera y secciones, idéntica en estructura a Composición Porcentual */}
        <Table.Root size="md" variant="outline" borderWidth="1px" borderColor="gray.200" w="full">
          <Table.Header bg="gray.100">
            <Table.Row>
              <Table.ColumnHeader w="50px" textAlign="center" fontSize="sm" fontWeight="bold" color="gray.800" py={3}>
                #
              </Table.ColumnHeader>
              <Table.ColumnHeader fontSize="sm" fontWeight="bold" color="gray.800" py={3}>
                Ingrediente (Denominación Rótulo)
              </Table.ColumnHeader>
              <Table.ColumnHeader fontSize="sm" fontWeight="bold" color="gray.800" py={3}>
                Clase Funcional / INS
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right" fontSize="sm" fontWeight="bold" color="gray.800" py={3} w="130px">
                % en Mezcla
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center" fontSize="sm" fontWeight="bold" color="gray.800" py={3} w="120px">
                Reordenar
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {/* Cabecera Sección 1: Materias Primas */}
            <Table.Row bg="gray.50">
              <Table.Cell colSpan={5} py={2} px={3}>
                <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.700">
                    Ingredientes (Materias Primas)
                  </Text>
                  <Text fontSize="2xs" color="gray.500">
                    Orden decreciente por proporción (reordenamiento solo ante igual %)
                  </Text>
                </HStack>
              </Table.Cell>
            </Table.Row>

            {materiasPrimas.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} textAlign="center" color="gray.500" py={4} fontSize="sm">
                  No hay materias primas registradas en la formulación.
                </Table.Cell>
              </Table.Row>
            ) : (
              materiasPrimas.map((item: ItemDeclaracionIngrediente, idx: number) => {
                const subida = puedeSubirMP(idx);
                const bajada = puedeBajarMP(idx);

                return (
                  <Table.Row key={item.insumo_id}>
                    <Table.Cell textAlign="center" fontWeight="bold" color="gray.600" fontSize="sm" py={2.5}>
                      {item.posicion}
                    </Table.Cell>

                    <Table.Cell fontSize="sm" py={2.5}>
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium" color="gray.900">
                          {item.denominacion_rotulo}
                        </Text>
                        {item.nombre_insumo.toLowerCase() !== item.denominacion_rotulo.toLowerCase() && (
                          <Text fontSize="2xs" color="gray.500">
                            Insumo base: {item.nombre_insumo}
                          </Text>
                        )}
                      </VStack>
                    </Table.Cell>

                    <Table.Cell fontSize="sm" py={2.5}>
                      <Text as="span" color="gray.400">
                        —
                      </Text>
                    </Table.Cell>

                    <Table.Cell textAlign="right" py={2.5}>
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

                    <Table.Cell textAlign="center" py={2.5}>
                      <HStack justify="center" gap={1}>
                        <Box as="span" title={subida.motivo}>
                          <IconButton
                            aria-label="Subir materia prima"
                            size="xs"
                            variant="outline"
                            colorPalette="gray"
                            disabled={!subida.posible || guardando}
                            onClick={() => moverMateriaPrima(idx, "up")}
                          >
                            <FiArrowUp />
                          </IconButton>
                        </Box>
                        <Box as="span" title={bajada.motivo}>
                          <IconButton
                            aria-label="Bajar materia prima"
                            size="xs"
                            variant="outline"
                            colorPalette="gray"
                            disabled={!bajada.posible || guardando}
                            onClick={() => moverMateriaPrima(idx, "down")}
                          >
                            <FiArrowDown />
                          </IconButton>
                        </Box>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}

            {/* Cabecera Sección 2: Aditivos */}
            <Table.Row bg="gray.50">
              <Table.Cell colSpan={5} py={2} px={3}>
                <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.700">
                    Aditivos
                  </Text>
                  <Text fontSize="2xs" color="gray.500">
                    Agrupados por clase funcional (reordenamiento por bloque de función)
                  </Text>
                </HStack>
              </Table.Cell>
            </Table.Row>

            {bloquesAditivos.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} textAlign="center" color="gray.500" py={4} fontSize="sm">
                  No hay aditivos registrados en la formulación.
                </Table.Cell>
              </Table.Row>
            ) : (
              bloquesAditivos.flatMap((bloque, bIdx) =>
                bloque.items.map((it, itemInBlockIdx) => {
                  const esPrimeroDelBloque = itemInBlockIdx === 0;
                  const esUltimoDelBloque = itemInBlockIdx === bloque.items.length - 1;
                  const esPrimerBloque = bIdx === 0;
                  const esUltimoBloque = bIdx === bloquesAditivos.length - 1;

                  let puedeSubir = false;
                  let motivoSubir = "";
                  if (!esPrimeroDelBloque) {
                    puedeSubir = true;
                    motivoSubir = `Subir dentro de la clase ${bloque.clase_funcional}`;
                  } else if (!esPrimerBloque) {
                    puedeSubir = true;
                    motivoSubir = `Mover clase "${bloque.clase_funcional}" hacia arriba`;
                  } else {
                    puedeSubir = false;
                    motivoSubir =
                      "Límite de zona: un aditivo no puede preceder a las materias primas (Frontera CAA)";
                  }

                  let puedeBajar = false;
                  let motivoBajar = "";
                  if (!esUltimoDelBloque) {
                    puedeBajar = true;
                    motivoBajar = `Bajar dentro de la clase ${bloque.clase_funcional}`;
                  } else if (!esUltimoBloque) {
                    puedeBajar = true;
                    motivoBajar = `Mover clase "${bloque.clase_funcional}" hacia abajo`;
                  } else {
                    puedeBajar = false;
                    motivoBajar = "Último aditivo de la lista";
                  }

                  return (
                    <Table.Row key={it.insumo_id}>
                      <Table.Cell textAlign="center" fontWeight="bold" color="gray.600" fontSize="sm" py={2.5}>
                        {it.posicion}
                      </Table.Cell>

                      <Table.Cell fontSize="sm" py={2.5}>
                        <VStack align="start" gap={0}>
                          <Text fontWeight="medium" color="gray.900">
                            {it.denominacion_rotulo}
                          </Text>
                          {it.nombre_insumo.toLowerCase() !== it.denominacion_rotulo.toLowerCase() && (
                            <Text fontSize="2xs" color="gray.500">
                              Insumo base: {it.nombre_insumo}
                            </Text>
                          )}
                        </VStack>
                      </Table.Cell>

                      <Table.Cell fontSize="sm" py={2.5}>
                        <HStack gap={2} align="center" flexWrap="wrap">
                          <Badge size="sm" variant="subtle" colorPalette="gray" color="gray.800" fontWeight="medium">
                            {it.clase_funcional || "Aditivo"}
                          </Badge>
                          {it.numero_ins ? (
                            <Badge size="sm" variant="outline" colorPalette="gray" color="gray.700" fontWeight="semibold">
                              INS {it.numero_ins}
                            </Badge>
                          ) : (
                            <Badge size="sm" variant="surface" colorPalette="gray" color="gray.600" fontWeight="normal">
                              Sin INS
                            </Badge>
                          )}
                        </HStack>
                      </Table.Cell>

                      <Table.Cell textAlign="right" py={2.5}>
                        {it.porcentaje_mezcla != null ? (
                          <Badge
                            colorPalette="teal"
                            variant="subtle"
                            size="md"
                            px={2.5}
                            py={0.5}
                            fontSize="xs"
                            fontWeight="bold"
                          >
                            {Number(it.porcentaje_mezcla).toLocaleString("es-AR", {
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

                      <Table.Cell textAlign="center" py={2.5}>
                        <HStack justify="center" gap={1}>
                          <Box as="span" title={motivoSubir}>
                            <IconButton
                              aria-label="Subir aditivo"
                              size="xs"
                              variant="outline"
                              colorPalette="gray"
                              disabled={!puedeSubir || guardando}
                              onClick={() => moverAditivo(bIdx, itemInBlockIdx, "up")}
                            >
                              <FiArrowUp />
                            </IconButton>
                          </Box>
                          <Box as="span" title={motivoBajar}>
                            <IconButton
                              aria-label="Bajar aditivo"
                              size="xs"
                              variant="outline"
                              colorPalette="gray"
                              disabled={!puedeBajar || guardando}
                              onClick={() => moverAditivo(bIdx, itemInBlockIdx, "down")}
                            >
                              <FiArrowDown />
                            </IconButton>
                          </Box>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                }),
              )
            )}
          </Table.Body>
        </Table.Root>

        {/* Recuadro de Cadena Legal Normalizada */}
        {texto_legal_rotulo && (
          <Box
            p={3.5}
            bg="gray.50"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
          >
            <HStack justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
              <Text fontSize="xs" fontWeight="bold" color="gray.700" textTransform="uppercase" letterSpacing="wider">
                Texto Legal Generado para el Rótulo
              </Text>
              <Button
                size="xs"
                colorPalette="gray"
                variant="outline"
                onClick={copiarTexto}
              >
                {copiado ? <FiCheck /> : <FiCopy />}
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            </HStack>

            <Text
              fontSize="sm"
              color="gray.800"
              fontFamily="sans-serif"
              lineHeight="1.6"
              fontStyle="italic"
            >
              {texto_legal_rotulo}
            </Text>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
};
