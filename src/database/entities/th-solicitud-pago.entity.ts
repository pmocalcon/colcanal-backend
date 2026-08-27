import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — solicitud de pago (hoja «Solicitud de pagos» del formato del banco).
 *
 * Es el documento interno con el que Talento Humano le pide a Tesorería que disperse: la
 * fecha, el concepto y el detalle de a quién se le consigna cuánto, a qué banco y a qué
 * cuenta. De ese mismo detalle sale el **archivo plano que se sube al portal bancario**
 * (hoja «Banco»), que no es otro documento sino el mismo con las columnas que el banco
 * pide y en su orden.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas, igual que el resto de las `th_*`.
 *
 * **Es una fotografía, no una vista**, por la misma razón que `ThNominaLiquidacion`: si
 * mañana alguien cambia de cuenta en su ficha, la solicitud con la que se pagó el mes
 * pasado tiene que seguir mostrando la cuenta a la que efectivamente se giró. Por eso las
 * líneas copian banco, cuenta y nombre en vez de resolverlos al leerlas.
 */
@Entity("th_solicitudes_pago")
export class ThSolicitudPago {
  @PrimaryGeneratedColumn({ name: "solicitud_id" })
  solicitudId: number;

  /** La fecha del documento: cuándo se pide el pago, no cuándo se creó la fila. */
  @Column({ type: "date" })
  fecha: string;

  /** «Nómina», «Prima», «Liquidación», «Proveedores»… Texto libre a propósito. */
  @Column({ type: "varchar", length: 120, default: "Nómina" })
  concepto: string;

  /**
   * `YYYY-MM` del periodo de nómina del que salió, cuando salió de uno. Va vacío en las
   * solicitudes armadas a mano, que también existen: no todo lo que se disperse es
   * nómina.
   */
  @Index()
  @Column({ type: "varchar", length: 7, nullable: true })
  periodo: string | null;

  /**
   * BORRADOR → ENVIADA → PAGADA.
   *
   * Solo el borrador se puede editar y regenerar; una vez enviada a Tesorería, cambiar
   * las cifras por debajo dejaría al documento diciendo algo distinto de lo que se
   * autorizó.
   */
  @Column({ type: "varchar", length: 20, default: "BORRADOR" })
  estado: string;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @Column({ name: "creado_por", type: "varchar", length: 160, nullable: true })
  creadoPor: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
