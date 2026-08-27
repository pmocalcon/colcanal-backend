import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — constancia de que la liquidación de un periodo se mandó a Financiera.
 *
 * Una fila por periodo, y por eso `periodo` es único: mandar la nómina del mismo mes dos
 * veces es un accidente, no una operación —Financiera terminaría con dos versiones y sin
 * saber cuál pagar—. Para volver a mandarla hay que borrar la constancia a propósito.
 *
 * Guarda a quién se le mandó y por cuánto **en el momento del envío**. Que quede el
 * total y el número de empleados, y no solo la fecha, es lo que permite responder después
 * «¿esto que llegó es lo mismo que se mandó?» sin depender de que la liquidación no se
 * haya tocado.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que el resto de las `th_*`.
 */
@Entity("th_envios_nomina")
export class ThEnvioNomina {
  @PrimaryGeneratedColumn({ name: "envio_id" })
  envioId: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 7 })
  periodo: string;

  /** A quién le llegó, separado por «; ». Copiado: los correos cambian. */
  @Column({ type: "text", nullable: true })
  destinatarios: string | null;

  @Column({ type: "int", default: 0 })
  empleados: number;

  @Column({ name: "total_neto", type: "numeric", precision: 14, scale: 2, default: 0 })
  totalNeto: string;

  @Column({ name: "enviado_por", type: "varchar", length: 160, nullable: true })
  enviadoPor: string | null;

  @Column({ name: "enviado_en", type: "timestamptz", nullable: true })
  enviadoEn: Date | null;

  /**
   * `false` cuando el correo no salió —no hay proveedor configurado, o Microsoft lo
   * rechazó—. La constancia se guarda igual: hay que poder ver que se intentó y falló,
   * en vez de que el envío desaparezca sin dejar rastro.
   */
  @Column({ name: "correo_enviado", type: "boolean", default: false })
  correoEnviado: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
