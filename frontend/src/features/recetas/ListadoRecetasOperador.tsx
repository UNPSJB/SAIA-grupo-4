import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiBookOpen, FiPrinter } from "react-icons/fi";

import {
  AlertMessage,
  DataTable,
  FiltroSelect,
  FiltrosBar,
  FiltroTexto,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
  type ColumnDef,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { ITEMS_POR_PAGINA } from "../../config";
import { recetasApi } from "./hooks/recetaApi";
import { imprimirFichaReceta } from "./utils/imprimirFichaReceta";
import { FichaRecetaPrint } from "./FichaRecetaPrint";
import type { Receta } from "./types";

interface Filtros {
  busqueda: string;
  producto_id: string;
}

export const ListadoRecetasOperador = () => {
  const navigate = useNavigate();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [borradorFiltros, setBorradorFiltros] = useState<Filtros>({
    busqueda: "",
    producto_id: "",
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>({
    busqueda: "",
    producto_id: "",
  });

  const [page, setPage] = useState(1);
  const [recetaParaImprimir, setRecetaParaImprimir] = useState<Receta | null>(null);

  const handleImprimir = async (r: Receta) => {
    try {
      const full = r.pasos && r.pasos.length > 0 ? r : await recetasApi.obtenerRecetaActiva(r.id);
      setRecetaParaImprimir(full);
      setTimeout(() => {
        imprimirFichaReceta(full);
      }, 50);
    } catch (err) {
      console.error("Error al preparar ficha para impresión:", err);
    }
  };

  useEffect(() => {
    let activo = true;
    setLoading(true);
    recetasApi
      .obtenerRecetasActivas()
      .then((data) => {
        if (activo) {
          setRecetas(data);
          setError("");
        }
      })
      .catch((e) => {
        if (activo) {
          setError(e instanceof Error ? e.message : "No se pudieron cargar las recetas activas.");
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  // Opciones de productos extraídas de las recetas activas
  const opcionesProductos = useMemo(() => {
    const map = new Map<number, string>();
    recetas.forEach((r) => {
      if (r.producto_id && r.producto?.nombre) {
        map.set(r.producto_id, r.producto.nombre);
      }
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ label: nombre, value: String(id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [recetas]);

  const aplicarFiltros = () => {
    setFiltrosAplicados(borradorFiltros);
    setPage(1);
  };

  const limpiarFiltros = () => {
    const limpios = { busqueda: "", producto_id: "" };
    setBorradorFiltros(limpios);
    setFiltrosAplicados(limpios);
    setPage(1);
  };

  const recetasFiltradas = useMemo(() => {
    return recetas.filter((r) => {
      if (filtrosAplicados.producto_id) {
        if (String(r.producto_id) !== String(filtrosAplicados.producto_id)) {
          return false;
        }
      }
      if (filtrosAplicados.busqueda.trim()) {
        const query = filtrosAplicados.busqueda.trim().toLowerCase();
        const coincideCodigo = r.codigo_receta?.toLowerCase().includes(query);
        const coincideNombre = r.nombre_receta?.toLowerCase().includes(query);
        const coincideProd = r.producto?.nombre?.toLowerCase().includes(query);
        const coincideRend = String(r.rendimiento_estandar ?? "").toLowerCase().includes(query);
        const coincideTiempo = String(r.tiempo_estimado_total ?? "").toLowerCase().includes(query);
        const coincideInsumo = (r.pasos || []).some((p) =>
          p.insumos?.some((pi) => pi.insumo?.nombre?.toLowerCase().includes(query))
        );
        const coincideEquipo = (r.pasos || []).some((p) =>
          p.equipos?.some((pe) => pe.equipo?.nombre?.toLowerCase().includes(query))
        );

        if (
          !coincideCodigo &&
          !coincideNombre &&
          !coincideProd &&
          !coincideRend &&
          !coincideTiempo &&
          !coincideInsumo &&
          !coincideEquipo
        ) {
          return false;
        }
      }
      return true;
    });
  }, [recetas, filtrosAplicados]);

  const itemsPagina = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return recetasFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [recetasFiltradas, page]);

  const verFicha = (r: Receta) => {
    navigate(`/recetas/${r.id}`);
  };

  const obtenerCoincidenciasRecursos = (r: Receta, busqueda: string) => {
    if (!busqueda || !busqueda.trim()) return [];
    const query = busqueda.trim().toLowerCase();
    const items: { tipo: "insumo" | "equipo"; texto: string }[] = [];

    const insumosMap = new Map<string, number[]>();
    const equiposMap = new Map<string, number[]>();

    (r.pasos || []).forEach((p) => {
      p.insumos?.forEach((pi) => {
        const nom = pi.insumo?.nombre;
        if (nom && nom.toLowerCase().includes(query)) {
          if (!insumosMap.has(nom)) insumosMap.set(nom, []);
          insumosMap.get(nom)!.push(p.numero_orden);
        }
      });
      p.equipos?.forEach((pe) => {
        const nom = pe.equipo?.nombre;
        if (nom && nom.toLowerCase().includes(query)) {
          if (!equiposMap.has(nom)) equiposMap.set(nom, []);
          equiposMap.get(nom)!.push(p.numero_orden);
        }
      });
    });

    insumosMap.forEach((pasos, nom) => {
      const unicos = Array.from(new Set(pasos)).sort((a, b) => a - b);
      items.push({
        tipo: "insumo",
        texto: `Coincidencia: Insumo "${nom}" en ${unicos.map((num) => `Paso ${num}`).join(", ")}`,
      });
    });

    equiposMap.forEach((pasos, nom) => {
      const unicos = Array.from(new Set(pasos)).sort((a, b) => a - b);
      items.push({
        tipo: "equipo",
        texto: `Coincidencia: Equipo "${nom}" en ${unicos.map((num) => `Paso ${num}`).join(", ")}`,
      });
    });

    return items;
  };

  const columnas: ColumnDef<Receta>[] = [
    {
      key: "codigo_receta",
      label: "Código",
      w: "140px",
      render: (r) => (
        <Text>
          {r.codigo_receta}
        </Text>
      ),
    },
    {
      key: "nombre_receta",
      label: "Receta",
      render: (r) => {
        const coincidencias = obtenerCoincidenciasRecursos(r, filtrosAplicados.busqueda);
        return (
          <VStack align="start" gap={0.5}>
            <Text fontWeight="medium">{r.nombre_receta}</Text>
            {coincidencias.map((c, i) => (
              <Text
                key={i}
                fontSize="xs"
                color={c.tipo === "insumo" ? "blue.600" : "purple.600"}
                fontWeight="medium"
              >
                {c.texto}
              </Text>
            ))}
          </VStack>
        );
      },
    },
    {
      key: "producto",
      label: "Producto elaborado",
      render: (r) => (
        <Badge colorPalette="purple" variant="subtle">
          {r.producto?.nombre || `Producto #${r.producto_id}`}
        </Badge>
      ),
    },
    {
      key: "rendimiento",
      label: "Rendimiento",
      render: (r) => {
        const unidad = r.producto?.unidad_medida?.simbolo;
        return (
          <Text fontSize="sm">
            {unidad ? `${r.rendimiento_estandar} ${unidad}` : r.rendimiento_estandar}
          </Text>
        );
      },
    },
    {
      key: "tiempo_estimado",
      label: "Tiempo est.",
      render: (r) => (
        <Text fontSize="sm">
          {r.tiempo_estimado_total != null ? `${r.tiempo_estimado_total} min` : "—"}
        </Text>
      ),
    },
    {
      key: "acciones",
      label: "Acciones",
      w: "130px",
      align: "end",
      render: (r) => (
        <RowActions>
          <RowActionButton
            icon={FiBookOpen}
            label="Ver ficha técnica"
            title="Ver ficha técnica completa"
            colorPalette="green"
            onClick={() => verFicha(r)}
          />
          <RowActionButton
            icon={FiPrinter}
            label="Imprimir ficha"
            title="Imprimir o guardar en PDF"
            colorPalette="blue"
            onClick={() => void handleImprimir(r)}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <ListadoContainer maxW="8xl" mt={8}>
      <ListadoHeader title="Catálogo de Recetas" icon={FiBookOpen} />

      <Box
        mb={4}
        w="100%"
        css={{
          "& > div": {
            width: "100% !important",
            marginLeft: "0 !important",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
          },
          "& input": {
            width: { base: "100%", sm: "auto" },
            minWidth: { base: "100%", sm: "14rem" },
          },
          "& [data-scope='select']": {
            width: { base: "100%", sm: "auto" },
            minWidth: { base: "100%", sm: "14rem" },
          },
        }}
      >
        <FiltrosBar
          onAplicar={aplicarFiltros}
          onLimpiar={limpiarFiltros}
          hayFiltrosActivos={Boolean(filtrosAplicados.busqueda || filtrosAplicados.producto_id)}
        >
          <FiltroTexto
            ariaLabel="Buscar por código, receta, producto, insumo o equipo"
            placeholder="Código, receta, producto, insumo o equipo..."
            value={borradorFiltros.busqueda}
            onChange={(v) => setBorradorFiltros((prev) => ({ ...prev, busqueda: v }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") aplicarFiltros();
            }}
          />
          <FiltroSelect
            ariaLabel="Filtrar por producto elaborado"
            placeholder="Todos los productos elaborados"
            options={opcionesProductos}
            value={borradorFiltros.producto_id}
            onChange={(v) => setBorradorFiltros((prev) => ({ ...prev, producto_id: v }))}
          />
        </FiltrosBar>
      </Box>

      {loading && <LoadingState message="Cargando recetas activas..." />}

      {!loading && error && <AlertMessage type="error" message={error} />}

      {!loading && !error && recetas.length === 0 && (
        <AlertMessage
          type="info"
          message="No se encontraron recetas activas en el catálogo actualmente."
        />
      )}

      {!loading && !error && recetas.length > 0 && recetasFiltradas.length === 0 && (
        <AlertMessage
          type="info"
          message="No hay recetas activas que coincidan con los filtros seleccionados."
        />
      )}

      {!loading && !error && recetasFiltradas.length > 0 && (
        <>
          {/* Vista Escritorio / Tablet */}
          <Box display={{ base: "none", md: "block" }}>
            <DataTable
              items={itemsPagina}
              columns={columnas}
              getRowKey={(r) => r.id}
            />
          </Box>

          {/* Vista Móvil: Tarjetas apiladas */}
          <VStack
            display={{ base: "flex", md: "none" }}
            align="stretch"
            gap={3}
          >
            {itemsPagina.map((r) => {
              const unidad = r.producto?.unidad_medida?.simbolo;
              const rendimiento = unidad
                ? `${r.rendimiento_estandar} ${unidad}`
                : `${r.rendimiento_estandar}`;
              const cantPasos = r.pasos?.length ?? 0;

              return (
                <Card.Root key={r.id} variant="outline">
                  <Card.Body gap={2}>
                    <HStack justify="space-between" align="flex-start" gap={2}>
                      <Text fontWeight="bold" color="green.700">
                        {r.codigo_receta}
                      </Text>
                      <Badge colorPalette="purple" variant="subtle" flexShrink={0}>
                        {r.producto?.nombre || `Producto #${r.producto_id}`}
                      </Badge>
                    </HStack>

                    <Text fontWeight="semibold" fontSize="md">
                      {r.nombre_receta}
                    </Text>

                    {obtenerCoincidenciasRecursos(r, filtrosAplicados.busqueda).map((c, i) => (
                      <Text
                        key={i}
                        fontSize="xs"
                        color={c.tipo === "insumo" ? "blue.600" : "purple.600"}
                        fontWeight="medium"
                      >
                        {c.texto}
                      </Text>
                    ))}

                    <Text fontSize="xs" color="gray.600">
                      Rendimiento: <strong>{rendimiento}</strong>
                      {r.tiempo_estimado_total != null && (
                        <> · Tiempo: <strong>{r.tiempo_estimado_total} min</strong></>
                      )}
                      {cantPasos > 0 && (
                        <> · <strong>{cantPasos} pasos</strong></>
                      )}
                    </Text>

                    <HStack gap={2} mt={2}>
                      <Button
                        colorPalette="green"
                        variant="outline"
                        flex="1"
                        onClick={() => verFicha(r)}
                      >
                        <FiBookOpen /> Ver ficha
                      </Button>
                      <Button
                        colorPalette="blue"
                        variant="subtle"
                        onClick={() => void handleImprimir(r)}
                        aria-label="Imprimir ficha"
                      >
                        <FiPrinter />
                      </Button>
                    </HStack>
                  </Card.Body>
                </Card.Root>
              );
            })}
          </VStack>

          <Box mt={4}>
            <TablePagination
              count={recetasFiltradas.length}
              page={page}
              pageSize={ITEMS_POR_PAGINA}
              onPageChange={setPage}
              labelSingular="receta"
              labelPlural="recetas"
            />
          </Box>
        </>
      )}

      {recetaParaImprimir && <FichaRecetaPrint receta={recetaParaImprimir} />}
    </ListadoContainer>
  );
};
