import { useState } from 'react';
import { VStack } from '@chakra-ui/react';
import { FiSave, FiXCircle, FiBox } from 'react-icons/fi';
import { useInsumoSubmit } from '../../utils/insumo/useInsumoSubmit';
import type { FormValues } from '../../utils/insumo/types';
// UI components
import {
  FormHeader,
  TextField,
  SelectField,
  SubmitButton,
  CancelButton,
  FormActions,
  AlertMessage,
  FormContainer,
} from '../../components/ui/form';


interface CrearInsumoProps {
  onCancelar?: () => void;
}

export const CrearInsumo = ({ onCancelar }: CrearInsumoProps) => {
    const [datos, setDatos] = useState<FormValues>({ nombre: '', unidad_medida: '' });
    const [errores, setErrores] = useState<{ nombre?: string; unidad_medida?: string; otros?: string }>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = useInsumoSubmit({
      endpoint: 'http://127.0.0.1:8000/insumos/',
      method: 'POST',
      onSuccess: () => {
        // opcional: acciones tras crear
      }
    });

    return (
      <FormContainer>
        <FormHeader title="Nuevo Insumo" icon={FiBox} />
        <form onSubmit={(e) => handleSubmit(e, datos, setDatos, setErrores, setLoading, setSuccess)}>
          <VStack gap={4}>
            <TextField
              label="Nombre"
              placeholder="Ej: Arroz"
              value={datos.nombre}
              onChange={(e) => {
                setDatos({ ...datos, nombre: e.target.value });
                setErrores((prev) => ({ ...prev, nombre: undefined }));
              }}
              error={errores.nombre}
            />
            <SelectField
              label="Unidad de medida"
              placeholder="Selecciona una opción"
              value={datos.unidad_medida}
              onChange={(e) => {
                setDatos({ ...datos, unidad_medida: e.target.value });
                setErrores((prev) => ({ ...prev, unidad_medida: undefined }));
              }}
              options={[
                { label: 'Litros', value: 'litros' },
                { label: 'Kilogramos', value: 'kilogramos' },
                { label: 'Gramos', value: 'gramos' },
                { label: 'Unidades', value: 'unidades' },
              ]}
              error={errores.unidad_medida}
            />
            <FormActions>
              <CancelButton text="Cancelar" icon={FiXCircle} onClick={onCancelar} />
              <SubmitButton text="Guardar" icon={FiSave} loading={loading} type="submit" />
            </FormActions>

            {errores.otros && <AlertMessage type="error" message={errores.otros} />}
            {success && <AlertMessage type="success" message="El insumo ha sido cargado exitosamente!" />}
          </VStack>
        </form>
      </FormContainer>
    );
};