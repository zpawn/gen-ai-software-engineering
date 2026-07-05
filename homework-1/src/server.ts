import { buildApp } from './app.js';
import { migrateDatabase } from './config/database.js';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  // Run database migrations
  migrateDatabase();

  const app = buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🏦 Banking API is running at http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
