import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/**/*.model.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? './data/support.db',
  },
  verbose: true,
  strict: true,
});
