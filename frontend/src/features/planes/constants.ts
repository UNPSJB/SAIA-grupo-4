import type { DiaSemana } from "./types";

export const QUIMICOS_DISPONIBLES = [
  "Detergente Neutro",
  "Alcohol 70%",
  "Lavandina",
  "Desengrasante",
];

export const ELEMENTOS_DISPONIBLES = [
  "Trapo rejilla",
  "Esponja",
  "Cepillo duro",
  "Mopa",
  "Paño microfibra",
];

export const DIAS_SEMANA: { value: DiaSemana; label: string }[] = [
  { value: "lun", label: "Lun" },
  { value: "mar", label: "Mar" },
  { value: "mie", label: "Mié" },
  { value: "jue", label: "Jue" },
  { value: "vie", label: "Vie" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
];