import cors from '@fastify/cors';
import Fastify from 'fastify';
import { apiRoutes } from './routes.js';
import { errorHandler } from './shared/error-handler.js';

export function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  fastify.register(cors, { origin: true });

  fastify.register(apiRoutes, { prefix: '/api/v1' });

  fastify.setErrorHandler(errorHandler);

  return fastify;
}
