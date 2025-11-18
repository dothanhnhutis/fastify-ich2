import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import { StatusCodes } from "http-status-codes";
import env from "../config/env";

interface ICustomError<
  D extends Record<string, unknown> = Record<string, unknown>
> {
  error: string;
  message: string;
  statusCode: number;
  details?: D;
}

export class CustomError<
    D extends Record<string, unknown> = Record<string, unknown>
  >
  extends Error
  implements ICustomError<D>
{
  error: string;
  statusCode: number;
  details?: D;

  constructor({ error, message, statusCode, details }: ICustomError<D>) {
    super(message);
    this.name = new.target.name;
    this.error = error;
    this.statusCode = statusCode;
    this.details = details;

    // Giữ stack trace gọn khi chạy trong Node
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  serialize(): Omit<ICustomError<D>, "level"> {
    return {
      error: this.error,
      statusCode: this.statusCode,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

export class BadRequestError extends CustomError {
  constructor(message: string, error: string = "BadRequestError") {
    super({
      error,
      message,
      statusCode: StatusCodes.BAD_REQUEST,
    });
  }
}

export class NotAuthorizedError extends CustomError {
  constructor(
    message: string = "Authentication failed",
    error: string = "UNAUTHORIZED"
  ) {
    super({
      error,
      message,
      statusCode: StatusCodes.UNAUTHORIZED,
    });
  }
}

export class PermissionError extends CustomError {
  constructor(message = "Permission denied", error: string = "FORBIDDEN") {
    super({
      error,
      message,
      statusCode: StatusCodes.FORBIDDEN,
    });
  }
}
export class InternalServerError extends CustomError {
  constructor(
    message = "Internal server error",
    error: string = "INTERNAL_SERVER_ERROR"
  ) {
    super({
      error,
      message,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    });
  }
}

export interface PostgresError extends Error {
  severity: string;
  code: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: string;
  routine?: string;
}

export function isPostgresError(err: unknown): err is PostgresError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  if (typeof error === "string") {
    return error;
  }
  return "An error occurred";
}

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // validate input
  if (hasZodFastifySchemaValidationErrors(error)) {
    error;
    return reply.code(400).send({
      error: "Response Validation Error",
      message: "Request doesn't match the schema",
      statusCode: 400,
      details: {
        issues: error.validation,
        method: request.method,
        url: request.url,
      },
    });
  }
  // validate output
  if (isResponseSerializationError(error)) {
    return reply.code(500).send({
      error: "Internal Server Error",
      message: "Response doesn't match the schema",
      statusCode: 500,
      details: {
        issues: error.cause.issues,
        method: error.method,
        url: error.url,
      },
    });
  }

  // if (error.code === "FST_ERR_VALIDATION" && error.validation) {
  //   return reply.status(StatusCodes.BAD_REQUEST).send({
  //     statusText: "BAD_REQUEST",
  //     statusCode: StatusCodes.BAD_REQUEST,
  //     data: {
  //       message: error.validation[0].message ?? "Validate error",
  //     },
  //   });
  // }

  // debug mode
  if (reply.sent || reply.raw?.headersSent || env.DEBUG) {
    return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send(error);
  }

  // app error
  //   if (error instanceof DatabaseError) {
  //     const err = error.serialize();
  //     return reply.status(err.statusCode).send({
  //       error: err.error,
  //       statusCode: err.statusCode,
  //       message: err.message,
  //     });
  //   } else if (error instanceof CustomError) {
  //     return reply.status(error.statusCode).send(error.serialize());
  //   }

  if (error instanceof CustomError) {
    return reply.status(error.statusCode).send(error.serialize());
  }

  // unknown error
  reply.status(500).send({
    statusText: "INTERNAL_SERVER_ERROR",
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    data: {
      message:
        getErrorMessage(error) ||
        "An error occurred. Please view logs for more details",
    },
  });
}
