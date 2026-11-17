import { Badge } from "@chakra-ui/react";
import { FiActivity, FiDatabase, FiEye } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { AlimentoReferencia } from "./types";

interface AlimentoReferenciaDetalleProps {
  alimento: AlimentoReferencia;
  onCerrar: () => void;
}

const fmt = (val: number | string) =>
  Number(val ?? 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const AlimentoReferenciaDetalle = ({
  alimento,
  onCerrar,
}: AlimentoReferenciaDetalleProps) => {
  const secciones: SeccionDetalle[] = [
    {
      titulo: "Identificación",
      icono: FiDatabase,
      items: [
        { label: "Alimento", valor: alimento.alimento, fullWidth: true },
        { label: "Código", valor: alimento.codigo || "—" },
        { label: "Categoría", valor: alimento.categoria || "—" },
        {
          label: "Origen",
          valor: (
            <Badge colorPalette={alimento.es_oficial_sara ? "purple" : "grey"}>
              {alimento.es_oficial_sara ? "Oficial SARA 2" : "Propio"}
            </Badge>
          ),
        },
      ],
    },
    {
      titulo: "Composición Nutricional cada 100 g",
      icono: FiActivity,
      items: [
        { label: "Energía", valor: `${fmt(alimento.energia_kcal)} kcal` },
        { label: "Carbohidratos disp.", valor: `${fmt(alimento.carbohidratos_g)} g` },
        { label: "Proteínas", valor: `${fmt(alimento.proteinas_g)} g` },
        { label: "Grasas Totales", valor: `${fmt(alimento.grasas_totales_g)} g` },
        { label: "Grasas Saturadas", valor: `${fmt(alimento.grasas_saturadas_g)} g` },
        { label: "Fibra Alimentaria", valor: `${fmt(alimento.fibra_g)} g` },
        { label: "Sodio", valor: `${fmt(alimento.sodio_mg)} mg` },
      ],
    },
  ];

  return (
    <DetalleModal
      open
      title='Detalle de Alimento de Referencia'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};
