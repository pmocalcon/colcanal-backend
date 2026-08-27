import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Talento humano — base de personal.
 *
 * Tabla nueva y AISLADA, sin llaves foráneas: crear una tabla es aditivo y seguro con
 * synchronize:true, igual que el patrón de las entidades CREG y de `gc_solicitudes`.
 *
 * Arranca importando "Base de personal 2026.xlsx" y de ahí en adelante se vive acá: el
 * Excel deja de ser la fuente.
 *
 * **La identificación no es única a propósito.** Es la llave natural y así se busca, pero
 * en el archivo hay cédulas repetidas —una persona que salió y volvió a entrar— y una
 * restricción única haría fallar la importación completa por un caso que el negocio
 * considera válido.
 */
@Entity("th_personal")
export class ThPersona {
  @PrimaryGeneratedColumn({ name: "persona_id" })
  personaId: number;

  /** ACTIVO / INACTIVO. Texto libre: el archivo trae variantes con espacios. */
  @Column({ type: "varchar", length: 40, nullable: true })
  estado: string | null;

  @Column({ name: "tipo_contrato", type: "varchar", length: 60, nullable: true })
  tipoContrato: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  ubicacion: string | null;

  /** Empresa o proyecto al que está cargada la persona (CANALES, una UTAP…). */
  @Column({ name: "empresa_proyecto", type: "varchar", length: 120, nullable: true })
  empresaProyecto: string | null;

  @Index()
  @Column({ type: "varchar", length: 30 })
  identificacion: string;

  /**
   * CC, CE, TI, NIT o PA. Va en nulo en casi todo el mundo y se lee como CC, que es lo
   * que es el 99 % de la base; existe porque el archivo plano del banco pide el tipo de
   * documento como un número y una cédula de extranjería girada como cédula se rechaza.
   */
  @Column({ name: "tipo_id", type: "varchar", length: 4, nullable: true })
  tipoId: string | null;

  @Index()
  @Column({ type: "varchar", length: 160 })
  nombre: string;

  /**
   * La fecha de nacimiento, **no la edad**.
   *
   * La edad se calcula al mostrarla. Guardada quedaría mal al año siguiente, y una ficha
   * que envejece sola es peor que una sin el dato: nadie sospecha de un número que está
   * ahí escrito.
   */
  @Column({ name: "fecha_nacimiento", type: "date", nullable: true })
  fechaNacimiento: string | null;

  /** Correo personal o corporativo. Es por donde se le mandan desprendibles y avisos. */
  @Column({ type: "varchar", length: 160, nullable: true })
  correo: string | null;

  /** Texto libre y no un enum: los formatos oficiales piden distintas categorías. */
  @Column({ type: "varchar", length: 20, nullable: true })
  sexo: string | null;

  @Column({ name: "estado_civil", type: "varchar", length: 30, nullable: true })
  estadoCivil: string | null;

  /** Cuántos hijos tiene. Lo piden la caja de compensación y los formatos de bienestar. */
  @Column({ type: "int", nullable: true })
  hijos: number | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  cargo: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  area: string | null;

  /** OPERACIÓN / ADMINISTRATIVO. */
  @Column({ name: "operacion_fge", type: "varchar", length: 60, nullable: true })
  operacionFge: string | null;

  /** Centro de costo abreviado del archivo: OP, AD, PS. */
  @Column({ name: "centro_costo", type: "varchar", length: 20, nullable: true })
  centroCosto: string | null;

  @Column({ name: "tipo_gasto", type: "varchar", length: 20, nullable: true })
  tipoGasto: string | null;

  /**
   * Cuándo empezó. Es la **fecha del contrato inicial**: si la persona salió y volvió,
   * el archivo abre una ficha nueva en vez de pisar la anterior.
   */
  @Column({ name: "fecha_ingreso", type: "date", nullable: true })
  fechaIngreso: string | null;

  /**
   * Cuándo se vence el contrato. Solo aplica a término fijo y a prestación de servicios:
   * un indefinido no vence, y ahí queda en nulo —que es distinto de «no se sabe»—.
   */
  @Column({ name: "fecha_vencimiento_contrato", type: "date", nullable: true })
  fechaVencimientoContrato: string | null;

  /**
   * Si el contrato está firmado por las dos partes.
   *
   * Nulo es «no se ha revisado», que no es lo mismo que «no está firmado»: uno es una
   * tarea de Talento Humano y el otro es un riesgo laboral abierto.
   */
  @Column({ name: "contrato_firmado", type: "boolean", nullable: true })
  contratoFirmado: boolean | null;

  /** Otrosí y modificatorios: qué se le cambió al contrato y cuándo. */
  @Column({ name: "otro_si", type: "text", nullable: true })
  otroSi: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  escalafon: string | null;

  @Column({ name: "formacion_profesional", type: "varchar", length: 80, nullable: true })
  formacionProfesional: string | null;

  /*
   * Remuneración **vigente**, no la historia.
   *
   * El archivo trae bloques de 2024, 2025 y 2026, pero los dos primeros están llenos de
   * `#REF!` —fórmulas rotas apuntando a hojas que ya no existen—, así que importarlos
   * sería traer basura con apariencia de dato. Se importa el bloque vigente y la historia
   * se queda en el Excel, que es donde está (rota) hoy.
   */
  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  salario: string | null;

  @Column({ name: "auxilio_transporte", type: "numeric", precision: 14, scale: 2, nullable: true })
  auxilioTransporte: string | null;

  @Column({ name: "auxilio_rodamiento", type: "numeric", precision: 14, scale: 2, nullable: true })
  auxilioRodamiento: string | null;

  @Column({ name: "total_salarios", type: "numeric", precision: 14, scale: 2, nullable: true })
  totalSalarios: string | null;

  /**
   * Cuota mensual de la póliza funeraria (Grupo Recordar).
   *
   * Es un **descuento**, no una parte del salario: no entra en `total_salarios` ni en el
   * costo total. Alimenta la columna «SERVICIOS GRUPORECORDAR» de la nómina, donde antes
   * había que digitarla mes a mes aunque sea la misma cifra todos los meses. Lo que se
   * escriba en la novedad del periodo sigue mandando sobre esto.
   */
  @Column({ name: "poliza_funeraria", type: "numeric", precision: 14, scale: 2, nullable: true })
  polizaFuneraria: string | null;

  /**
   * Si la persona aporta al Fondo de Solidaridad Pensional: `"SI"`, `"NO"`, o vacío
   * para que lo decida el IBC del mes (desde 4 SMMLV, Ley 100 art. 27).
   *
   * Existe porque el umbral no siempre alcanza a decidirlo bien: quien trabaja parte del
   * mes puede quedar justo por debajo, y hay casos que Talento Humano sabe de antemano.
   * Solo dice **si aplica**, no cuánto: el valor lo sigue calculando la nómina sobre el
   * salario y los días, para que no se quede viejo cuando cualquiera de los dos cambie.
   */
  @Column({ name: "fsp_modo", type: "varchar", length: 12, nullable: true })
  fspModo: string | null;

  /**
   * Si se le descuenta salud y pensión (4 % del IBC cada una).
   *
   * Van en `true` porque es lo normal; se apagan para los casos en que la ley no lo
   * exige —un pensionado activo no cotiza a pensión, y hay figuras de contrato que no
   * cotizan salud por nómina—. Apagarlo no exime a la empresa de su parte: acá solo se
   * lleva lo que se le descuenta al empleado.
   */
  @Column({ name: "aporta_salud", type: "boolean", default: true })
  aportaSalud: boolean;

  @Column({ name: "aporta_pension", type: "boolean", default: true })
  aportaPension: boolean;

  /**
   * Cuándo dejó de trabajar. Solo tiene sentido cuando `estado` es INACTIVO.
   *
   * Se guarda en vez de deducirla de cuándo se marcó inactiva la ficha porque no son lo
   * mismo: la baja se registra en el sistema días después de que la persona se fue, y la
   * que cuenta para liquidación y certificados laborales es la real.
   */
  @Column({ name: "fecha_salida", type: "date", nullable: true })
  fechaSalida: string | null;

  // ── Cuenta para el pago de la nómina ──

  @Column({ type: "varchar", length: 80, nullable: true })
  banco: string | null;

  /**
   * Texto y no número: los números de cuenta empiezan por cero con frecuencia y guardarlos
   * como cifra se los come. Tampoco se opera con ellos.
   */
  @Column({ type: "varchar", length: 40, nullable: true })
  cuenta: string | null;

  /** AHORROS o CORRIENTE. */
  @Column({ name: "tipo_cuenta", type: "varchar", length: 20, nullable: true })
  tipoCuenta: string | null;

  /*
   * El nombre partido en dos, como lo pide el archivo plano del banco.
   *
   * `nombre` viene «APELLIDOS NOMBRES» en una sola cadena y partirla bien no siempre se
   * puede adivinar: «CASTILLO JORGE EDUARDO» es un apellido y dos nombres, y «CHAMORRO
   * CARVAJAL CARLOS» son dos apellidos y un nombre — las dos tienen tres palabras. La
   * nómina propone un corte y esto guarda la corrección **una sola vez**, para no volver
   * a hacerla cada mes. Vacío significa «usa lo que propongas».
   */
  @Column({ type: "varchar", length: 80, nullable: true })
  nombres: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  apellidos: string | null;

  /** Tarifa de riesgo ARL. Fracción, no porcentaje: 0.0435 es el 4,35 %. */
  @Column({ name: "nivel_riesgo", type: "numeric", precision: 8, scale: 6, nullable: true })
  nivelRiesgo: string | null;

  /**
   * La clase de riesgo del decreto 1607: I a V.
   *
   * Va aparte de `nivelRiesgo`, que es la **tarifa** que se paga. No son lo mismo y no se
   * deducen la una de la otra: dentro de una misma clase la tarifa se mueve por
   * cotización, y es la clase la que aparece en los formatos de la ARL.
   */
  @Column({ name: "clase_riesgo", type: "varchar", length: 6, nullable: true })
  claseRiesgo: string | null;

  /** ARL, EPS, fondo de pensiones y caja de compensación a los que está afiliado. */
  @Column({ type: "varchar", length: 80, nullable: true })
  arl: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  eps: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  afp: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  ccf: string | null;

  /**
   * Formación en trabajo en alturas.
   *
   * Es texto y no una casilla porque hay tres respuestas distintas —la tiene, no la
   * tiene, o el cargo no la necesita— y aplanarlas a sí/no haría que un auxiliar
   * administrativo apareciera igual de incumplido que un técnico sin certificar.
   */
  @Column({ name: "trabajo_altura", type: "varchar", length: 40, nullable: true })
  trabajoAltura: string | null;

  /**
   * Días de vacaciones pendientes.
   *
   * Se guarda en vez de calcularse porque el saldo viene de años que el sistema no tiene:
   * `th_vacaciones` está vacía y arrancar el conteo desde la fecha de ingreso le pondría
   * a todo el mundo el acumulado completo, como si nunca hubiera salido a vacaciones.
   * El día que el módulo de vacaciones tenga la historia, esto se reemplaza por el
   * cálculo —causadas menos disfrutadas— y deja de digitarse a mano.
   */
  @Column({ name: "dias_vacaciones_pendientes", type: "int", nullable: true })
  diasVacacionesPendientes: number | null;

  /** Fracción, no porcentaje: 0.3783 es el 37,83 %. Así viene del archivo. */
  @Column({ name: "carga_prestacional_pct", type: "numeric", precision: 8, scale: 6, nullable: true })
  cargaPrestacionalPct: string | null;

  @Column({ name: "carga_prestacional", type: "numeric", precision: 14, scale: 2, nullable: true })
  cargaPrestacional: string | null;

  @Column({ name: "costo_total", type: "numeric", precision: 14, scale: 2, nullable: true })
  costoTotal: string | null;

  /** Año al que corresponden las cifras de arriba. */
  @Column({ name: "anio_vigencia", type: "int", nullable: true })
  anioVigencia: number | null;

  @Column({ type: "text", nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
