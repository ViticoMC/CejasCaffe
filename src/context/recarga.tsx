import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface ContextoRecarga {
  clave: number;
  recargar: () => void;
}

const RecargaContext = createContext<ContextoRecarga>({
  clave: 0,
  recargar: () => {},
});

export function ProveedorRecarga({ children }: { children: ReactNode }) {
  const [clave, setClave] = useState(0);
  const recargar = () => setClave((c) => c + 1);
  const valor = useMemo(() => ({ clave, recargar }), [clave, recargar]);
  return <RecargaContext.Provider value={valor}>{children}</RecargaContext.Provider>;
}

export function useRecarga(): ContextoRecarga {
  return useContext(RecargaContext);
}