// Insere exercícios de demonstração na biblioteca global (idempotente).
export {};

try {
  process.loadEnvFile('.env.local');
} catch {}

const { createDb } = await import('../src/db/client');
const { seedDemoExercises } = await import('../src/db/seed');

const handle = createDb();
const n = await seedDemoExercises(handle.db);
console.log(`[seed] ${n} exercícios novos inseridos; os existentes foram atualizados (${handle.kind})`);
await handle.close();
