import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // Handle HTTP exceptions (400, 401, 403, 404, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message =
          (exceptionResponse as any).message ||
          (exceptionResponse as any).error ||
          message;
        error = (exceptionResponse as any).error || error;
      }
    }
    // Handle TypeORM database errors
    else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Error';

      // Don't expose internal database errors to the client
      const driverError = (exception as any).driverError;
      const code = driverError?.code;

      switch (code) {
        case '23505': // unique violation
          message = 'A record with this information already exists';
          break;
        case '23503': // foreign key violation
          message = 'Referenced record does not exist';
          break;
        case '23502': // not null violation
          message = 'Required field is missing';
          break;
        case '42P01': // undefined table
          message = 'Database configuration error. Please contact support.';
          status = HttpStatus.SERVICE_UNAVAILABLE;
          break;
        default:
          message = 'An error occurred while processing your request';
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
      error = 'Internal Server Error';
      message = 'An unexpected error occurred. Please try again later.';
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

    // Log the error with request context
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Error: ${JSON.stringify(errorResponse)}`,
    );

    response.status(status).json(errorResponse);
  }
}
