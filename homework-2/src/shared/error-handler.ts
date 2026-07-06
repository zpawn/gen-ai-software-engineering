import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errors.js';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error.validation) {
    const details = error.validation.map((violation) => ({
      field: violation.instancePath?.replace(/^\//, '') || violation.params?.missingProperty || 'unknown',
      message: violation.message ?? 'Invalid value',
    }));

    return reply.status(400).send({ error: 'Validation failed', details });
  }

  if (error instanceof AppError) {
    if (error.statusCode === 404) {
      return reply.status(404).send({ error: error.message });
    }

    return reply.status(error.statusCode).send({
      error: error.message,
      details: error.details,
    });
  }

  request.log.error(error);
  return reply.status(500).send({ error: 'Internal Server Error' });
}
