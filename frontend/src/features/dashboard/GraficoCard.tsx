import { Card, HStack, IconButton, Text } from "@chakra-ui/react";
import { useRef, useState, type ReactNode } from "react";
import { FiDownload } from "react-icons/fi";
import { descargarGraficoPng } from "./utils/descargarGrafico";

interface GraficoCardProps {
  title: string;
  children: ReactNode;
  /** false para tarjetas sin datos: no hay nada que descargar. */
  descargable?: boolean;
}

// Tarjeta común de los gráficos del dashboard, con botón para descargarlo como PNG.
export function GraficoCard({ title, children, descargable = true }: GraficoCardProps) {
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
    <Card.Root ref={tarjetaRef} shadow='md' h='full'>
      <Card.Header>
        <HStack justify='space-between' align='center' gap={2}>
          <Text fontSize='md' fontWeight='semibold'>
            {title}
          </Text>
          {descargable && (
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
