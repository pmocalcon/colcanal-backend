import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from "typeorm";

/**
 * Talento humano — el renglón día a día de una planilla de horas extras.
 *
 * En el formato GTH-016-F cada fila es un día trabajado, con sus horas por tipo (diurna,
 * recargo nocturno, nocturna, diurna festiva, nocturna festiva). Se guarda desglosado y
 * no solo el total: sin esto, «le liquidaron $340.000 de más» es un número que nadie
 * puede verificar ni discutir — igual que las cuotas de `th_prestamo_pagos`.
 *
 * `horasExtraId` apunta a `th_horas_extras` **sin llave foránea**, igual que el resto de
 * las tablas `th_*`, que se crearon aisladas a propósito para que `synchronize: true` no
 * tuviera nada que reorganizar en producción.
 */
@Entity("th_horas_extras_detalle")
@Index(["horasExtraId"])
export class ThHorasExtraDetalle {
  @PrimaryGeneratedColumn({ name: "detalle_id" })
  detalleId: number;

  @Column({ name: "horas_extra_id", type: "int" })
  horasExtraId: number;

  @Column({ type: "date", nullable: true })
  fecha: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  proyecto: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  region: string | null;

  @Column({ name: "hora_entrada", type: "varchar", length: 5, nullable: true })
  horaEntrada: string | null;

  @Column({ name: "hora_salida", type: "varchar", length: 5, nullable: true })
  horaSalida: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  almuerzo: string | null;

  @Column({ name: "codigo_labor", type: "varchar", length: 40, nullable: true })
  codigoLabor: string | null;

  @Column({ type: "text", nullable: true })
  labor: string | null;

  // ── Horas por tipo, tal como están impresas en el encabezado del formato ──
  /** HED · recargo 25 %. */
  @Column({ type: "numeric", precision: 6, scale: 2, nullable: true })
  diurna: string | null;
  /** RN · recargo 35 %. */
  @Column({ name: "recargo_nocturno", type: "numeric", precision: 6, scale: 2, nullable: true })
  recargoNocturno: string | null;
  /** HEN · recargo 75 %. */
  @Column({ type: "numeric", precision: 6, scale: 2, nullable: true })
  nocturna: string | null;
  /** HDDYF · recargo 115 %. */
  @Column({ name: "diurna_festiva", type: "numeric", precision: 6, scale: 2, nullable: true })
  diurnaFestiva: string | null;
  /** HNDYF · recargo 165 %. */
  @Column({ name: "nocturna_festiva", type: "numeric", precision: 6, scale: 2, nullable: true })
  nocturnaFestiva: string | null;

  /** Este renglón por su recargo y por el valor hora de la planilla. */
  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  liquidacion: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
