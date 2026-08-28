import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred. Please try again or contact support.';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || message;
        errors = (res as any).errors || null;
      }
    } else if (exception instanceof ZodError || (exception as any)?.name === 'ZodError') {
      status = HttpStatus.BAD_REQUEST;
      const issues = (exception as any).issues || (exception as ZodError).errors || [];
      message = issues.length > 0 ? issues[0].message : 'Validation failed';
      errors = issues;
    } else if ((exception as any)?.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      message = 'A record with these unique details already exists in the system.';
    } else {
      this.logger.error('Unhandled Server Exception:', exception);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: Array.isArray(message) ? message[0] : message,
      errors: errors
    });
  }
}
