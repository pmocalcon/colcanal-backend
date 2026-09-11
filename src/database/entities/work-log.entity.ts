import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";

/**
 * Bitácora del módulo de obras: cada movimiento de una obra, su levantamiento o su acta.
 *
 * ## Por qué existe
 *
 * Compras tiene `requisition_logs` desde siempre, y por eso su auditoría puede decir
 * **quién** movió una requisición y **cuándo**. Obras no tenía nada equivalente: el
 * estado vive en una columna de la fila y cambiarlo pisa el anterior. Lo que se perdía
 * no era un detalle:
 *
 * - Un acta devuelta por el Director Técnico vuelve a `borrador` y no queda rastro de
 *   que hubiera sido devuelta, ni de por quién, ni con qué reparo.
 * - `presupuesto_status` no tiene fecha ni revisor: el acta dice «aprobado» sin decir
 *   quién lo aprobó.
 * - Un levantamiento rechazado y vuelto a aprobar solo conserva la última revisión.
 *
 * Un histórico que solo sabe el estado de hoy no es un histórico.
 *
 * ## Qué NO es
 *
 * No reemplaza a las columnas de estado: esas siguen mandando y son las que leen las
 * pantallas de trabajo. Esta tabla solo agrega lo que aquellas no pueden guardar —el
 * paso, no la posición—, y se escribe aparte de la transición para que un fallo al
 * anotar nunca tumbe una aprobación.
 */
@Entity("work_logs")
// Las dos consultas que existen son «la historia de esta obra» y «la de esta acta»,
// siempre en orden cronológico.
@Index(["workId", "createdAt"])
@Index(["actaId", "createdAt"])
export class WorkLog {
  @PrimaryGeneratedColumn({ name: "log_id" })
  logId: number;

  /**
   * Sobre qué se movió: `obra`, `levantamiento` o `acta`.
   *
   * Van en una sola tabla porque la pregunta del auditor cruza las tres —«qué pasó con
   * esta obra»— y separarlas obligaría a unir tres bitácoras en cada consulta.
   */
  @Column({ name: "ambito", type: "varchar", length: 20 })
  ambito: "obra" | "levantamiento" | "acta";

  /** La obra afectada. En un movimiento de acta va nulo: el acta agrupa muchas. */
  @Column({ name: "work_id", type: "int", nullable: true })
  workId: number | null;

  @Column({ name: "survey_id", type: "int", nullable: true })
  surveyId: number | null;

  @Column({ name: "acta_id", type: "int", nullable: true })
  actaId: number | null;

  /**
   * Cuál de los frentes se movió.
   *
   * El acta corre por cuatro carriles a la vez —el acta misma, el presupuesto, el
   * cronograma y el permiso de compra anticipada— y cada uno tiene su propio estado y
   * su propio responsable. Sin esto, «aprobado» en la bitácora no diría aprobado por
   * quién ni de qué. En un levantamiento guarda el bloque revisado.
   */
  @Column({ name: "eje", type: "varchar", length: 30, nullable: true })
  eje: string | null;

  @Column({ name: "action", type: "varchar", length: 60 })
  action: string;

  @Column({
    name: "previous_status",
    type: "varchar",
    length: 40,
    nullable: true,
  })
  previousStatus: string | null;

  @Column({ name: "new_status", type: "varchar", length: 40, nullable: true })
  newStatus: string | null;

  /** El motivo del rechazo, el reparo del bloque, la justificación. */
  @Column({ type: "text", nullable: true })
  comments: string | null;

  @Column({ name: "user_id", type: "int", nullable: true })
  userId: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;
}
