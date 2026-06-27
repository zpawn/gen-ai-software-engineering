import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from './errors.js';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // JSON Schema validation errors from ajv
  if (error.validation) {
    const details = error.validation.map((v) => ({
      field: v.instancePath?.replace(/^\//, '') || v.params?.missingProperty || 'unknown',
      message: v.message ?? 'Invalid value',
    }));
    return reply.status(400).send({ error: 'Validation failed', details });
  }

  // Custom application errors (ValidationError, NotFoundError)
  if (error instanceof AppError) {
    if (error.statusCode === 404) {
      return reply.status(404).send({ error: error.message });
    }
    return reply.status(error.statusCode).send({
      error: 'Validation failed',
      details: error.details,
    });
  }

  // Unknown errors
  request.log.error(error);
  return reply.status(500).send({ error: 'Internal Server Error' });
}
