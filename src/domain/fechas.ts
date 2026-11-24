import type { GranularidadTendencia } from "./tipos";

export type TipoPeriodo = "hoy" | "semana" | "mes" | "todo";

export interface RangoFechas {
  desde: string | undefined;
  hasta: string | undefined;
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

function aISOdia(fecha: Date, hora: string): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(
    fecha.getDate(),
  )}T${hora}`;
}

function inicioSemanaLocal(offset: number): Date {
  const hoy = new Date();
  const diffLunes = (hoy.getDay() + 6) % 7;
  return new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() - diffLunes + offset * 7,
  );
}

export function rangoDePeriodo(tipo: TipoPeriodo, offset = 0): RangoFechas {
  const hoy = new Date();
  switch (tipo) {
    case "hoy": {
      const dia = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate() + offset,
      );
      return {
        desde: aISOdia(dia, "00:00:00"),
        hasta: aISOdia(dia, "23:59:59"),
      };
    }
    case "semana": {
      const inicio = inicioSemanaLocal(offset);
      const fin = new Date(
        inicio.getFullYear(),
        inicio.getMonth(),
        inicio.getDate() + 6,
      );
      return {
        desde: aISOdia(inicio, "00:00:00"),
        hasta: aISOdia(fin, "23:59:59"),
      };
    }
    case "mes": {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() + offset + 1, 0);
      return {
        desde: aISOdia(inicio, "00:00:00"),
        hasta: aISOdia(fin, "23:59:59"),
      };
    }
    case "todo":
      return { desde: undefined, hasta: undefined };
  }
}

export function rangoDePeriodoAnterior(
  tipo: TipoPeriodo,
  offset = 0,
): RangoFechas | null {
  if (tipo === "todo") {
    return null;
  }
  return rangoDePeriodo(tipo, offset - 1);
}

export function granularidadDePeriodo(
  tipo: TipoPeriodo,
): GranularidadTendencia {
  switch (tipo) {
    case "hoy":
      return "hora";
    case "semana":
    case "mes":
      return "dia";
    case "todo":
      return "mes";
  }
}

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function fechaDePeriodo(tipo: TipoPeriodo, offset = 0): Date {
  const hoy = new Date();
  switch (tipo) {
    case "hoy":
      return new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate() + offset,
      );
    case "semana":
      return inicioSemanaLocal(offset);
    case "mes":
      return new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
    case "todo":
      return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  }
}

export function tituloDePeriodo(tipo: TipoPeriodo, offset = 0): string {
  const hoy = new Date();
  switch (tipo) {
    case "hoy": {
      const dia = new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate() + offset,
      );
      return `${dia.getDate()} ${MESES[dia.getMonth()]}`;
    }
    case "semana": {
      const inicio = inicioSemanaLocal(offset);
      const fin = new Date(
        inicio.getFullYear(),
        inicio.getMonth(),
        inicio.getDate() + 6,
      );
      const mismaAnio = inicio.getFullYear() === fin.getFullYear();
      return `Semana del ${inicio.getDate()} ${MESES[inicio.getMonth()]} al ${fin.getDate()} ${
        MESES[fin.getMonth()]
      }${mismaAnio ? "" : ` ${fin.getFullYear()}`}`;
    }
    case "mes": {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1);
      return `${MESES[inicio.getMonth()]} ${inicio.getFullYear()}`;
    }
    case "todo":
      return "Todo el histórico";
  }
}

export function fechaAVentaISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(
    fecha.getDate(),
  )}T${"00:00:00"}`;
}

export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
}

const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

interface PartesFecha {
  anio: number;
  mes: number;
  dia: number;
  hora: number | null;
}

function partesDeFecha(fecha: string): PartesFecha {
  const [fechaParte, horaParte] = fecha.split("T");
  const [anio, mes, dia] = fechaParte.split("-").map(Number);
  const hora = horaParte != null ? Number(horaParte.slice(0, 2)) : null;
  return {
    anio,
    mes,
    dia: dia ?? 1,
    hora: hora != null && Number.isFinite(hora) ? hora : null,
  };
}

export function etiquetaTendencia(
  fecha: string,
  granularidad: GranularidadTendencia,
): string {
  const { anio, mes, dia, hora } = partesDeFecha(fecha);
  switch (granularidad) {
    case "hora":
      return `${hora ?? 0}h`;
    case "mes":
      return `${MESES[mes - 1]} ${String(anio).slice(2)}`;
    case "semana":
      return `Sem ${dia} ${MESES[mes - 1]}`;
    case "dia":
    default:
      return `${dia} ${MESES[mes - 1]}`;
  }
}

export function etiquetaTendenciaLarga(
  fecha: string,
  granularidad: GranularidadTendencia,
): string {
  const { anio, mes, dia, hora } = partesDeFecha(fecha);
  switch (granularidad) {
    case "hora":
      return `${dia} ${MESES[mes - 1]}, ${String(hora ?? 0).padStart(2, "0")}:00`;
    case "mes":
      return `${MESES_LARGOS[mes - 1]} ${anio}`;
    case "semana":
      return `Semana del ${dia} ${MESES[mes - 1]}`;
    case "dia":
    default:
      return `${dia} ${MESES_LARGOS[mes - 1]}`;
  }
}

export function etiquetaMejorPeriodo(
  granularidad: GranularidadTendencia,
): string {
  switch (granularidad) {
    case "hora":
      return "Mejor hora";
    case "semana":
      return "Mejor semana";
    case "mes":
      return "Mejor mes";
    case "dia":
    default:
      return "Mejor día";
  }
}
