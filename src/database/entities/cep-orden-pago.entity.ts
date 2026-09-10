import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Una orden de pago de la fiducia: un giro, del día en que salió.
 *
 * Es el libro diario del que sale el CEP. Cinco columnas del Control de Excedentes no se
 * digitan sino que son la suma de estas órdenes —lo girado a la concesión, la
 * interventoría, las obras, el alumbrado navideño y la energía por medición—, igual que
 * los SUMIFS del archivo de Excel.
 *
 * Va en tabla propia y no dentro del mes por una razón concreta: **una cifra del CEP hay
 * que poder abrirla**. Cuando el municipio pregunta por qué el AOM de agosto fueron
 * cuatrocientos millones, la respuesta son dos órdenes con su fecha, su número y su
 * tercero, no un número que alguien tecleó.
 */
@Entity("cep_ordenes_pago")
// Se consulta siempre igual: las órdenes de un municipio en un mes. El índice va sobre
// las dos, que es como entra la pantalla y como suma el CEP.
@Index(["companyId", "periodo"])
export class CepOrdenPago {
  @PrimaryGeneratedColumn({ name: "orden_id" })
  ordenId: number;

  /** El municipio. Es la empresa del sistema, no el código de dos letras del archivo. */
  @Column({ name: "company_id", type: "int" })
  companyId: number;

  /**
   * El mes del CEP al que se imputa, 'YYYY-MM'.
   *
   * No se deduce de `fecha` y por eso es su propia columna: una orden girada el 11 de
   * febrero puede pagar la factura de enero, y quien decide a qué mes pertenece es quien
   * concilia, no el calendario.
   */
  @Column({ name: "periodo", type: "varchar", length: 7 })
  periodo: string;

  /** El día en que la fiducia giró. */
  @Column({ name: "fecha", type: "date" })
  fecha: string;

  @Column({ name: "valor", type: "numeric", precision: 18, scale: 2 })
  valor: string;

  /**
   * Por qué se giró, con el texto exacto de CONCEPTO.
   *
   * El texto es lo que empareja la orden con su columna del CEP. Una orden con el
   * concepto escrito de otra forma no suma en ninguna parte y no avisa: por eso la
   * pantalla lo ofrece en una lista y no en una casilla libre.
   */
  @Column({ name: "concepto", type: "varchar", length: 60 })
  concepto: string;

  /** Factura, retención o anticipo. Informativo: no entra en ninguna suma del CEP. */
  @Column({ name: "tipo", type: "varchar", length: 30, nullable: true })
  tipo: string | null;

  @Column({ name: "numero_orden", type: "varchar", length: 40, nullable: true })
  numeroOrden: string | null;

  /** Lo que dice la orden: «FACTURA ENERO 2025», «INTERVENTORIA DICIEMBRE». */
  @Column({ name: "detalle", type: "varchar", length: 300, nullable: true })
  detalle: string | null;

  /** A quién se le giró. */
  @Column({ name: "tercero", type: "varchar", length: 200, nullable: true })
  tercero: string | null;

  @Column({ name: "numero_orden_municipio", type: "varchar", length: 40, nullable: true })
  numeroOrdenMunicipio: string | null;

  @Column({ name: "fecha_orden", type: "date", nullable: true })
  fechaOrden: string | null;

  @Column({ name: "fecha_recepcion", type: "date", nullable: true })
  fechaRecepcion: string | null;

  @Column({ name: "fecha_ingreso_cuenta", type: "date", nullable: true })
  fechaIngresoCuenta: string | null;

  /** Quién la registró. Es plata de un municipio: hay que poder preguntarle a alguien. */
  @Column({ name: "created_by", type: "int", nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
