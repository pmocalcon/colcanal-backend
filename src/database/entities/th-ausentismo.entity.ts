import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — ausentismos: los permisos que se conceden y se descuentan.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que `th_personal` y
 * `th_incapacidades`.
 *
 * Es el histórico de «01. Ausentismos.xlsx», que es el mismo hecho que el formato
 * **GTH-009-F (Solicitud de permiso)** de G. de talento humano: el formato es el papel
 * que se firma y esto es el registro de lo ya concedido. Se importa el histórico acá
 * porque son cientos de permisos viejos que nadie va a volver a diligenciar.
 *
 * No confundir con `th_incapacidades`: un permiso lo autoriza la empresa y sale de las
 * horas del empleado; una incapacidad la expide la EPS o la ARL y se le recobra a ella.
 */
@Entity("th_ausentismos")
export class ThAusentismo {
  @PrimaryGeneratedColumn({ name: "ausentismo_id" })
  ausentismoId: number;

  // ── Quién ──
  @Index()
  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  @Column({ type: "varchar", length: 160 })
  nombre: string;

  /**
   * Cargo, área y contrato **al momento del permiso**, copiados y no consultados.
   *
   * Vienen así del archivo, y conviene que se queden: quien pidió el permiso siendo
   * técnico y hoy es coordinador lo pidió como técnico, y resolverlo contra
   * `th_personal` reescribiría el pasado cada vez que alguien asciende.
   */
  @Column({ type: "varchar", length: 120, nullable: true })
  cargo: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  area: string | null;

  @Column({ name: "tipo_contrato", type: "varchar", length: 60, nullable: true })
  tipoContrato: string | null;

  // ── Cuándo ──
  @Index()
  @Column({ name: "fecha_inicio", type: "date", nullable: true })
  fechaInicio: string | null;

  @Column({ name: "fecha_fin", type: "date", nullable: true })
  fechaFin: string | null;

  /**
   * Hora de salida y de regreso, como texto «HH:MM».
   *
   * Texto y no `time` a propósito: en el archivo se anota en reloj de doce horas y sin
   * AM/PM —un permiso de «02:00 a 03:00» es de dos a tres de la tarde—, así que
   * guardarlo como hora del día afirmaría una precisión que el dato no tiene.
   */
  @Column({ name: "hora_salida", type: "varchar", length: 5, nullable: true })
  horaSalida: string | null;

  @Column({ name: "hora_entrada", type: "varchar", length: 5, nullable: true })
  horaEntrada: string | null;

  /** Lo que de verdad se descuenta. Admite medias horas. */
  @Column({ name: "horas_ausencia", type: "numeric", precision: 6, scale: 2, nullable: true })
  horasAusencia: string | null;

  /** Solo cuando el permiso pasa de un día; casi siempre va vacío. */
  @Column({ name: "dias_permiso", type: "int", nullable: true })
  diasPermiso: number | null;

  // ── Por qué ──
  /** CITA MEDICA · PERSONAL · VOTACIÓN · CAPACITACION… Texto libre del archivo. */
  @Index()
  @Column({ type: "varchar", length: 120, nullable: true })
  motivo: string | null;

  /** Si se dejó soporte del permiso. En el archivo es un «SI» suelto. */
  @Column({ type: "varchar", length: 40, nullable: true })
  soporte: string | null;

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
