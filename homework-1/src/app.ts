import Fastify from 'fastify';
import { apiRoutes } from './routes.js';
import { errorHandler } from './shared/error-handler.js';

export function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // Register all routes via the central router
  fastify.register(apiRoutes);

  fastify.setErrorHandler(errorHandler);

  return fastify;
}
