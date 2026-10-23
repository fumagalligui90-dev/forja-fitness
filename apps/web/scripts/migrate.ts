// Aplica as migrações pendentes. Uso no deploy: `npm run db:migrate`.
// Com PGlite, pare o servidor de dev antes (o diretório de dados não aceita dois processos).
export {};

try {
  process.loadEnvFile('.env.local');
} catch {}

const { createDb } = await import('../src/db/client');
const { seedDemoExercises } = await import('../src/db/seed');

const handle = createDb();
await handle.migrate();
console.log(`[migrate] migrações aplicadas (${handle.kind})`);
if (process.argv.includes('--seed')) {
  const n = await seedDemoExercises(handle.db);
  console.log(`[migrate] ${n} exercícios de demonstração inseridos`);
}
await handle.close();
