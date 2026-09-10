/**
 * Los nombres propios del Control de Excedentes: quién paga y por qué concepto se gira.
 *
 * Salen de la hoja LISTAS del archivo «01. Control de Excedentes», que es la que
 * alimenta las validaciones de las otras hojas. Van fijos en código y no en una tabla
 * de parámetros porque no son datos del negocio sino la forma del formato: agregar un
 * comercializador es un cambio del CEP, no una fila que alguien teclea un martes.
 *
 * Las claves nunca cambian aunque cambie la etiqueta. Lo capturado se guarda por clave,
 * así que renombrar «Qi Energy» no mueve un solo peso de sitio.
 */

/** Quién le consigna a la fiducia el impuesto recaudado. */
export interface Pagador {
  clave: string;
  etiqueta: string;
}

/**
 * Los pagadores, en el orden del CEP.
 *
 * `otro` no tiene etiqueta en el archivo —es la columna I, que quedó sin encabezado— y
 * se conserva porque tiene plata en varios meses de 2025. Sin ella el total de ingresos
 * de esos meses no cuadra con el que la fiducia reporta.
 *
 * «Municipio» aparece dos veces por la misma razón: son las columnas L y M del archivo,
 * las dos con cifras distintas en el mismo mes. Fundirlas perdería el detalle de una.
 */
export const PAGADORES: Pagador[] = [
  { clave: "celsia", etiqueta: "Celsia" },
  { clave: "vatia", etiqueta: "Vatia" },
  { clave: "ingenioPichichi", etiqueta: "Ingenio Pichichi" },
  { clave: "qiEnergy", etiqueta: "Qi Energy" },
  { clave: "neuEnergy", etiqueta: "Neu Energy" },
  { clave: "otro", etiqueta: "Otro comercializador" },
  { clave: "enertotal", etiqueta: "Enertotal" },
  { clave: "emmesa", etiqueta: "Emmesa" },
  { clave: "municipio", etiqueta: "Municipio" },
  { clave: "municipio2", etiqueta: "Municipio (2)" },
];

/**
 * Los conceptos por los que la fiducia gira, tal como los escribe la orden de pago.
 *
 * El texto importa: es lo que empareja la orden con la columna del CEP, igual que el
 * SUMIFS del archivo. Por eso `Interventoría` con tilde y `Concesión AOM - INV` con los
 * espacios alrededor del guion — así están escritos en las órdenes reales, y una orden
 * con el concepto mal escrito no suma en ninguna parte.
 */
export const CONCEPTO = {
  CAOM_CINV: "Concesión AOM - INV",
  INTERVENTORIA: "Interventoría",
  ENERGIA_MEDICION: "Energía Medición",
  OBRA: "Concesión Obra",
  NAVIDENO: "Concesión AN",
} as const;

export type ConceptoOrden = (typeof CONCEPTO)[keyof typeof CONCEPTO];

/** Los conceptos que se pueden escoger al registrar una orden, en orden de uso. */
export const CONCEPTOS_ORDEN: ConceptoOrden[] = [
  CONCEPTO.CAOM_CINV,
  CONCEPTO.INTERVENTORIA,
  CONCEPTO.OBRA,
  CONCEPTO.NAVIDENO,
  CONCEPTO.ENERGIA_MEDICION,
];

/**
 * Qué clase de movimiento es la orden.
 *
 * No entra en ninguna suma del CEP: sirve para poder separar después una retención de un
 * giro cuando las dos van con el mismo concepto. En el archivo se usa así, y por eso
 * cinco órdenes de «INTERVENTORIA» en mayúscula con tipo «Retención» conviven con las de
 * «Interventoría» sin sumar en la misma columna.
 */
export const TIPOS_ORDEN = ["Factura", "Retención", "Anticipo"] as const;
export type TipoOrden = (typeof TIPOS_ORDEN)[number];
