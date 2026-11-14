import { useEffect, useRef, useState } from "react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import {
  Alert,
  Badge,
  Box,
  Button,
  Collapsible,
  Flex,
  GridItem,
  HStack,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiActivity,
  FiChevronDown,
  FiChevronUp,
  FiDatabase,
  FiEdit3,
  FiSearch,
} from "react-icons/fi";
import { BASE_URL } from "../../../config";
import { apiFetch } from "../../auth/apiFetch";
import { useDebounce } from "../../../hooks/useDebounce";
import { SelectField, TextField } from "../../../components/ui";
import type { AlimentoReferencia } from "../../alimentoReferencia/types";
import type { InsumoFormValues } from "../validationSchema";
import type { Insumo } from "../types";

interface SeccionNutricionalInsumoProps {
  register: UseFormRegister<InsumoFormValues>;
  setValue: UseFormSetValue<InsumoFormValues>;
  watch: UseFormWatch<InsumoFormValues>;
  errors: FieldErrors<InsumoFormValues>;
  esModoVer: boolean;
  esAditivo: boolean;
  insumo?: Insumo;
}

const fmtDec = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined || v === "") return "0.00";
  return Number(v).toFixed(2);
};

const MAPA_CAMPO_REF: Record<string, keyof AlimentoReferencia> = {
  valor_energetico_kcal: "energia_kcal",
  carbohidratos_g: "carbohidratos_g",
  proteinas_g: "proteinas_g",
  grasas_totales_g: "grasas_totales_g",
  grasas_saturadas_g: "grasas_saturadas_g",
  fibra_g: "fibra_g",
  sodio_mg: "sodio_mg",
};

export const SeccionNutricionalInsumo = ({
  register,
  setValue,
  watch,
  errors,
  esModoVer,
  esAditivo,
  insumo,
}: SeccionNutricionalInsumoProps) => {
  const [modoOrigen, setModoOrigen] = useState<"referencia" | "manual">(
    insumo && !insumo.alimento_referencia_id && insumo.fuente_nutricional
      ? "manual"
      : "referencia",
  );
  const [busquedaRef, setBusquedaRef] = useState("");
  const terminoDebounce = useDebounce(busquedaRef.trim(), 300);
  const [resultados, setResultados] = useState<AlimentoReferencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [refSeleccionada, setRefSeleccionada] =
    useState<AlimentoReferencia | null>(null);
  const [camposModificados, setCamposModificados] = useState<
    Record<string, boolean>
  >({});
  const [mostrarExtrasAditivo, setMostrarExtrasAditivo] = useState(false);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const omitirSiguienteBusquedaRef = useRef(false);
  const opcionesRef = useRef<(HTMLDivElement | null)[]>([]);

  const baseCalculo = watch("base_calculo") || "100g";
  const fuenteActual = watch("fuente_nutricional") || "";

  useEffect(() => {
    const refId = insumo?.alimento_referencia_id;
    if (!refId) return;

    let activo = true;
    apiFetch(`${BASE_URL}/alimentos-referencia/${refId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((refItem: AlimentoReferencia | null) => {
        if (!activo || !refItem) return;
        omitirSiguienteBusquedaRef.current = true;
        setRefSeleccionada(refItem);
        setBusquedaRef(refItem.alimento);
        const iniciales: Record<string, boolean> = {};
        if (insumo?.es_nutricion_modificada) {
          for (const [campoIns, campoRef] of Object.entries(MAPA_CAMPO_REF)) {
            const valIns = (insumo as unknown as Record<string, unknown>)[campoIns] as
              | number
              | string
              | null
              | undefined;
            const valRef = refItem[campoRef] as number | string | null | undefined;
            if (fmtDec(valIns) !== fmtDec(valRef)) {
              iniciales[campoIns] = true;
            }
          }
        }
        setCamposModificados(iniciales);
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, [insumo?.id, insumo?.alimento_referencia_id, insumo?.es_nutricion_modificada]);

  useEffect(() => {
    const manejarClickAfuera = (e: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setMostrarLista(false);
      }
    };
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, []);

  useEffect(() => {
    if (indiceActivo >= 0) {
      opcionesRef.current[indiceActivo]?.scrollIntoView({ block: "nearest" });
    }
  }, [indiceActivo]);

  useEffect(() => {
    if (modoOrigen !== "referencia" || esModoVer) return;
    if (omitirSiguienteBusquedaRef.current) {
      omitirSiguienteBusquedaRef.current = false;
      return;
    }
    if (refSeleccionada && terminoDebounce === refSeleccionada.alimento.trim()) {
      return;
    }
    if (terminoDebounce.length < 2) {
      setResultados([]);
      setIndiceActivo(-1);
      return;
    }

    let activo = true;
    setBuscando(true);
    apiFetch(
      `${BASE_URL}/alimentos-referencia/?q=${encodeURIComponent(terminoDebounce)}&page=1&limit=20`,
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((items: AlimentoReferencia[]) => {
        if (activo) {
          const lista = Array.isArray(items) ? items : [];
          setResultados(lista);
          setIndiceActivo(lista.length > 0 ? 0 : -1);
          setMostrarLista(true);
        }
      })
      .catch(() => {
        if (activo) {
          setResultados([]);
          setIndiceActivo(-1);
        }
      })
      .finally(() => {
        if (activo) setBuscando(false);
      });

    return () => {
      activo = false;
    };
  }, [terminoDebounce, modoOrigen, esModoVer, refSeleccionada]);

  const aplicarReferencia = (item: AlimentoReferencia) => {
    omitirSiguienteBusquedaRef.current = true;
    setCamposModificados({});
    setRefSeleccionada(item);
    setBusquedaRef(item.alimento);
    setMostrarLista(false);
    setIndiceActivo(-1);

    const etiquetaFuente = item.es_oficial_sara
      ? `SARA 2 - ${item.alimento}`
      : `Referencia propia - ${item.alimento}`;

    const opts = { shouldValidate: true, shouldDirty: true };
    setValue("alimento_referencia_id", String(item.id), opts);
    setValue("fuente_nutricional", etiquetaFuente.slice(0, 200), opts);
    setValue("valor_energetico_kcal", fmtDec(item.energia_kcal), opts);
    setValue("carbohidratos_g", fmtDec(item.carbohidratos_g), opts);
    setValue("proteinas_g", fmtDec(item.proteinas_g), opts);
    setValue("grasas_totales_g", fmtDec(item.grasas_totales_g), opts);
    setValue("grasas_saturadas_g", fmtDec(item.grasas_saturadas_g), opts);
    setValue("fibra_g", fmtDec(item.fibra_g), opts);
    setValue("sodio_mg", fmtDec(item.sodio_mg), opts);
    // SARA 2 no mide azúcares ni grasas trans -> inicializar en 0.00
    setValue("azucares_totales_g", "0.00", opts);
    setValue("azucares_anadidos_g", "0.00", opts);
    setValue("grasas_trans_g", "0.00", opts);
  };

  const cambiarModoOrigen = (nuevoModo: "referencia" | "manual") => {
    setModoOrigen(nuevoModo);
    if (nuevoModo === "manual") {
      setCamposModificados({});
      setRefSeleccionada(null);
      setMostrarLista(false);
      setValue("alimento_referencia_id", "", { shouldDirty: true });
      if (fuenteActual.startsWith("SARA 2") || fuenteActual.startsWith("Referencia propia")) {
        setValue("fuente_nutricional", "Rótulo del proveedor", {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    }
  };

  const registrarNutrienteRef = (campo: keyof InsumoFormValues) => {
    const reg = register(campo);
    return {
      ...reg,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        if (refSeleccionada) {
          const campoRef = MAPA_CAMPO_REF[campo];
          if (campoRef) {
            const valActual = e.target.value;
            const numActual = valActual.trim() === "" ? NaN : Number(valActual);
            const valRef = refSeleccionada[campoRef] as
              | number
              | string
              | null
              | undefined;
            const esIgualARef =
              !isNaN(numActual) && numActual.toFixed(2) === fmtDec(valRef);
            setCamposModificados((prev) => {
              const estabaModificado = Boolean(prev[campo]);
              if (estabaModificado === !esIgualARef) return prev;
              const next = { ...prev };
              if (esIgualARef) {
                delete next[campo];
              } else {
                next[campo] = true;
              }
              return next;
            });
          }
        }
        return reg.onChange(e);
      },
    };
  };

  const modificadoRespectoARef = Object.keys(camposModificados).length > 0;

  const renderCamposRestantes = () => (
    <>
      <TextField
        label={`Carbohidratos (g / ${baseCalculo})`}
        disabled={esModoVer}
        type='number'
        step='0.01'
        min='0'
        hideSpinners
        error={errors.carbohidratos_g?.message}
        {...registrarNutrienteRef("carbohidratos_g")}
      />
      <TextField
        label={`Azúcares Totales (g / ${baseCalculo})`}
        disabled={esModoVer}
        type='number'
        step='0.01'
        min='0'
        hideSpinners
        error={errors.azucares_totales_g?.message}
        {...register("azucares_totales_g")}
      />
      <TextField
        label={`Azúcares Añadidos (g / ${baseCalculo})`}
        disabled={esModoVer}
        type='number'
        step='0.01'
        min='0'
        hideSpinners
        error={errors.azucares_anadidos_g?.message}
        {...register("azucares_anadidos_g")}
      />
      <TextField
        label={`Proteínas (g / ${baseCalculo})`}
        disabled={esModoVer}
        type='number'
        step='0.01'
        min='0'
        hideSpinners
        error={errors.proteinas_g?.message}
        {...registrarNutrienteRef("proteinas_g")}
      />
      <TextField
        label={`Grasas Totales (g / ${baseCalculo})`}
        disabled={esModoVer}
        type='number'
        step='0.01'
        min='0'
        hideSpinners
        error={errors.grasas_totales_g?.message}
        {...registrarNutrienteRef("grasas_totales_g")}
      />
      <TextField
        label={`Grasas Saturadas (g / ${baseCalculo})`}
        disabled={esModoVer}
        type='number'
        step='0.01'
        min='0'
        hideSpinners
        error={errors.grasas_saturadas_g?.message}
        {...registrarNutrienteRef("grasas_saturadas_g")}
      />
      <TextField
        label={`Grasas Trans (g / ${baseCalculo})`}
        disabled={esModoVer}
        type='number'
        step='0.01'
        min='0'
        hideSpinners
        error={errors.grasas_trans_g?.message}
        {...register("grasas_trans_g")}
      />
      <TextField
        label={`Fibra Alimentaria (g / ${baseCalculo})`}
        disabled={esModoVer}
        type='number'
        step='0.01'
        min='0'
        hideSpinners
        error={errors.fibra_g?.message}
        {...registrarNutrienteRef("fibra_g")}
      />
    </>
  );

  return (
    <GridItem colSpan={{ base: 1, md: 2 }}>
      <Box
        borderWidth='1px'
        borderColor='gray.200'
        borderRadius='lg'
        p={4}
        bg='gray.50'
        mt={2}
      >
        <Flex
          justify='space-between'
          align={{ base: "flex-start", md: "center" }}
          direction={{ base: "column", md: "row" }}
          gap={3}
          mb={4}
        >
          <HStack gap={2}>
            <FiActivity color='#16a34a' />
            <Text fontWeight='bold' fontSize='md' color='gray.800'>
              Información Nutricional (cada {baseCalculo})
            </Text>
          </HStack>

          {(refSeleccionada
            ? modificadoRespectoARef
            : insumo?.es_nutricion_modificada) && (
            <Badge colorPalette='blue'>
              Modificado manualmente respecto a la fuente
            </Badge>
          )}
        </Flex>

        <input type='hidden' {...register("alimento_referencia_id")} />

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mb={4}>
          <SelectField
            label='Base de cálculo'
            readOnly={esModoVer}
            options={[
              { label: "Cada 100 g (Sólidos)", value: "100g" },
              { label: "Cada 100 ml (Líquidos)", value: "100ml" },
            ]}
            error={errors.base_calculo?.message}
            {...register("base_calculo")}
          />

          {!esModoVer && (
            <Box>
              <Text fontSize='md' fontWeight='medium' mb={2}>
                Origen de los datos
              </Text>
              <HStack gap={2}>
                <Button
                  type='button'
                  size='sm'
                  variant={modoOrigen === "referencia" ? "solid" : "outline"}
                  colorPalette='green'
                  onClick={() => cambiarModoOrigen("referencia")}
                >
                  <FiDatabase /> Base de Referencia
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant={modoOrigen === "manual" ? "solid" : "outline"}
                  colorPalette='green'
                  onClick={() => cambiarModoOrigen("manual")}
                >
                  <FiEdit3 /> Carga Manual / Rótulo
                </Button>
              </HStack>
            </Box>
          )}
        </SimpleGrid>

        {!esModoVer && modoOrigen === "referencia" && (
          <Box position='relative' mb={4} ref={contenedorRef}>
            <Text fontSize='sm' fontWeight='medium' mb={1}>
              Buscar alimento en tabla SARA 2 o propia
            </Text>
            <HStack>
              <Box position='relative' flex='1'>
                <Input
                  size='sm'
                  bg='white'
                  placeholder='Escribí al menos 2 letras (ej. harina, manteca, leche...)'
                  value={busquedaRef}
                  onChange={(e) => {
                    omitirSiguienteBusquedaRef.current = false;
                    setBusquedaRef(e.target.value);
                    setMostrarLista(true);
                  }}
                  onFocus={() => {
                    if (
                      resultados.length > 0 &&
                      (!refSeleccionada ||
                        busquedaRef.trim() !== refSeleccionada.alimento.trim())
                    ) {
                      setMostrarLista(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      if (resultados.length === 0) return;
                      e.preventDefault();
                      if (!mostrarLista) {
                        setMostrarLista(true);
                        setIndiceActivo(0);
                      } else {
                        setIndiceActivo((prev) =>
                          prev < resultados.length - 1 ? prev + 1 : 0,
                        );
                      }
                    } else if (e.key === "ArrowUp") {
                      if (!mostrarLista || resultados.length === 0) return;
                      e.preventDefault();
                      setIndiceActivo((prev) =>
                        prev > 0 ? prev - 1 : resultados.length - 1,
                      );
                    } else if (e.key === "Enter") {
                      if (
                        mostrarLista &&
                        indiceActivo >= 0 &&
                        resultados[indiceActivo]
                      ) {
                        e.preventDefault();
                        aplicarReferencia(resultados[indiceActivo]);
                      }
                    } else if (e.key === "Escape") {
                      if (mostrarLista) {
                        e.preventDefault();
                        setMostrarLista(false);
                      }
                    }
                  }}
                />
              </Box>
              {buscando && <Spinner size='sm' color='green.600' />}
            </HStack>

            {mostrarLista && resultados.length > 0 && (
              <Box
                position='absolute'
                zIndex={30}
                w='full'
                mt={1}
                bg='white'
                borderWidth='1px'
                borderColor='gray.200'
                borderRadius='md'
                boxShadow='md'
                maxH='220px'
                overflowY='auto'
              >
                <VStack align='stretch' gap={0}>
                  {resultados.map((item, idx) => (
                    <Box
                      key={item.id}
                      ref={(el: HTMLDivElement | null) => {
                        opcionesRef.current[idx] = el;
                      }}
                      px={3}
                      py={2}
                      cursor='pointer'
                      bg={idx === indiceActivo ? "green.100" : undefined}
                      _hover={{ bg: "green.50" }}
                      borderBottomWidth='1px'
                      borderColor='gray.100'
                      onMouseEnter={() => setIndiceActivo(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => aplicarReferencia(item)}
                    >
                      <Flex justify='space-between' align='center' gap={2}>
                        <Box textAlign='left'>
                          <Text fontSize='sm' fontWeight='medium'>
                            {item.codigo ? `${item.codigo} · ` : ""}
                            {item.alimento}
                          </Text>
                          <Text fontSize='xs' color='gray.600'>
                            {item.categoria || "Sin categoría"} ·{" "}
                            {fmtDec(item.energia_kcal)} kcal ·{" "}
                            {fmtDec(item.carbohidratos_g)}g HC ·{" "}
                            {fmtDec(item.proteinas_g)}g Prot
                          </Text>
                        </Box>
                        <Badge
                          colorPalette={item.es_oficial_sara ? "green" : "blue"}
                          flexShrink={0}
                        >
                          {item.es_oficial_sara ? "SARA 2" : "Propio"}
                        </Badge>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {mostrarLista &&
              !buscando &&
              terminoDebounce.length >= 2 &&
              resultados.length === 0 && (
                <Text fontSize='xs' color='gray.500' mt={1}>
                  <FiSearch style={{ display: "inline", marginRight: 4 }} />
                  No se encontraron alimentos de referencia con "{terminoDebounce}".
                </Text>
              )}
          </Box>
        )}

        <Box mb={4}>
          <TextField
            label='Fuente Nutricional'
            disabled={esModoVer}
            placeholder='Ej. SARA 2 - Harina de trigo / Rótulo del proveedor'
            error={errors.fuente_nutricional?.message}
            {...register("fuente_nutricional")}
          />
        </Box>

        {(refSeleccionada?.es_oficial_sara ||
          fuenteActual.toUpperCase().includes("SARA 2")) && (
          <Alert.Root status='info' mb={4} size='sm'>
            <Alert.Indicator />
            <Alert.Description fontSize='xs'>
              La tabla SARA 2 no declara Azúcares ni Grasas Trans, por lo que se
              inicializaron en <strong>0.00</strong>. Podés ajustarlos
              manualmente si el rótulo del proveedor los especifica.
            </Alert.Description>
          </Alert.Root>
        )}

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <TextField
            label={`Valor Energético (kcal / ${baseCalculo})`}
            disabled={esModoVer}
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.valor_energetico_kcal?.message}
            {...registrarNutrienteRef("valor_energetico_kcal")}
          />
          <TextField
            label={`Sodio (mg / ${baseCalculo})`}
            disabled={esModoVer}
            type='number'
            step='0.01'
            min='0'
            hideSpinners
            error={errors.sodio_mg?.message}
            {...registrarNutrienteRef("sodio_mg")}
          />
          {!esAditivo && renderCamposRestantes()}
        </SimpleGrid>

        {esAditivo && (
          <Box mt={3}>
            <Button
              type='button'
              size='xs'
              variant='ghost'
              colorPalette='green'
              onClick={() => setMostrarExtrasAditivo((v) => !v)}
            >
              {mostrarExtrasAditivo ? <FiChevronUp /> : <FiChevronDown />}
              {mostrarExtrasAditivo
                ? "Ocultar resto de nutrientes (opcional para aditivos)"
                : "Mostrar resto de nutrientes (opcional para aditivos)"}
            </Button>

            <Collapsible.Root open={mostrarExtrasAditivo}>
              <Collapsible.Content>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mt={3}>
                  {renderCamposRestantes()}
                </SimpleGrid>
              </Collapsible.Content>
            </Collapsible.Root>
          </Box>
        )}
      </Box>
    </GridItem>
  );
};
