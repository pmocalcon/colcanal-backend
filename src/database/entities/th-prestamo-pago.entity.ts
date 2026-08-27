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

  /**
   * `CUOTA` es el descuento pactado del mes; `ABONO` es un pago extraordinario —una
   * prima, la liquidación, plata que la persona puso de más para acabar antes—.
   *
   * Hasta ahora los abonos se anotaban a mano en la observación del préstamo y por eso
   * el saldo de la hoja no siempre cuadraba con la suma de las cuotas. Separarlos deja
   * ver de dónde salió cada peso.
   */
  @Column({ type: "varchar", length: 12, default: "CUOTA" })
  tipo: string;

  /**
   * De dónde salió la plata: `NOMINA` se le descuenta del pago del mes —y la nómina lo
   * suma a la cuota de ese periodo—; `DIRECTO` es por fuera —consignación, prima,
   * cruce con vacaciones— y solo baja el saldo.
   */
  @Column({ type: "varchar", length: 12, default: "NOMINA" })
  medio: string;

  /** Cuándo se hizo, para los abonos directos. Los de nómina van por año y mes. */
  @Column({ type: "date", nullable: true })
  fecha: string | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
