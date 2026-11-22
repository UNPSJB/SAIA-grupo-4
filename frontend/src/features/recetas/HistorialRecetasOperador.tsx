import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiClock, FiFileText, FiPrinter } from "react-icons/fi";

import {
  AlertMessage,
  DataTable,
  LoadingState,
  RowActionButton,
  RowActions,
  TablePagination,
  type ColumnDef,
  TextoSinValor,
} from "../../components/ui";
import { ListadoContainer, ListadoHeader } from "../../components/layout";
import { ITEMS_POR_PAGINA } from "../../config";
import { formatearFecha } from "../../utils/fecha";
import { recetasApi } from "./hooks/recetaApi";
import { ESTADOS_RECETA } from "./constants";
import { imprimirFichaReceta } from "./utils/imprimirFichaReceta";
import { FichaRecetaPrint } from "./FichaRecetaPrint";
import type { Receta } from "./types";

export const HistorialRecetasOperador = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { productoId } = useParams<{ productoId: string }>();
  const prodIdNum = Number(productoId);

  const productoNombreState =
    (location.state as { productoNombre?: string } | null)?.productoNombre ?? "";

  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [recetaParaImprimir, setRecetaParaImprimir] = useState<Receta | null>(
    null,
  );

  useEffect(() => {
    if (!prodIdNum || Number.isNaN(prodIdNum)) {
      setError("Producto inválido.");
      setLoading(false);
      return;
    }

    let activo = true;
    setLoading(true);
    recetasApi
      .obtenerHistorialRecetasProducto(prodIdNum)
      .then((data) => {
        if (activo) {
          setRecetas(data);
          setError("");
        }
      })
      .catch((e) => {
        if (activo) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo cargar el historial de recetas.",
          );
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [prodIdNum]);

  const nombreProducto =
    recetas[0]?.producto?.nombre || productoNombreState || `Producto #${prodIdNum}`;

  const itemsPagina = useMemo(() => {
    const inicio = (page - 1) * ITEMS_POR_PAGINA;
    return recetas.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [recetas, page]);

  const verFicha = (r: Receta) => {
    navigate(`/recetas/${r.id}`, {
      state: {
        from: `/recetas/historial/${prodIdNum}`,
        label: "Historial de Versiones",
        padre: { nombre: "Recetas", to: "/recetas" },
        productoNombre: nombreProducto,
      },
    });
  };

  const handleImprimir = async (r: Receta) => {
    try {
      const full =
        r.pasos && r.pasos.length > 0
          ? r
          : await recetasApi.obtenerRecetaConsultable(r.id);
      setRecetaParaImprimir(full);
      setTimeout(() => {
        imprimirFichaReceta(full);
      }, 50);
    } catch (err) {
      console.error("Error al preparar ficha para impresión:", err);
    }
  };

  const columnas: ColumnDef<Receta>[] = [
    {
      key: "codigo_receta",
      label: "Código",
      w: "170px",
      valorExportacion: (r) => `${r.codigo_receta} (v${r.version})`,
      render: (r) => (
        <HStack gap={1.5} wrap="wrap">
          <Text>{r.codigo_receta}</Text>
          <Badge colorPalette="gray" variant="surface" size="sm">
            v{r.version}
          </Badge>
        </HStack>
      ),
    },
    {
      key: "nombre_receta",
      label: "Nombre",
      valorExportacion: (r) => r.nombre_receta,
      render: (r) => <Text fontWeight="medium">{r.nombre_receta}</Text>,
    },
    {
      key: "rendimiento",
      label: "Rendimiento",
      valorExportacion: (r) => `${r.rendimiento_estandar} g`,
      render: (r) => <Text fontSize="sm">{r.rendimiento_estandar} g</Text>,
    },
    {
      key: "fecha_baja",
      label: "Archivada el",
      valorExportacion: (r) => (r.fecha_baja ? formatearFecha(r.fecha_baja) : "—"),
      render: (r) =>
        r.fecha_baja ? (
          <Text fontSize="sm">{formatearFecha(r.fecha_baja)}</Text>
        ) : (
          <TextoSinValor>—</TextoSinValor>
        ),
    },
    {
      key: "estado",
      label: "Estado",
      valorExportacion: (r) => ESTADOS_RECETA[r.estado]?.texto ?? r.estado,
      render: (r) => {
        const info = ESTADOS_RECETA[r.estado] || { texto: r.estado, color: "gray" };
        return (
          <Badge colorPalette={info.color} variant="subtle">
            {info.texto}
          </Badge>
        );
      },
    },
    {
      key: "acciones",
      label: "Acciones",
      exportable: false,
      w: "130px",
      align: "end",
      render: (r) => (
        <RowActions>
          <RowActionButton
            icon={FiFileText}
            label="Ver ficha técnica"
            title="Ver ficha técnica histórica"
            colorPalette="purple"
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
    <ListadoContainer>
      <ListadoHeader title="Historial de Recetas" icon={FiClock}>
        <Badge colorPalette="purple" variant="subtle" fontSize="sm" px={3} py={1}>
          {nombreProducto}
        </Badge>
      </ListadoHeader>

      {error && (
        <Box mb={4}>
          <AlertMessage type="error" message={error} />
        </Box>
      )}

      {loading && <LoadingState message="Cargando historial de versiones..." />}

      {!loading && !error && recetas.length === 0 && (
        <AlertMessage
          type="info"
          message={`El producto "${nombreProducto}" no posee versiones de recetas archivadas hasta el momento.`}
        />
      )}

      {!loading && !error && recetas.length > 0 && (
        <>
          {/* Vista Escritorio / Tablet */}
          <Box>
            <DataTable
              items={itemsPagina}
              exportarItems={recetas}
              exportarTitulo={`Historial Recetas - ${nombreProducto}`}
              hideTableOnMobile
              columns={columnas}
              getRowKey={(r) => r.id}
            />
          </Box>

          {/* Vista Móvil: Tarjetas apiladas */}
          <VStack display={{ base: "flex", md: "none" }} align="stretch" gap={3}>
            {itemsPagina.map((r) => {
              const infoEstado = ESTADOS_RECETA[r.estado] || {
                texto: r.estado,
                color: "gray",
              };
              const cantPasos = r.pasos?.length ?? 0;

              return (
                <Card.Root key={r.id} variant="outline">
                  <Card.Body gap={2}>
                    <HStack justify="space-between" align="flex-start" gap={2}>
                      <HStack gap={1.5} wrap="wrap">
                        <Text fontWeight="bold" color="green.700">
                          {r.codigo_receta}
                        </Text>
                        <Badge colorPalette="gray" variant="surface" size="sm">
                          v{r.version}
                        </Badge>
                      </HStack>
                      <Badge colorPalette={infoEstado.color} variant="subtle">
                        {infoEstado.texto}
                      </Badge>
                    </HStack>

                    <Text fontWeight="semibold" fontSize="md">
                      {r.nombre_receta}
                    </Text>

                    <Text fontSize="xs" color="gray.600">
                      Rendimiento: <strong>{r.rendimiento_estandar} g</strong>
                      {cantPasos > 0 && (
                        <>
                          {" "}
                          · <strong>{cantPasos} pasos</strong>
                        </>
                      )}
                      {r.fecha_baja && (
                        <>
                          {" "}
                          · Archivada: <strong>{formatearFecha(r.fecha_baja)}</strong>
                        </>
                      )}
                    </Text>

                    <HStack gap={2} mt={2}>
                      <Button
                        colorPalette="green"
                        variant="outline"
                        flex="1"
                        onClick={() => verFicha(r)}
                      >
                        <FiFileText /> Ver ficha
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
              count={recetas.length}
              page={page}
              pageSize={ITEMS_POR_PAGINA}
              onPageChange={setPage}
              labelSingular="versión archivada"
              labelPlural="versiones archivadas"
            />
          </Box>
        </>
      )}

      {recetaParaImprimir && <FichaRecetaPrint receta={recetaParaImprimir} />}
    </ListadoContainer>
  );
};
