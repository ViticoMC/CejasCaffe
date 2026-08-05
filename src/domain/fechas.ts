export type TipoPeriodo = 'hoy' | 'semana' | 'mes' | 'todo';

export interface RangoFechas {
  desde: string | undefined;
  hasta: string | undefined;
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function aISOdia(fecha: Date, hora: string): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(
    fecha.getDate()
  )}T${hora}`;
}

function inicioSemanaLocal(offset: number): Date {
  const hoy = new Date();
  const diffLunes = (hoy.getDay() + 6) % 7;
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diffLunes + offset * 7);
}

export function rangoDePeriodo(tipo: TipoPeriodo, offset = 0): RangoFechas {
  const hoy = new Date();
  switch (tipo) {
    case 'hoy': {
      const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + offset);
      return { desde: aISOdia(dia, '00:00:00'), hasta: aISOdia(dia, '23:59:59') };
    }
    case 'semana': {
      const inicio = inicioSemanaLocal(offset);
      const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
      return { desde: aISOdia(inicio, '00:00:00'), hasta: aISOdia(fin, '23:59:59') };
    }
    case 'mes': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + offset + 1, 0);
      return { desde: aISOdia(inicio, '00:00:00'), hasta: aISOdia(fin, '23:59:59') };
    }
    case 'todo':
      return { desde: undefined, hasta: undefined };
  }
}

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function tituloDePeriodo(tipo: TipoPeriodo, offset = 0): string {
  const hoy = new Date();
  switch (tipo) {
    case 'hoy': {
      const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + offset);
      return `${dia.getDate()} ${MESES[dia.getMonth()]}`;
    }
    case 'semana': {
      const inicio = inicioSemanaLocal(offset);
      const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
      const mismaAnio = inicio.getFullYear() === fin.getFullYear();
      return `Semana del ${inicio.getDate()} ${MESES[inicio.getMonth()]} al ${fin.getDate()} ${
        MESES[fin.getMonth()]
      }${mismaAnio ? '' : ` ${fin.getFullYear()}`}`;
    }
    case 'mes': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
      return `${MESES[inicio.getMonth()]} ${inicio.getFullYear()}`;
    }
    case 'todo':
      return 'Todo el histórico';
  }
}

export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} · ${dosDigitos(fecha.getHours())}:${dosDigitos(
    fecha.getMinutes()
  )}`;
}
