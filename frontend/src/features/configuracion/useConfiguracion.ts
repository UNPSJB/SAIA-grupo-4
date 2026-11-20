import { useContext } from "react";
import { ConfiguracionContext } from "./ConfiguracionContext";

export const useConfiguracion = () => useContext(ConfiguracionContext);