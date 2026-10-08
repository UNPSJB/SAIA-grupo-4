import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { ListadoTipoIncidente } from "./ListadoTiposIncidente";
import { TipoIncidenteForm } from "./TipoIncidenteForm";
import { AlertDelete, AlertConfirm } from "../../components/ui";
import { handleDeleteTipoIncidente } from "./hooks/useTipoIncidenteDelete";
import { useTipoIncidenteSubmit } from "./hooks/useTipoIncidenteSubmit";
import type { TipoIncidente } from "./types";