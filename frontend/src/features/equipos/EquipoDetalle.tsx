import { BASE_URL } from "../../config";
import { Badge, Box, Button, HStack, Icon, Text } from "@chakra-ui/react";
import { FiEye, FiThermometer, FiFileText } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Equipo } from "./types";

interface EquipoDetalleProps {
  equipo: Equipo;
  onCerrar: () => void;
}

export const EquipoDetalle = ({ equipo, onCerrar }: EquipoDetalleProps) => {
  // Misma noción de "última" que el formulario: por fecha y, a igualdad, por id.
  const ultimaCalibracion =
    equipo.calibraciones && equipo.calibraciones.length > 0
      ? [...equipo.calibraciones].sort(
          (a, b) =>
            b.fecha_calibracion.localeCompare(a.fecha_calibracion) ||
            b.id - a.id,
        )[0]
      : null;

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Equipo",
      icono: FiThermometer,
      items: [
        { label: "Nombre", valor: equipo.nombre },
        { label: "Marca", valor: equipo.marca },
        { label: "Número de serie", valor: equipo.numero_serie },
        { label: "Categoría", valor: equipo.categoria },
        { label: "Sector", valor: equipo.sector.nombre },
        { label: "Ubicación", valor: equipo.ubicacion || "—" },
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={equipo.activo ? "green" : "red"}>
              {equipo.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
        {
          label: "Última calibración",
          valor: !ultimaCalibracion ? (
            "—"
          ) : (
            <Box mt={0}>
              <Text fontSize="sm" mb={1} color="gray.700">
                <Text as="span" fontWeight="medium" color="gray.900">Fecha:</Text> {new Date(ultimaCalibracion.fecha_calibracion).toLocaleDateString("es-AR")}
              </Text>

              {ultimaCalibracion.observaciones && (
                <Text fontSize="sm" mb={2} color="gray.700">
                  <Text as="span" fontWeight="medium" color="gray.900">Observaciones:</Text> {ultimaCalibracion.observaciones}
                </Text>
              )}

              {ultimaCalibracion.certificado_url && (
                <Button
                  size="sm"
                  colorPalette="blue"
                  variant="outline"
                  mt={1}
                  onClick={() =>
                    window.open(
                      `${BASE_URL}${ultimaCalibracion.certificado_url}`,
                      "_blank"
                    )
                  }
                >
                  <HStack gap={2}>
                    <Icon as={FiFileText} />
                    <Text>Ver certificado adjunto</Text>
                  </HStack>
                </Button>
              )}
            </Box>
          ),
        },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Equipo'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};