import { BadRequestException } from "@nestjs/common";
import { parsearFecha } from "./juridica-contratos";

/**
 * Del formato de préstamo a la cartera.
 *
 * El formato GTH-007-F se diligencia a mano: el valor se escribe «2.000.000» o
 * «$ 2.000.000», el número de cuotas «12 cuotas» y la fecha «15/09/2026». La tabla
 * `th_prestamos`, en cambio, tiene columnas `numeric` y `date`, que no entienden ni los
 * puntos de mil ni el día primero.
 *
 * Al firmar Dirección Administrativa, el préstamo se le mandaba a la cartera tal como
 * venía escrito y Postgres rechazaba el insert. El error salía en pantalla como «An
 * error occurred while processing your request» —el filtro no muestra los errores de
 * base, y hace bien—, así que no había forma de saber que el problema era el formato de
 * un número. Ninguna solicitud de préstamo se podía firmar.
 */

/** Lo escrito en una casilla de dinero → «2000000.50». Vacío → null. */
export function aValorCartera(valor: unknown, etiqueta: string): string | null {
  const bruto = String(valor ?? "").trim();
  if (!bruto) return null;

  // Se deja solo lo que puede ser número: fuera «$», «COP», espacios y el apóstrofo de
  // millones que se usa a mano («2'000.000»).
  const limpio = bruto.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(limpio)) throw malFormado(etiqueta, bruto);

  const negativo = limpio.startsWith("-");
  const cuerpo = limpio.replace(/-/g, "");

  let entero = cuerpo;
  let decimales = "";
  const ultimoPunto = cuerpo.lastIndexOf(".");
  const ultimaComa = cuerpo.lastIndexOf(",");
  const corte = Math.max(ultimoPunto, ultimaComa);
  if (corte >= 0) {
    const cola = cuerpo.slice(corte + 1);
    // Con una o dos cifras detrás es el separador decimal; con tres es el de miles
    // («2.000» son dos mil, no dos). Sin cifras detrás («2.000.») tampoco es decimal.
    if (cola.length >= 1 && cola.length <= 2 && /^\d+$/.test(cola)) {
      entero = cuerpo.slice(0, corte);
      decimales = cola;
    }
  }

  const soloDigitos = entero.replace(/[.,]/g, "");
  if (!/^\d*$/.test(soloDigitos) || !soloDigitos) throw malFormado(etiqueta, bruto);

  const numero = `${negativo ? "-" : ""}${soloDigitos}${decimales ? `.${decimales}` : ""}`;
  if (!Number.isFinite(Number(numero))) throw malFormado(etiqueta, bruto);
  return numero;
}

/** «12», «12 cuotas», «12,0» → 12. Vacío → null. */
export function aCuotasCartera(valor: unknown, etiqueta: string): number | null {
  const bruto = String(valor ?? "").trim();
  if (!bruto) return null;
  const digitos = bruto.replace(/\D/g, "");
  if (!digitos) throw malFormado(etiqueta, bruto);
  const n = Number(digitos);
  if (!Number.isInteger(n) || n <= 0) throw malFormado(etiqueta, bruto);
  return n;
}

/** «15/09/2026», «2026-09-15», «15 de septiembre de 2026» → «2026-09-15». Vacío → null. */
export function aFechaCartera(valor: unknown, etiqueta: string): string | null {
  const bruto = String(valor ?? "").trim();
  if (!bruto) return null;
  const fecha = parsearFecha(bruto);
  if (!fecha) throw malFormado(etiqueta, bruto);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

const malFormado = (etiqueta: string, escrito: string): BadRequestException =>
  new BadRequestException(
    `No se entiende «${escrito}» en ${etiqueta}. Escríbalo como en el ejemplo: ` +
      "un valor 2.000.000, las cuotas 12, una fecha 15/09/2026.",
  );

/** Lo que se le manda a la cartera cuando el préstamo queda firmado. */
export interface CondicionesPrestamo {
  mesInicio: string | null;
  numeroCuotas: number | null;
  valorPrestamo: string | null;
  valorCuota: string | null;
  saldo: string | null;
}

/**
 * Las condiciones del formato, ya en el formato de las columnas.
 *
 * El saldo nace igual al valor aprobado: todavía no se ha descontado nada.
 */
export function condicionesParaCartera(data: Record<string, any>): CondicionesPrestamo {
  const valor = aValorCartera(data.valorAprobado, "el valor aprobado");
  return {
    mesInicio: aFechaCartera(data.fechaDesembolso, "la fecha de desembolso"),
    numeroCuotas: aCuotasCartera(data.numeroCuotas, "el número de cuotas"),
    valorPrestamo: valor,
    valorCuota: aValorCartera(data.valorCuota, "el valor de la cuota"),
    saldo: valor,
  };
}
