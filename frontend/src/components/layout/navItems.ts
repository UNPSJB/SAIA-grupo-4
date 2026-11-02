import type { ElementType } from "react";
import {
  FiThermometer,
  FiUser,
  FiMap,
  FiPackage,
  FiDroplet,
  FiPlus,
  FiClipboard,
  FiClock,
  FiBookOpen,
  FiAlertCircle,
  FiAlertTriangle,
  FiFileText,
  FiBarChart2,
  FiGlobe,
  FiCheckSquare,
  FiArchive,
} from "react-icons/fi";
import { MdOutlineCleaningServices } from "react-icons/md";

export type NavItem = LinkNavItem | ParentNavItem;

export interface LinkNavItem {
  to: string;
  label: string;
  icon: ElementType;
}

export interface ParentNavItem {
  label: string;
  icon: ElementType;
  children: LinkNavItem[];
}

export const defaultItems: NavItem[] = [
  { to: "/equipos", label: "Equipos", icon: FiThermometer },
  { to: "/personal", label: "Personal", icon: FiUser },
  { to: "/sectores", label: "Sectores", icon: FiMap },
  {
    label: "Insumos",
    icon: FiPackage,
    children: [
      { to: "/insumos", label: "Insumos", icon: FiPackage },
      { to: "/insumos-quimicos", label: "Insumos Químicos", icon: FiDroplet },
    ],
  },
  {
    to: "/elementos-limpieza",
    label: "Elementos de limpieza",
    icon: MdOutlineCleaningServices,
  },
  { to: "/productos", label: "Productos", icon: FiPackage },
];

export const planItems: NavItem[] = [
  { to: "/nuevo-plan", label: "Nuevo Plan", icon: FiPlus },
  { to: "/plan-poes", label: "Plan Vigente", icon: FiClipboard },
  { to: "/historial-planes", label: "Historial", icon: FiClock },
];

export const recetasItems: NavItem[] = [
  { to: "/nueva-receta", label: "Nueva Receta", icon: FiPlus },
  { to: "/recetas", label: "Recetas", icon: FiBookOpen },
];

export const vencimientosItem: LinkNavItem = {
  to: "/vencimientos",
  label: "Vencimientos",
  icon: FiAlertCircle,
};

export const incidenteItem: LinkNavItem = {
  to: "/incidentes",
  label: "Incidentes",
  icon: FiAlertTriangle,
};

export const dashboardItem: LinkNavItem = {
  to: "/dashboard",
  label: "Dashboard",
  icon: FiBarChart2,
};

export const vistaPublicaItem: LinkNavItem = {
  to: "/vista-publica",
  label: "Vista pública",
  icon: FiGlobe,
};

export const documentosItem: LinkNavItem = {
  to: "/documentos",
  label: "Gestión documental",
  icon: FiFileText,
};

export const lotesItems: NavItem[] = [
  { to: "/lotes", label: "Nuevo Lote", icon: FiPlus },
  { to: "/historial-lotes", label: "Historial de Lotes", icon: FiClock },
];

export const checklistItems: NavItem[] = [
  { to: "/checklist", label: "Checklist Diario", icon: FiCheckSquare },
  { to: "/historial", label: "Historial de Checklist", icon: FiArchive },
];