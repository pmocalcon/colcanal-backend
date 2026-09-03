import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — vacaciones ya aprobadas.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que las demás `th_*`.
 *
 * Nace cuando Gerencia aprueba el formato **GTH-018-F** (G. de talento humano): el
 * formato es el papel que recorre los cuatro recuadros de "APROBACIÓN"; esto es el
 * registro de lo ya concedido, con los días y valores que confirmó Recursos Humanos
 * (bloque "USO EXCLUSIVO ÁREA RECURSOS HUMANOS" del propio papel), que pueden no ser
 * los mismos que pidió el empleado arriba.
 */
@Entity("th_vacaciones")
export class ThVacacion {
  @PrimaryGeneratedColumn({ name: "vacacion_id" })
  vacacionId: number;

  @Index()
  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  @Index()
  @Column({ type: "varchar", length: 160 })
  nombre: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  cargo: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  area: string | null;

  @Column({ name: "fecha_ingreso", type: "date", nullable: true })
  fechaIngreso: string | null;

  /** «06/2024 a 05/2025», tal como lo arma el propio formato. */
  @Column({ name: "periodo_causado", type: "varchar", length: 60, nullable: true })
  periodoCausado: string | null;

  @Column({ name: "fecha_inicio", type: "date", nullable: true })
  fechaInicio: string | null;

  @Column({ name: "fecha_final", type: "date", nullable: true })
  fechaFinal: string | null;

  @Column({ name: "dias_disfrutar", type: "int", nullable: true })
  diasDisfrutar: number | null;

  @Column({ name: "dias_compensar", type: "int", nullable: true })
  diasCompensar: number | null;

  /** Los del periodo que no se disfrutan ni se compensan y quedan pendientes. */
  @Column({ name: "dias_pendientes", type: "int", nullable: true })
  diasPendientes: number | null;

  @Column({ name: "valor_prima", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorPrima: string | null;

  @Column({ name: "valor_anticipo", type: "numeric", precision: 14, scale: 2, nullable: true })
  valorAnticipo: string | null;

  @Column({ name: "fecha_pago", type: "date", nullable: true })
  fechaPago: string | null;

  @Column({ name: "fecha_aprobacion", type: "date", nullable: true })
  fechaAprobacion: string | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  /**
   * La solicitud de Gestión del Conocimiento que originó este registro, cuando vino de
   * un formato aprobado. Nulo en lo importado del archivo histórico y en lo que se
   * digita a mano.
   *
   * Existe para poder deshacerlo: al anular el formato, este registro se borra. Sin él
   * habría que salir a buscarlo por el texto de las observaciones.
   *
   * Es un `int` suelto y no una relación, a propósito: producción corre con
   * `synchronize: true` y una llave foránea nueva reescribe restricciones en caliente.
   */
  @Column({ name: "solicitud_id", type: "int", nullable: true })
  solicitudId: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
