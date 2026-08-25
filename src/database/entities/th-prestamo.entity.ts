import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — préstamos a empleados.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que las demás `th_*`.
 *
 * Sale de la hoja «Prestamos» de «01. Informe general de préstamos.xlsx», que es la
 * consolidada; las otras veinte hojas del libro son cortes mensuales de 2023 a 2025 que
 * esa ya recoge.
 *
 * **No es lo mismo que el formato de solicitud de préstamo** de G. de talento humano. El
 * formato es el papel con el que se pide uno nuevo; esto es la cartera: lo que se prestó,
 * lo que se ha descontado por nómina y lo que falta. Un préstamo vive acá desde que se
 * desembolsa, lo hayan pedido con formato o no —los 52 que se importaron son anteriores
 * al formato—.
 */
@Entity("th_prestamos")
export class ThPrestamo {
  @PrimaryGeneratedColumn({ name: "prestamo_id" })
  prestamoId: number;

  /** El consecutivo de la hoja. Se conserva para poder cotejar contra el Excel. */
  @Column({ type: "int", nullable: true })
  numero: number | null;

  @Index()
  @Column({ type: "varchar", length: 160 })
  nombre: string;

  /**
   * Queda casi siempre en null y no es un descuido: **la hoja de préstamos no tiene
   * cédula**, solo el nombre escrito a mano. La importación la resuelve contra
   * `th_personal` cuando el nombre coincide sin ambigüedad, y la deja vacía cuando no,
   * que es preferible a colgarle el préstamo a un homónimo.
   */
  @Index()
  @Column({ type: "varchar", length: 30, nullable: true })
  identificacion: string | null;

  /** Código corto del proyecto tal como se abrevia en la hoja: CYC, JM, GU, PA… */
  @Column({ type: "varchar", length: 20, nullable: true })
  proyecto: string | null;

  /** Si hay pagaré firmado. En la hoja es un SI/NO suelto y en más de la mitad va vacío. */
  @Column({ type: "varchar", length: 10, nullable: true })
  pagare: string | null;

  /** Mes desde el que se empieza a descontar. En la hoja siempre es el día 1. */
  @Column({ name: "mes_inicio", type: "date", nullable: true })
  mesInicio: string | null;

  @Column({ name: "numero_cuotas", type: "int", nullable: true })
  numeroCuotas: number | null;

  @Column({ name: "fecha_vencimiento", type: "date", nullable: true })
  fechaVencimiento: string | null;

  @Column({ name: "valor_prestamo", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorPrestamo: string | null;

  @Column({ name: "valor_cuota", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorCuota: string | null;

  /**
   * Lo abonado y lo que falta, **como los trae la hoja**.
   *
   * Se guardan en vez de sumarlos desde `th_prestamo_pagos` porque no siempre cuadran:
   * hay cruces con vacaciones y abonos extraordinarios anotados a mano en la
   * observación. El número de la hoja es el que la empresa da por bueno, y recalcularlo
   * cambiaría saldos sin que nadie lo haya decidido.
   */
  @Column({ name: "valor_cancelado", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorCancelado: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  saldo: string | null;

  /**
   * Columnas auxiliares del Excel de prestamos: la nomina no descuenta necesariamente
   * `valor_cuota`, sino el valor que Contabilidad deja en "CUOTA A DESCONTAR" para el
   * nombre exacto que aparece en la hoja NOVEDADES NOMINA.
   */
  @Index()
  @Column({ name: "nombre_nomina", type: "varchar", length: 160, nullable: true })
  nombreNomina: string | null;

  @Column({ name: "cuota_descontar", type: "numeric", precision: 14, scale: 2, nullable: true })
  cuotaDescontar: string | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
