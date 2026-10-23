import { defineConfig } from 'drizzle-kit';

// Usado só para gerar migrações (`npm run db:generate`); não conecta ao banco.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
});
