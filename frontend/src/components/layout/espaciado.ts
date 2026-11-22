export const PAGE_PX = { base: 4, md: 6, xl: 8 };
export const PAGE_PY = { base: 4, md: 6};

/** Oculta visualmente la barra de scroll manteniendo el desplazamiento táctil o con rueda. */
export const SCROLLBAR_OCULTA_CSS = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;