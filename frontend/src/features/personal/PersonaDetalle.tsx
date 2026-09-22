import { useState } from "react";
import { Badge, VStack, Text, HStack } from "@chakra-ui/react";
import { FiEye, FiUser, FiChevronDown, FiChevronUp, FiClock, FiAward } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Persona } from "./types";

interface PersonalDetalleProps {
  persona: Persona;
  onCerrar: () => void;
}

const formatearFecha = (fechaStr?: string | null) => {
  if (!fechaStr) return "Presente";
  try {
    const isoString = fechaStr.includes("T") ? fechaStr : `${fechaStr}T00:00:00`;
    const fecha = new Date(isoString);
    if (isNaN(fecha.getTime())) return fechaStr;
    return fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return fechaStr;
  }
};

export const PersonalDetalle = ({ persona, onCerrar }: PersonalDetalleProps) => {
  const [historialAbierto, setHistorialAbierto] = useState(false);

  const capacidadesVigentes = persona.capacidades.filter((c) => c.activo);

  const historialAgrupado = persona.capacidades.reduce((acc, cap) => {
    const nombreCap = cap.capacidad.nombre;
    if (!acc[nombreCap]) acc[nombreCap] = [];
    acc[nombreCap].push(cap);
    return acc;
  }, {} as Record<string, typeof persona.capacidades>);

  const secciones: SeccionDetalle[] = [
    {
      titulo: "DATOS PERSONALES",
      icono: FiUser,
      items: [
        { label: "Nombre", valor: persona.nombre },
        { label: "Apellido", valor: persona.apellido },
        { label: "DNI", valor: persona.dni },
        { label: "Legajo", valor: persona.legajo },
        { label: "Email", valor: persona.email || "—" },
        { label: "Teléfono", valor: persona.telefono || "—" },
        { label: "Fecha de alta", valor: formatearFecha(persona.fecha_alta) },
        {
          label: "Estado actual",
          valor: (
            <Badge colorPalette={persona.activo ? "green" : "red"}>
              {persona.activo ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
    {
      titulo: "CAPACIDADES VIGENTES",
      icono: FiAward,
      items: capacidadesVigentes.length > 0
        ? capacidadesVigentes.map((cap) => ({
            label: cap.capacidad.nombre.toUpperCase(),
            valor: `(Vigente desde: ${formatearFecha(cap.fecha_desde)})`,
          }))
        : [{ label: "Estado", valor: "No posee capacidades vigentes en la actualidad." }],
    },
    {
      titulo: (
        <HStack
          as="span"
          cursor="pointer"
          onClick={() => setHistorialAbierto(!historialAbierto)}
          display="inline-flex"
          alignItems="center"
          userSelect="none"
          _hover={{ opacity: 0.8 }}
        >
          <Text as="span">HISTORIAL DE CAPACIDADES</Text>
          {historialAbierto ? <FiChevronUp /> : <FiChevronDown />}
        </HStack>
      ) as any,
      icono: FiClock,
      items: historialAbierto
        ? Object.keys(historialAgrupado).length > 0
          ? Object.entries(historialAgrupado).map(([nombre, caps]) => ({
              label: nombre.toUpperCase(),
              valor: (
                <VStack align="start" gap={0}>
                  {caps.map((c, i) => (
                    <Text key={i} fontSize="sm" color="gray.600">
                      {formatearFecha(c.fecha_desde)} — {formatearFecha(c.fecha_hasta)}
                    </Text>
                  ))}
                </VStack>
              ),
            }))
          : [{ label: "Historial", valor: "No hay registros disponibles." }]
        : [],
    },
  ];

  return (
    <DetalleModal
      open
      title="Detalle de Persona"
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};