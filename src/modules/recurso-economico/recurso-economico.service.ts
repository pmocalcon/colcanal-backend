import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RecursoEconomico } from "../../database/entities/recurso-economico.entity";
import { Company } from "../../database/entities/company.entity";

/** Un proyecto dentro de un año: quién interventora y por cuánto. */
export interface ProyectoAnio {
  /** Firma interventora del año. */
  firma?: string;
  /** Número de salarios mínimos del contrato. */
  smlv?: number | null;
  /** true si el contrato se factura con IVA. */
  iva?: boolean;
  /**
   * Valor escrito a mano. Solo se usa cuando el contrato no sale de SMLV × SMMLV
   * (un otrosí, un valor pactado en firme). Vacío = se calcula.
   */
  valorManual?: number | null;
}

export interface RetencionProyecto {
  /** % de retención en la fuente. `null` = no aplica en ese municipio. */
  rteFte?: number | null;
  rteIca?: number | null;
  timbre?: number | null;
  estampillas?: number | null;
}

/**
 * Los proyectos del módulo, en el orden del cuadro de interventoría.
 *
 * No son todas las empresas del sistema: Canales & Contactos, Inversiones Garcés
 * Escalante y Uniones y Alianzas no son concesiones de alumbrado, y Jamundí
 * todavía no tiene contrato de interventoría. La lista se fija aquí para que la
 * tabla sea la del cuadro y no una lista que crece sola.
 *
 * `buscar` empareja contra el nombre de la empresa sin tildes ni mayúsculas: los
 * datos siguen guardándose por companyId, así que cambiar una etiqueta no mueve
 * ningún valor.
 */
const PROYECTOS: { etiqueta: string; buscar: string }[] = [
  { etiqueta: "El Cerrito", buscar: "el cerrito" },
  { etiqueta: "Circasia", buscar: "circasia" },
  { etiqueta: "Guacarí", buscar: "guacari" },
  { etiqueta: "Puerto Asís", buscar: "puerto asis" },
  { etiqueta: "Quimbaya", buscar: "quimbaya" },
  { etiqueta: "Santa Bárbara", buscar: "santa barbara" },
  { etiqueta: "Jericó", buscar: "jerico" },
  { etiqueta: "Ciudad Bolívar", buscar: "ciudad bolivar" },
  { etiqueta: "Tarso", buscar: "tarso" },
  // "Pueblorico" va con una R por decisión del negocio, aunque la empresa esté
  // registrada con dos: por eso se busca por el prefijo y no por el nombre.
  { etiqueta: "Pueblorico", buscar: "pueblor" },
];

/** Sin tildes, en minúsculas y con los espacios colapsados. */
const normalizar = (s: string): string =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

@Injectable()
export class RecursoEconomicoService {
  constructor(
    @InjectRepository(RecursoEconomico)
    private readonly repo: Repository<RecursoEconomico>,
    @InjectRepository(Company)
    private readonly companies: Repository<Company>,
  ) {}

  /**
   * La fila única del módulo. Se crea vacía la primera vez que alguien entra, en
   * vez de exigir un seed: el módulo nace usable.
   */
  private async fila(): Promise<RecursoEconomico> {
    const existente = await this.repo.findOne({ where: {}, order: { recursoId: "ASC" } });
    if (existente) return existente;
    return this.repo.save(this.repo.create({ data: {} }));
  }

  async get(): Promise<{
    data: Record<string, any>;
    empresas: { companyId: number; name: string }[];
    sinEmpresa: string[];
  }> {
    const fila = await this.fila();
    const empresas = await this.companies.find();

    // Se recorre PROYECTOS y no las empresas: así la tabla sale en el orden del
    // cuadro y no en el que la base devuelva.
    const encontradas: { companyId: number; name: string }[] = [];
    const sinEmpresa: string[] = [];
    for (const p of PROYECTOS) {
      const match = empresas.find((c) => normalizar(c.name).includes(p.buscar));
      if (match) encontradas.push({ companyId: match.companyId, name: p.etiqueta });
      // Un proyecto del cuadro que no tenga empresa se reporta en vez de
      // desaparecer sin más: su fila no se puede guardar contra ningún id.
      else sinEmpresa.push(p.etiqueta);
    }
    return { data: fila.data ?? {}, empresas: encontradas, sinEmpresa };
  }

  /**
   * Valor mensual de interventoría, por año y proyecto, para el Flujo de Caja.
   *
   * Se calcula aquí y no en el cliente para que el FCM no tenga que conocer las
   * reglas del módulo (SMLV, IVA, valor pactado): recibe una cifra por año y ya.
   */
  async interventoria(): Promise<Record<string, Record<string, number>>> {
    const fila = await this.fila();
    const anios = (fila.data ?? {}).anios ?? {};
    const salida: Record<string, Record<string, number>> = {};
    for (const [anio, contenido] of Object.entries<any>(anios)) {
      const smmlv = Number(contenido?.smmlv) || 0;
      const porProyecto: Record<string, number> = {};
      for (const [companyId, p] of Object.entries<any>(contenido?.proyectos ?? {})) {
        const manual = Number(p?.valorManual);
        if (Number.isFinite(manual) && manual > 0) { porProyecto[companyId] = manual; continue; }
        const smlv = Number(p?.smlv);
        if (!Number.isFinite(smlv) || smlv <= 0 || smmlv <= 0) continue;
        porProyecto[companyId] = Math.round(smlv * smmlv * (p?.iva ? 1.19 : 1));
      }
      if (Object.keys(porProyecto).length) salida[anio] = porProyecto;
    }
    return salida;
  }

  async save(data: Record<string, any>): Promise<{ data: Record<string, any> }> {
    const fila = await this.fila();
    fila.data = data ?? {};
    const guardada = await this.repo.save(fila);
    return { data: guardada.data };
  }
}
