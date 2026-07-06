import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/**/*.model.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/support.db',
  },
  verbose: true,
  strict: true,
});
