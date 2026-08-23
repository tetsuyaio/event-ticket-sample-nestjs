import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

interface ErrorBody {
  code?: string;
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const value: string | object | undefined =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body: ErrorBody =
      typeof value === "object" && value !== null ? value : {};
    const validation = status === 400 && Array.isArray(body.message);
    response.status(status).json({
      statusCode: status,
      code:
        body.code ??
        (validation ? "VALIDATION_ERROR" : this.defaultCode(status)),
      message:
        body.message ??
        (status === 500
          ? "Internal server error"
          : typeof value === "string"
            ? value
            : "Request failed"),
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private defaultCode(status: number): string {
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    return "HTTP_ERROR";
  }
}
