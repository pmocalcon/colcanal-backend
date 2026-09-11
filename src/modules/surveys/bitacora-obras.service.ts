import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkLog } from "../../database/entities/work-log.entity";

/** Un movimiento tal como lo cuenta quien lo provoca. */
export interface Anotacion {
  ambito: "obra" | "levantamiento" | "acta";
  workId?: number | null;
  surveyId?: number | null;
  actaId?: number | null;
  /** El carril del acta (`presupuesto`, `cronograma`…) o el bloque del levantamiento. */
  eje?: string | null;
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  comments?: string | null;
  userId?: number | null;
}

/**
 * Deja constancia de cada movimiento de una obra, un levantamiento o un acta.
 *
 * ## Por qué no falla nunca
 *
 * Anotar no puede tumbar la aprobación que se está anotando. Si la escritura falla,
 * el estado ya cambió y devolver un error al usuario es lo peor de los dos mundos:
 * creería que no se aprobó y al reintentar chocaría con «el acta ya está en revisión».
 * Así que el error se registra en el log del servidor —donde se ve— y el trámite sigue.
 *
 * El precio es un hueco en la bitácora, y es asumible porque las columnas de estado
 * siguen siendo la verdad: la auditoría reconstruye de ellas lo que aquí falte, y lo
 * marca como reconstruido en vez de inventar una precisión que no tiene.
 */
@Injectable()
export class BitacoraObrasService {
  private readonly logger = new Logger(BitacoraObrasService.name);

  constructor(
    @InjectRepository(WorkLog)
    private readonly workLogRepository: Repository<WorkLog>,
  ) {}

  async anotar(a: Anotacion): Promise<void> {
    try {
      await this.workLogRepository.insert({
        ambito: a.ambito,
        workId: a.workId ?? null,
        surveyId: a.surveyId ?? null,
        actaId: a.actaId ?? null,
        eje: a.eje ?? null,
        action: a.action,
        previousStatus: a.previousStatus ?? null,
        newStatus: a.newStatus ?? null,
        // Un motivo vacío es lo mismo que no haberlo: no se guarda una cadena en blanco
        // para que la pantalla no muestre un renglón de comentario sin comentario.
        comments: a.comments?.trim() || null,
        userId: a.userId ?? null,
      });
    } catch (e) {
      this.logger.error(
        `No se pudo anotar en la bitácora de obras (${a.ambito} ${a.action}, ` +
          `obra ${a.workId ?? "-"}, acta ${a.actaId ?? "-"}): ${(e as Error).message}`,
      );
    }
  }
}
