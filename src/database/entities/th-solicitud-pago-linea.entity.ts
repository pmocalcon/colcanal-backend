import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
} from "typeorm";

/**
 * Una línea de la solicitud de pago: a quién, cuánto y a qué cuenta.
 *
 * Los datos del beneficiario van **copiados**, no resueltos contra `th_personal` al leer.
 * Ver el comentario de `ThSolicitudPago` para el porqué: la solicitud tiene que poder
 * demostrar a qué cuenta se giró aunque la persona haya cambiado de banco después.
 *
 * `personaId` queda solo como rastro de dónde salió la línea —para poder devolverse a la
 * ficha—, y va en nulo en las líneas que se agregan a mano, que no corresponden a nadie
 * de la base de personal.
 */
@Entity("th_solicitud_pago_lineas")
@Index(["solicitudId", "orden"])
export class ThSolicitudPagoLinea {
  @PrimaryGeneratedColumn({ name: "linea_id" })
  lineaId: number;

  @Index()
  @Column({ name: "solicitud_id", type: "int" })
  solicitudId: number;

  /** Posición en el documento. Se reordena solo al regenerar, por nombre. */
  @Column({ type: "int", default: 0 })
  orden: number;

  @Column({ name: "persona_id", type: "int", nullable: true })
  personaId: number | null;

  /** CC, CE, TI, NIT, PA. El archivo del banco lo traduce a su número (1, 2, 4, 3, 5). */
  @Column({ name: "tipo_id", type: "varchar", length: 4, default: "CC" })
  tipoId: string;

  @Index()
  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  /** Como se conoce a la persona: «APELLIDOS NOMBRES», igual que en la ficha. */
  @Column({ type: "varchar", length: 160 })
  nombre: string;

  /**
   * El archivo del banco pide el nombre partido en dos columnas, así que se guarda
   * partido tal como se va a subir. Sale sugerido del nombre completo y se puede
   * corregir; ver `partirNombre` en `pagos.service.ts` para por qué la sugerencia no
   * siempre acierta.
   */
  @Column({ type: "varchar", length: 80, nullable: true })
  nombres: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  apellidos: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  proyecto: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2, default: 0 })
  valor: string;

  /** Nombre de la entidad tal como estaba en el catálogo el día de la solicitud. */
  @Column({ type: "varchar", length: 120, nullable: true })
  banco: string | null;

  /** Su código en el archivo plano. Copiado, no resuelto: el catálogo cambia. */
  @Column({ name: "banco_codigo", type: "int", nullable: true })
  bancoCodigo: number | null;

  /** AHORROS o CORRIENTE. El archivo del banco lo traduce a CA / CC. */
  @Column({ name: "tipo_cuenta", type: "varchar", length: 20, nullable: true })
  tipoCuenta: string | null;

  /** Texto: los números de cuenta empiezan por cero con frecuencia. */
  @Column({ type: "varchar", length: 40, nullable: true })
  cuenta: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  observacion: string | null;
}
