import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — novedades de nómina: lo que Recursos Humanos digita a mano cada mes
 * por empleado antes de liquidar (hoja "NOVEDADES NÓMINA" del Excel de nómina).
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que las demás `th_*`. Una fila por
 * **persona** (no por identificación) y periodo — el resto de columnas de esa hoja
 * (proyecto, salario, auxilio de rodamiento, préstamo, riesgo) no se guardan acá: se leen
 * en vivo de `th_personal` y `th_prestamos` al generar la nómina, para no tener el mismo
 * dato escrito dos veces y que se desactualice.
 *
 * **La llave es `personaId`, no `identificacion`.** Hay personas con contrato activo en
 * varias empresas del grupo a la vez (misma cédula, distinto `persona_id` en
 * `th_personal` — uno por cargo/proyecto), y cada una necesita su propia novedad: los
 * días trabajados o la bonificación de un proyecto no son los del otro. `identificacion`
 * se guarda igual, solo para mostrar y para cruces que sí son por persona natural (como
 * la cartera de préstamos, que no distingue proyecto).
 *
 * **Incapacidad Empresa e Incapacidad Empleado son de digitación directa**, igual que en
 * el Excel: ahí esas dos columnas casi siempre están vacías y solo se llenan a mano,
 * fila por fila, cuando a alguien le tocó incapacidad ese mes — no hay una fórmula que
 * las derive de un número de días en toda la hoja.
 */
@Entity("th_novedades_nomina")
@Index(["periodo", "personaId"])
export class ThNovedadNomina {
  @PrimaryGeneratedColumn({ name: "novedad_id" })
  novedadId: number;

  /** "2026-08": el mes que se está liquidando. */
  @Index()
  @Column({ type: "varchar", length: 7 })
  periodo: string;

  /** El registro de `th_personal` al que pertenece esta novedad. */
  @Index()
  @Column({ name: "persona_id", type: "int" })
  personaId: number;

  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  @Column({ type: "varchar", length: 160 })
  nombre: string;

  @Column({ name: "dias_trabajados", type: "int", default: 30 })
  diasTrabajados: number;

  /**
   * Lo liquidado en horas extras del periodo, en pesos. Se digita a mano y no se cruza
   * con `th_horas_extras`: esa tabla no comparte el mismo formato de periodo (ahí es
   * texto libre del formato GTH-016-F) y cruzarlas por texto habría arriesgado un
   * doble conteo silencioso. Recursos Humanos lo copia de la pantalla de Horas extras.
   */
  @Column({ name: "horas_extras_valor", type: "numeric", precision: 14, scale: 2, nullable: true })
  horasExtrasValor: string | null;

  @Column({ name: "recargo_nocturno_valor", type: "numeric", precision: 14, scale: 2, nullable: true })
  recargoNocturnoValor: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  bonificaciones: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  embargo: string | null;

  @Column({ name: "incapacidad_empresa", type: "numeric", precision: 14, scale: 2, nullable: true })
  incapacidadEmpresa: string | null;

  @Column({ name: "incapacidad_empleado", type: "numeric", precision: 14, scale: 2, nullable: true })
  incapacidadEmpleado: string | null;

  @Column({ name: "incapacidad_otros", type: "numeric", precision: 14, scale: 2, nullable: true })
  incapacidadOtros: string | null;

  @Column({ name: "vacaciones_habiles", type: "numeric", precision: 14, scale: 2, nullable: true })
  vacacionesHabiles: string | null;

  @Column({ name: "vacaciones_no_habiles", type: "numeric", precision: 14, scale: 2, nullable: true })
  vacacionesNoHabiles: string | null;

  @Column({ name: "retencion_fuente", type: "numeric", precision: 14, scale: 2, nullable: true })
  retencionFuente: string | null;

  @Column({ name: "servicios_gruporecordar", type: "numeric", precision: 14, scale: 2, nullable: true })
  serviciosGruporecordar: string | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
