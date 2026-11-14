import { Badge } from "@chakra-ui/react";
import { FiActivity, FiBox, FiEye } from "react-icons/fi";
import { DetalleModal, type SeccionDetalle } from "../../components/layout";
import type { Insumo } from "./types";

interface InsumoDetalleProps {
  insumo: Insumo;
  onCerrar: () => void;
}

const fmtNutriente = (
  val: number | string | null | undefined,
  unidad: string,
): string => {
  if (val === null || val === undefined || val === "") return "—";
  return `${Number(val).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${unidad}`;
};

const fmtFecha = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export const InsumoDetalle = ({ insumo, onCerrar }: InsumoDetalleProps) => {
  const esEnvase = (insumo.categoria || "").trim().toLowerCase() === "envase";
  const base = insumo.base_calculo || "100g";

  const secciones: SeccionDetalle[] = [
    {
      titulo: "Datos del Insumo",
      icono: FiBox,
      items: [
        { label: "Nombre", valor: insumo.nombre },
        {
          label: "Unidad de medida",
          valor: `${insumo.unidad_medida.nombre} (${insumo.unidad_medida.simbolo})`,
        },
        {
          label: "Consumo acumulado",
          valor: `${Number(insumo.consumo ?? 0).toLocaleString("es-AR", {
            maximumFractionDigits: 3,
          })} ${insumo.unidad_medida.simbolo}`,
        },
        { label: "Categoría", valor: insumo.categoria },
        { label: "Descripción", valor: insumo.descripcion || "—" },
        ...(insumo.densidad_g_ml != null
          ? [{ label: "Densidad", valor: `${insumo.densidad_g_ml} g/ml` }]
          : []),
        ...(insumo.peso_unitario_g != null
          ? [{ label: "Peso unitario promedio", valor: `${insumo.peso_unitario_g} g` }]
          : []),
        ...(insumo.denominacion_rotulo
          ? [{ label: "Denominación rótulo (CAA)", valor: insumo.denominacion_rotulo }]
          : []),
        ...(insumo.clase_funcional
          ? [{ label: "Clase funcional", valor: insumo.clase_funcional }]
          : []),
        ...(insumo.numero_ins
          ? [{ label: "Número INS", valor: insumo.numero_ins }]
          : []),
        {
          label: "Estado",
          valor: (
            <Badge colorPalette={insumo.disponible ? "green" : "red"}>
              {insumo.disponible ? "Activo" : "Inactivo"}
            </Badge>
          ),
        },
      ],
    },
  ];

  if (!esEnvase) {
    const esFuenteSara = (insumo.fuente_nutricional || "")
      .toUpperCase()
      .includes("SARA");

    secciones.push({
      titulo: `Perfil Nutricional (por ${base})`,
      icono: FiActivity,
      items: [
        {
          label: "Estado nutricional",
          valor:
            insumo.nutricion_completa && insumo.es_nutricion_modificada ? (
              <Badge colorPalette='blue'>Completa (modificada)</Badge>
            ) : insumo.nutricion_completa ? (
              <Badge colorPalette='green'>Completa</Badge>
            ) : (
              <Badge colorPalette='yellow'>Pendiente</Badge>
            ),
        },
        {
          label: "Fuente",
          valor: insumo.fuente_nutricional ? (
            <Badge colorPalette={esFuenteSara ? "purple" : "gray"}>
              {insumo.fuente_nutricional}
            </Badge>
          ) : (
            "—"
          ),
        },
        {
          label: "Fecha de carga nutricional",
          valor: fmtFecha(insumo.fecha_carga_nutricional),
        },
        ...(insumo.es_nutricion_modificada
          ? [
              {
                label: "Última modificación manual",
                valor: fmtFecha(insumo.fecha_modificacion_nutricional),
              },
            ]
          : []),
        {
          label: "Valor Energético",
          valor: fmtNutriente(insumo.valor_energetico_kcal, "kcal"),
        },
        {
          label: "Carbohidratos",
          valor: fmtNutriente(insumo.carbohidratos_g, "g"),
        },
        {
          label: "Azúcares Totales",
          valor: fmtNutriente(insumo.azucares_totales_g, "g"),
        },
        {
          label: "Azúcares Añadidos",
          valor: fmtNutriente(insumo.azucares_anadidos_g, "g"),
        },
        {
          label: "Proteínas",
          valor: fmtNutriente(insumo.proteinas_g, "g"),
        },
        {
          label: "Grasas Totales",
          valor: fmtNutriente(insumo.grasas_totales_g, "g"),
        },
        {
          label: "Grasas Saturadas",
          valor: fmtNutriente(insumo.grasas_saturadas_g, "g"),
        },
        {
          label: "Grasas Trans",
          valor: fmtNutriente(insumo.grasas_trans_g, "g"),
        },
        {
          label: "Fibra Alimentaria",
          valor: fmtNutriente(insumo.fibra_g, "g"),
        },
        {
          label: "Sodio",
          valor: fmtNutriente(insumo.sodio_mg, "mg"),
        },
      ],
    });
  }

  return (
    <DetalleModal
      open
      title='Detalle de Insumo'
      icon={FiEye}
      onClose={onCerrar}
      secciones={secciones}
    />
  );
};
