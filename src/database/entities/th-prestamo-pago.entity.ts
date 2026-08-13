import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — el descuento mes a mes de un préstamo.
 *
 * En la hoja de Excel esto es la retícula de 52 columnas que va de septiembre de 2022 a
 * diciembre de 2026: una columna por mes y una celda por cuota descontada. Acá se
 * endereza a filas, que es como se puede seguir consultando cuando el año entrante haya
 * que agregar doce columnas más.
 *
 * Se importa y no se deja solo el total porque es la única forma de auditar el saldo: sin
 * esto, «le faltan $2.400.000» es un número que nadie puede verificar ni discutir.
 *
 * `prestamoId` apunta a `th_prestamos` **sin llave foránea**, igual que el resto de las
 * tablas `th_*`, que se crearon aisladas a propósito para que `synchronize: true` no
 * tuviera nada que reorganizar en producción.
 */
@Entity("th_prestamo_pagos")
@Index(["prestamoId", "anio", "mes"])
export class ThPrestamoPago {
  @PrimaryGeneratedColumn({ name: "pago_id" })
  pagoId: number;

  @Index()
  @Column({ name: "prestamo_id", type: "int" })
  prestamoId: number;

  @Column({ type: "int" })
  anio: number;

  /** 1 a 12. */
  @Column({ type: "int" })
  mes: number;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  valor: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
