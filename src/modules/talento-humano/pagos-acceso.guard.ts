import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../database/entities/user.entity";
import { esRolPmo } from "../../common/constants/roles.constants";
import { ACCESO_SOLO_PAGOS, DESTINO_LIQUIDACION } from "./validacion-nomina.destino";

/**
 * Quién entra a Solicitudes de pago.
 *
 * Es el único sitio de Talento Humano que **no** se cierra por rol, y es a propósito: acá
 * está el archivo que se sube al portal bancario con la cuenta de cada empleado y lo que
 * se le gira. Que lo vea el área entera es más de lo que hace falta —una sola persona
 * hace el giro— y de más gente de la que debería tener esas cifras juntas.
 *
 * Entran tres:
 *
 * - **Quien recibe la liquidación**, que es quien paga. Se resuelve con el mismo
 *   `DESTINO_LIQUIDACION` que decide a quién se le manda el correo, y no con una lista
 *   aparte: son la misma persona por definición, y dos listas se separan tarde o temprano
 *   —alguien cambia una y olvida la otra, y queda recibiendo un correo de algo que no
 *   puede abrir—.
 * - **El PMO**, el comodín transversal del sistema, que es quien arma el documento y quien
 *   tiene que poder revisar que esto funcione.
 * - **Las personas de `ACCESO_SOLO_PAGOS`** (validacion-nomina.destino.ts), que entran a esta pantalla y a ninguna otra
 *   de Talento Humano. No se les da el rol ni la gestión del área: eso les abriría la
 *   base de personal, la nómina y los préstamos de todo el mundo, que no es lo que se
 *   pidió.
 *
 * Ojo con una diferencia frente al correo: allá, si el filtro por nombre no encuentra a
 * nadie, se cae de vuelta a todo el rol —es preferible que el aviso le llegue de más a
 * alguien del área a que no salga—. Acá **no** hay esa caída. Un correo de más se ignora;
 * un acceso de más a las cuentas bancarias de toda la empresa, no. Si la persona sale de
 * la empresa, esto se queda sin nadie hasta que se corrija `DESTINO_LIQUIDACION`, que es
 * el archivo hecho para eso.
 */
/** ¿Esta persona entra a Solicitudes de pago? La usan el guard y quien la necesite. */
export function puedeEntrarAPagos(rol: string | null | undefined, nombre: string | null | undefined): boolean {
  if (esRolPmo(rol ?? undefined)) return true;
  const r = (rol ?? "").trim();
  const n = (nombre ?? "").toLowerCase();
  if (r === DESTINO_LIQUIDACION.rol && n.includes(DESTINO_LIQUIDACION.nombreContiene)) return true;
  return ACCESO_SOLO_PAGOS.some((p) => r === p.rol && n.includes(p.nombreContiene));
}

@Injectable()
export class PagosAccesoGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) throw new ForbiddenException("Necesitas iniciar sesión.");

    const user = await this.userRepo.findOne({
      where: { userId },
      relations: ["role"],
    });
    if (!user?.estado) throw new ForbiddenException("Tu usuario no está activo.");

    if (puedeEntrarAPagos(user.role?.nombreRol, user.nombre)) return true;

    throw new ForbiddenException(
      "Solicitudes de pago es de la Coordinación Financiera que hace el giro. " +
        "Si necesitas el archivo del banco, pídeselo.",
    );
  }
}
