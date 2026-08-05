import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

/**
 * IPP (Índice de Precios al Productor) mes a mes.
 *
 * A diferencia del resto de CREG, esta tabla **no va por municipio**: el IPP lo
 * publica el DANE y es el mismo para todos los contratos. Una fila por mes, y de
 * ahí lo leen la Liquidación y el Flujo de Caja de cualquier municipio.
 *
 * Sin llaves foráneas a propósito: es una tabla de referencia, no depende de nada.
 */
@Entity("creg_ipp_mensual")
@Unique(["ym"])
export class CregIppMensual {
  @PrimaryGeneratedColumn({ name: "ipp_id" })
  ippId: number;

  /** Mes en formato 'YYYY-MM'. */
  @Column({ name: "ym", type: "varchar", length: 7 })
  ym: string;

  /** Valor del índice. `double precision` para que Postgres devuelva number y no string. */
  @Column({ name: "valor", type: "double precision" })
  valor: number;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
