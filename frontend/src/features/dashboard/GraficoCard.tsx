import { Card, HStack, IconButton, Text } from "@chakra-ui/react";
import { useRef, useState, type ReactNode } from "react";
import { FiDownload } from "react-icons/fi";
import { descargarGraficoPng } from "./utils/descargarGrafico";

interface GraficoCardProps {
  title: string;
  children: ReactNode;
  /** false para tarjetas sin datos: no hay nada que descargar. */
  descargable?: boolean;
  /** Modo impresión: sin botón de descarga ni sombra, y sin cortarse entre hojas. */
  impresion?: boolean;
}

// Tarjeta común de los gráficos del dashboard, con botón para descargarlo como PNG.
export function GraficoCard({
  title,
  children,
  descargable = true,
  impresion = false,
}: GraficoCardProps) {
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState(false);

  const descargar = async () => {
    if (!tarjetaRef.current) return;
    setDescargando(true);
    setError(false);
    try {
      await descargarGraficoPng(tarjetaRef.current, title);
    } catch {
      setError(true);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Card.Root
      ref={tarjetaRef}
      h='full'
      // En papel la tarjeta es más compacta (menos relleno) para que el informe entre en una hoja
      size={impresion ? "sm" : "md"}
      shadow={impresion ? "none" : "md"}
      borderWidth={impresion ? "1px" : undefined}
      borderColor={impresion ? "gray.200" : undefined}
      className={impresion ? "no-cortar" : undefined}
    >
      <Card.Header>
        <HStack justify='space-between' align='center' gap={2}>
          <Text fontSize='md' fontWeight='semibold'>
            {title}
          </Text>
          {descargable && !impresion && (
            <IconButton
              data-no-exportar=''
              aria-label={`Descargar gráfico ${title}`}
              title='Descargar imagen (PNG)'
              size='xs'
              variant='ghost'
              colorPalette='blue'
              color='gray.500'
              _hover={{ bg: "blue.50", color: "blue.600" }}
              loading={descargando}
              onClick={() => void descargar()}
            >
              <FiDownload />
            </IconButton>
          )}
        </HStack>
        {error && (
          <Text data-no-exportar='' fontSize='xs' color='red.500'>
            No se pudo descargar el gráfico. Intentá nuevamente.
          </Text>
        )}
      </Card.Header>
      <Card.Body>{children}</Card.Body>
    </Card.Root>
  );
}
