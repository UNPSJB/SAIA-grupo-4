import { Image } from "@chakra-ui/react";
import contieneCafeinaImg from "../../../assets/sellos/contiene-cafeina.png";
import contieneEdulcorantesImg from "../../../assets/sellos/contiene-edulcorantes.png";
import excesoAzucaresImg from "../../../assets/sellos/exceso-azucares.png";
import excesoCaloriasImg from "../../../assets/sellos/exceso-calorias.png";
import excesoGrasasSaturadasImg from "../../../assets/sellos/exceso-grasas-saturadas.png";
import excesoGrasasTotalesImg from "../../../assets/sellos/exceso-grasas-totales.png";
import excesoSodioImg from "../../../assets/sellos/exceso-sodio.png";

const IMAGENES_OCTOGONOS: Record<string, string> = {
  EXCESO_AZUCARES: excesoAzucaresImg,
  EXCESO_GRASAS_TOTALES: excesoGrasasTotalesImg,
  EXCESO_GRASAS_SATURADAS: excesoGrasasSaturadasImg,
  EXCESO_SODIO: excesoSodioImg,
  EXCESO_CALORIAS: excesoCaloriasImg,
};

const IMAGENES_LEYENDAS: Record<string, string> = {
  CONTIENE_EDULCORANTES: contieneEdulcorantesImg,
  CONTIENE_CAFEINA: contieneCafeinaImg,
};

interface SelloGraficoProps {
  codigo: string;
  texto: string;
  compact?: boolean;
}

export const OctogonoReglamentario = ({ codigo, texto, compact = false }: SelloGraficoProps) => {
  const imagen = IMAGENES_OCTOGONOS[codigo];
  if (!imagen) return null;

  const size = compact ? "82px" : "118px";

  return (
    <Image
      src={imagen}
      alt={texto}
      title={texto}
      w={size}
      h={size}
      objectFit="contain"
      flexShrink={0}
    />
  );
};

export const LeyendaRectangular = ({ codigo, texto, compact = false }: SelloGraficoProps) => {
  const imagen = IMAGENES_LEYENDAS[codigo];
  if (!imagen) return null;

  return (
    <Image
      src={imagen}
      alt={texto}
      title={texto}
      maxW={compact ? "190px" : "260px"}
      maxH={compact ? "54px" : "72px"}
      objectFit="contain"
      flexShrink={0}
    />
  );
};
