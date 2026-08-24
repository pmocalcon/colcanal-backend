import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { QueryFailedError } from "typeorm";

const HTTP_STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let error = "Internal Server Error";

    // Handle HTTP exceptions (400, 401, 403, 404, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const statusText = HTTP_STATUS_TEXT[status] ?? "Internal Server Error";

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        error = statusText;
      } else if (typeof exceptionResponse === "object") {
        message =
          (exceptionResponse as any).message ||
          (exceptionResponse as any).error ||
          message;
        error = (exceptionResponse as any).error || statusText;
      }
    }
    // Handle TypeORM database errors
    else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      error = "Database Error";

      // Don't expose internal database errors to the client
      const driverError = (exception as any).driverError;
      const code = driverError?.code;

      switch (code) {
        case "23505": // unique violation
          message = "A record with this information already exists";
          break;
        case "23503": // foreign key violation
          message = "Referenced record does not exist";
          break;
        case "23502": // not null violation
          message = "Required field is missing";
          break;
        case "42P01": // undefined table
          message = "Database configuration error. Please contact support.";
          status = HttpStatus.SERVICE_UNAVAILABLE;
          break;
        default:
          message = "An error occurred while processing your request";
      }

      // Log the actual database error for debugging
      this.logger.error(
        `Database error: ${exception.message}`,
        (exception as any).stack,
      );
    }
    // Handle all other unknown errors
    else {
      // Log the full error for debugging
      this.logger.error(
        `Unhandled exception: ${exception}`,
        (exception as any)?.stack,
      );

      // Return a generic error to the client
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = "Internal Server Error";
      message = "An unexpected error occurred. Please try again later.";
    }

    // Build the error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message: Array.isArray(message) ? message : [message],
    };

    // El nivel se elige por el código, no todo es un error.
    //
    // Antes cada excepción salía como ERROR, incluidos los 401 de una sesión
    // vencida y los 404 de una ruta que no existe. Eso no es una falla del
    // servidor: es comportamiento normal de los clientes. El resultado era que la
    // vista de errores de Render vivía llena de ruido, y un fallo de verdad
    // —un correo que no sale, una consulta que revienta— quedaba enterrado entre
    // sesiones caducadas.
    //
    //   5xx        -> error, que es lo que hay que mirar
    //   400/409/422 -> warn, reglas de negocio que alguien incumplió
    //   401/403/404 -> debug, ruido cotidiano; sigue en el registro completo
    const ruidoCotidiano = status === 401 || status === 403 || status === 404;
    const nivel: 'error' | 'warn' | 'debug' =
      status >= 500 ? 'error' : ruidoCotidiano ? 'debug' : 'warn';

    // A los de 5xx se les deja el detalle completo; a los demás una línea, que
    // es lo que se necesita para seguirles el rastro.
    const resumen =
      nivel === 'error'
        ? `${request.method} ${request.url} - Status: ${status} - Error: ${JSON.stringify(errorResponse)}`
        : `${request.method} ${request.url} - ${status} ${error}`;

    this.logger[nivel](resumen);

    response.status(status).json(errorResponse);
  }
}
