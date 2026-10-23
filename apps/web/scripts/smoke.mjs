// Teste de fumaça HTTP contra o servidor de DEV em execução (npm run dev).
// Cria duas contas descartáveis, verifica e-mail pela caixa de dev, monta um
// treino, executa uma sessão e checa isolamento entre contas e proteções da API.
// Uso: npm run smoke -w @forja/web   (BASE_URL opcional, padrão http://localhost:3000)

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) failures++;
};

function client() {
  let cookie = '';
  return async (path, { method = 'GET', body, headers = {} } = {}) => {
    const res = await fetch(BASE + path, {
      method,
      redirect: 'manual',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        Origin: BASE,
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(';');
      const [name] = pair.split('=');
      cookie = [...cookie.split('; ').filter((p) => p && !p.startsWith(`${name}=`)), pair].join('; ');
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json };
  };
}

async function account(tag) {
  const http = client();
  const email = `smoke.${tag}.${Date.now()}@exemplo.test`;
  const password = `Smoke-${Math.random().toString(36).slice(2)}-9`;
  const up = await http('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name: `Smoke ${tag}`, email, password, birthDate: '1992-03-04', termsVersion: '2026-10-rascunho' },
  });
  ok(up.status === 200, `[${tag}] cadastro (${up.status})`);

  const blocked = await http('/api/auth/sign-in/email', { method: 'POST', body: { email, password } });
  ok(blocked.status === 403, `[${tag}] login bloqueado antes de verificar e-mail (${blocked.status})`);

  await new Promise((r) => setTimeout(r, 300));
  const mails = await http('/api/dev/emails');
  const mail = mails.json?.find((m) => m.to === email && /Confirme/.test(m.subject));
  const token = mail?.text.match(/token=([^&\s]+)/)?.[1];
  ok(!!token, `[${tag}] e-mail de verificação recebido`);
  await http(`/api/auth/verify-email?token=${token}`);

  const signIn = await http('/api/auth/sign-in/email', { method: 'POST', body: { email, password } });
  ok(signIn.status === 200, `[${tag}] login após verificação (${signIn.status})`);
  return http;
}

const anon = client();
ok((await anon('/api/v1/workouts')).status === 401, 'API sem sessão → 401');

const a = await account('a');
const b = await account('b');

// Proteções de requisição
const csrf = await a('/api/v1/workouts', { method: 'POST', body: { name: 'x', exercises: [] }, headers: { Origin: 'https://site-malicioso.example' } });
ok(csrf.status === 403, `POST com Origin estranha → 403 (${csrf.status})`);
const form = await a('/api/v1/workouts', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
ok(form.status === 415, `POST não-JSON → 415 (${form.status})`);
const invalid = await a('/api/v1/workouts', { method: 'POST', body: { name: '', exercises: [] } });
ok(invalid.status === 400 && invalid.json?.error?.code === 'validation', `validação no servidor → 400 (${invalid.status})`);

// Fluxo do usuário A
const lib = await a('/api/v1/exercises?q=supino');
ok(lib.status === 200 && lib.json.length >= 2, `biblioteca pesquisável (${lib.json?.length} resultados para "supino")`);
const created = await a('/api/v1/workouts', {
  method: 'POST',
  body: {
    name: 'Smoke A',
    label: 'A',
    weekdays: [1],
    exercises: [{ exerciseId: lib.json[0].id, sets: 2, repsMin: 8, repsMax: 10, targetLoadKg: 30, restSeconds: 60 }],
  },
});
ok(created.status === 201, `criar treino (${created.status})`);
const session = await a('/api/v1/sessions', { method: 'POST', body: { workoutId: created.json.id } });
ok(session.status === 201, `iniciar sessão (${session.status})`);
const sid = session.json.id;
const logged = await a(`/api/v1/sessions/${sid}/commands`, {
  method: 'POST',
  body: { type: 'logSet', sessionExerciseId: session.json.exercises[0].id, loadKg: 30, reps: 10 },
});
ok(logged.status === 200 && logged.json.rest.endsAt, 'finalizar série inicia descanso');
const again = await a('/api/v1/sessions', { method: 'POST', body: { workoutId: created.json.id } });
ok(again.status === 409, `segunda sessão simultânea recusada → 409 (${again.status})`);

// Isolamento: B não enxerga nem altera dados de A
ok((await b(`/api/v1/workouts/${created.json.id}`)).status === 404, 'B não lê treino de A → 404');
ok((await b(`/api/v1/sessions/${sid}`)).status === 404, 'B não lê sessão de A → 404');
const hijack = await b(`/api/v1/sessions/${sid}/commands`, { method: 'POST', body: { type: 'finish' } });
ok(hijack.status === 404, `B não finaliza sessão de A → 404 (${hijack.status})`);
const bStart = await b('/api/v1/sessions', { method: 'POST', body: { workoutId: created.json.id } });
ok(bStart.status === 404, `B não inicia sessão com treino de A → 404 (${bStart.status})`);
ok((await b('/api/v1/workouts')).json.length === 0, 'lista de treinos de B está vazia');

// Perfil e preferências (Etapa 2)
const me0 = await a('/api/v1/me');
ok(me0.status === 200 && me0.json.profile.heightCm === null && me0.json.preferences.theme === 'dark', 'perfil novo com valores padrão');
const prof = await a('/api/v1/me', {
  method: 'PUT',
  body: { name: 'Smoke A2', heightCm: 180, weightKg: 80.5, goal: 'strength', experienceLevel: 'beginner', trainingDays: [1, 3], sessionMinutes: 60 },
});
ok(prof.status === 200 && prof.json.name === 'Smoke A2' && prof.json.profile.heightCm === 180, `atualizar perfil (${prof.status})`);
const badProf = await a('/api/v1/me', { method: 'PUT', body: { name: 'X', heightCm: 20 } });
ok(badProf.status === 400, `perfil inválido → 400 (${badProf.status})`);
const prefs = await a('/api/v1/me/preferences', { method: 'PATCH', body: { theme: 'light', accentColor: '#3AA8FF' } });
ok(prefs.json?.preferences?.theme === 'light' && prefs.json.preferences.accentColor === '#3aa8ff', 'preferências sincronizadas no servidor');
ok((await b('/api/v1/me')).json?.preferences?.theme === 'dark', 'preferências de A não vazam para B');

// App nativo: sem cabeçalho Origin, só com o cookie (como o app Expo envia)
const native = await a('/api/v1/workouts', { method: 'POST', body: { name: 'Nativo', exercises: [] }, headers: { Origin: '' } });
ok(native.status === 201, `requisição sem Origin (app nativo) aceita (${native.status})`);

// CORS somente para origens configuradas (Expo web em dev)
const pre = await fetch(`${BASE}/api/v1/workouts`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST' } });
ok(pre.headers.get('access-control-allow-origin') === 'http://localhost:8081', 'CORS liberado para http://localhost:8081');
const preBad = await fetch(`${BASE}/api/v1/workouts`, { method: 'OPTIONS', headers: { Origin: 'https://site-malicioso.example', 'Access-Control-Request-Method': 'POST' } });
ok(!preBad.headers.get('access-control-allow-origin'), 'CORS negado para origem desconhecida');

// Cadastro pelo app no Expo Go usa callback exp://… (aceito só em dev)
const expo = client();
const expoUp = await expo('/api/auth/sign-up/email', {
  method: 'POST',
  headers: { Origin: '', 'expo-origin': 'exp://192.168.0.10:8081' },
  body: { name: 'Smoke Expo', email: `smoke.expo.${Date.now()}@exemplo.test`, password: 'Smoke-expo-123', birthDate: '1990-01-01', termsVersion: '2026-10-rascunho', callbackURL: 'exp://192.168.0.10:8081/--/entrar' },
});
ok(expoUp.status === 200, `cadastro com callback exp:// (${expoUp.status}${expoUp.json?.message ? ` ${expoUp.json.message}` : ''})`);
const appUp = await expo('/api/auth/sign-up/email', {
  method: 'POST',
  headers: { Origin: '', 'expo-origin': 'forja://' },
  body: { name: 'Smoke App', email: `smoke.app.${Date.now()}@exemplo.test`, password: 'Smoke-app-123', birthDate: '1990-01-01', termsVersion: '2026-10-rascunho', callbackURL: 'forja:///entrar' },
});
ok(appUp.status === 200, `cadastro com callback forja:// (${appUp.status}${appUp.json?.message ? ` ${appUp.json.message}` : ''})`);
const evilUp = await expo('/api/auth/sign-up/email', {
  method: 'POST',
  headers: { Origin: '', 'expo-origin': 'forja://' },
  body: { name: 'Smoke Evil', email: `smoke.evil.${Date.now()}@exemplo.test`, password: 'Smoke-evil-123', birthDate: '1990-01-01', termsVersion: '2026-10-rascunho', callbackURL: 'https://site-malicioso.example/roubo' },
});
ok(evilUp.status === 403, `callback para site desconhecido recusado (${evilUp.status})`);

const done = await a(`/api/v1/sessions/${sid}/commands`, { method: 'POST', body: { type: 'finish', notes: 'smoke' } });
ok(done.json?.status === 'completed', 'finalizar treino');
const hist = await a('/api/v1/sessions');
ok(hist.json?.[0]?.volumeKg === 300, `histórico com volume calculado (${hist.json?.[0]?.volumeKg} kg)`);

console.log(failures ? `\n${failures} verificação(ões) falharam.` : '\nTodas as verificações passaram.');
process.exit(failures ? 1 : 0);
