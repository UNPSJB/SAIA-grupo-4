import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  HStack,
  Input,
  Menu,
  Portal,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FiCheck,
  FiCopy,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiImage,
} from "react-icons/fi";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { AlertMessage } from "../../components/ui";

const TAMANIO_QR_DESCARGA = 1024;
const NOMBRE_BASE_QR = "saia-vista-publica-qr";

type FormatoDescarga = "png" | "pdf";

interface EnlacePublicoCardProps {
  url: string;
  activo: boolean;
}

function descargarArchivo(dataUrl: string, nombre: string) {
  const enlace = document.createElement("a");
  enlace.href = dataUrl;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

async function descargarPdf(dataUrl: string, url: string) {
  const { jsPDF } = await import("jspdf");
  const documento = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const anchoPagina = documento.internal.pageSize.getWidth();

  documento.setProperties({
    title: "Vista pública de cumplimiento - SAIA-4",
  });

  documento.setFont("helvetica", "bold");
  documento.setFontSize(18);
  documento.setTextColor(31, 41, 55);
  documento.text("Vista pública de cumplimiento", anchoPagina / 2, 30, {
    align: "center",
  });

  documento.setFont("helvetica", "normal");
  documento.setFontSize(11);
  documento.setTextColor(75, 85, 99);
  documento.text("SAIA-4", anchoPagina / 2, 39, { align: "center" });

  documento.addImage(dataUrl, "PNG", 55, 52, 100, 100);

  documento.setFontSize(10);
  documento.setTextColor(55, 65, 81);
  documento.text(
    "Escaneá este código QR para consultar los indicadores públicos.",
    anchoPagina / 2,
    164,
    { align: "center" },
  );

  documento.setFontSize(7);
  documento.setTextColor(107, 114, 128);
  const lineasUrl = documento.splitTextToSize(url, 170);
  documento.text(lineasUrl, anchoPagina / 2, 174, { align: "center" });

  documento.save(`${NOMBRE_BASE_QR}.pdf`);
}

export function EnlacePublicoCard({ url, activo }: EnlacePublicoCardProps) {
  const [copiado, setCopiado] = useState(false);
  const [errorCopiado, setErrorCopiado] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<FormatoDescarga | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const canvasQrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setErrorCopiado(null);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
      setErrorCopiado(
        "No se pudo copiar automáticamente. Seleccioná el enlace y copialo manualmente.",
      );
    }
  };

  const obtenerQrPng = () => {
    const canvas = canvasQrRef.current;

    if (!canvas) {
      throw new Error("El código QR todavía no está disponible.");
    }

    return canvas.toDataURL("image/png");
  };

  const descargarImagen = () => {
    setErrorDescarga(null);
    setDescargando("png");

    try {
      descargarArchivo(obtenerQrPng(), `${NOMBRE_BASE_QR}.png`);
    } catch {
      setErrorDescarga(
        "No se pudo generar la imagen del código QR. Intentá nuevamente.",
      );
    } finally {
      setDescargando(null);
    }
  };

  const descargarDocumentoPdf = async () => {
    setErrorDescarga(null);
    setDescargando("pdf");

    try {
      const dataUrl = obtenerQrPng();
      await descargarPdf(dataUrl, url);
    } catch {
      setErrorDescarga(
        "No se pudo generar el PDF del código QR. Intentá nuevamente.",
      );
    } finally {
      setDescargando(null);
    }
  };

  return (
    <Card.Root shadow='md'>
      <Card.Header>
        <Text as='h2' fontSize='lg' fontWeight='semibold' color='gray.800'>
          Enlace y código QR
        </Text>
      </Card.Header>
      <Card.Body>
        <VStack align='stretch' gap={4}>
          <Text fontSize='sm' color='gray.600'>
            Compartí este enlace con las personas que necesiten consultar los
            indicadores. El token es único y se mantiene aunque desactives y
            reactives la vista.
          </Text>

          {!activo && (
            <AlertMessage
              type='warning'
              message='La vista está desactivada: el enlace abrirá un mensaje de vista desactivada, sin indicadores.'
            />
          )}

          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "stretch", md: "flex-start" }}
            gap={6}
          >
            <VStack align='stretch' gap={3} flex='1'>
              <Input
                aria-label='Enlace público'
                value={url}
                readOnly
                fontFamily='mono'
                fontSize='sm'
                onFocus={(event) => event.currentTarget.select()}
              />

              <HStack gap={2} wrap='wrap'>
                <Button
                  colorPalette='green'
                  onClick={() => void copiarEnlace()}
                  aria-live='polite'
                >
                  {copiado ? <FiCheck /> : <FiCopy />}
                  {copiado ? "Copiado" : "Copiar enlace"}
                </Button>

                <Button asChild variant='outline' colorPalette='green'>
                  <a href={url} target='_blank' rel='noopener noreferrer'>
                    <FiExternalLink />
                    Abrir vista pública
                  </a>
                </Button>

                <Menu.Root>
                  <Menu.Trigger asChild>
                    <Button
                      variant='outline'
                      colorPalette='green'
                      disabled={descargando !== null}
                    >
                      {descargando ? <Spinner size='sm' /> : <FiDownload />}
                      {descargando === "pdf"
                        ? "Generando PDF..."
                        : descargando === "png"
                          ? "Generando imagen..."
                          : "Descargar QR"}
                    </Button>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content>
                        <Menu.Item
                          value='png'
                          onSelect={descargarImagen}
                          disabled={descargando !== null}
                        >
                          <FiImage />
                          <Box>
                            <Text fontWeight='medium'>Imagen PNG</Text>
                            <Text fontSize='xs' color='gray.500'>
                              Alta resolución
                            </Text>
                          </Box>
                        </Menu.Item>
                        <Menu.Item
                          value='pdf'
                          onSelect={() => void descargarDocumentoPdf()}
                          disabled={descargando !== null}
                        >
                          <FiFileText />
                          <Box>
                            <Text fontWeight='medium'>Documento PDF</Text>
                            <Text fontSize='xs' color='gray.500'>
                              Listo para imprimir o compartir
                            </Text>
                          </Box>
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              </HStack>

              {errorCopiado && (
                <AlertMessage type='error' message={errorCopiado} />
              )}
              {errorDescarga && (
                <AlertMessage type='error' message={errorDescarga} />
              )}
            </VStack>

            <Box
              alignSelf={{ base: "center", md: "flex-start" }}
              bg='white'
              p={3}
              borderRadius='lg'
              borderWidth='1px'
              borderColor='gray.200'
              w='fit-content'
            >
              <QRCodeSVG
                value={url}
                size={180}
                level='M'
                marginSize={4}
                title='Código QR del enlace público'
              />
            </Box>

            <QRCodeCanvas
              ref={canvasQrRef}
              value={url}
              size={TAMANIO_QR_DESCARGA}
              level='M'
              marginSize={4}
              bgColor='#ffffff'
              fgColor='#111827'
              aria-hidden='true'
              tabIndex={-1}
              style={{ display: "none" }}
            />
          </Flex>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
