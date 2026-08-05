import { BasePagina } from './BasePagina';
import { ConfirmacionNavegacion } from './ConfirmacionNavegacion';

export function CejasScreen() {
  return (
    <BasePagina titulo="Cejas" descripcion="Servicios del salón de día.">
      <ConfirmacionNavegacion mensaje="Estás en la página de Cejas." />
    </BasePagina>
  );
}
