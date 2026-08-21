import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notificaciones")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("estado")
  @ApiOperation({
    summary: "Estado del envío de correo",
    description: `
    Dice si el servidor puede enviar correo ahora mismo: qué proveedor usa, con
    qué remitente y si las credenciales sirven. Comprueba de verdad —pide un
    token a Microsoft— en vez de mirar si las variables están puestas.

    Existe porque hasta ahora la única señal de que el correo estaba roto era que
    alguien dijera "no me llegó", y desde fuera no había forma de saber si el
    problema eran las credenciales, el proveedor o el destinatario.

    No devuelve ningún secreto.
    `,
  })
  @ApiResponse({ status: 200, description: "Estado del servicio de correo" })
  async estado() {
    return this.notificationsService.estadoDelServicio();
  }
}
