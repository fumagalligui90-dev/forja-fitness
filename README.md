# FORJA FITNESS (nome provisório)

Plataforma fitness — web (Next.js) + API + PostgreSQL + app Android/iOS (Expo).
Arquitetura: [docs/ARQUITETURA.md](docs/ARQUITETURA.md) · Plano: [docs/ROADMAP.md](docs/ROADMAP.md)

## Requisitos
- Node.js 22+ (testado com 24.22 LTS) e npm 11
- Nada mais em desenvolvimento: o banco é PostgreSQL embutido (PGlite) em `apps/web/.data/`

## Rodando localmente

```bash
npm install
```

```bash
copy apps\web\.env.example apps\web\.env.local
```

Edite `apps/web/.env.local` e troque `BETTER_AUTH_SECRET` por um valor aleatório:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

```bash
npm run dev
```

Abra http://localhost:3000. Na primeira requisição as migrações e os exercícios de
demonstração são aplicados automaticamente.

**E-mails em desenvolvimento:** sem `SMTP_URL`, os e-mails (confirmação de cadastro,
recuperação de senha) aparecem em http://localhost:3000/dev/emails.

## App móvel (Android/iOS)

Com o servidor web rodando (`npm run dev`), em outro terminal:

```bash
npm run start -w @forja/mobile
```

- **No celular:** instale o app **Expo Go**, conecte o celular na mesma rede Wi-Fi do computador e leia o QR code.
  O app usa automaticamente `http://<IP do computador>:3000` como servidor. Se o Windows perguntar, libere o Node.js no firewall para redes privadas.
- **No navegador (só para desenvolvimento):** `npm run web -w @forja/mobile` abre em http://localhost:8081.
- Para apontar para outro servidor, crie `apps/mobile/.env` com `EXPO_PUBLIC_API_URL=https://seu-servidor`.
- Os links de e-mail (confirmação, nova senha) apontam para `BETTER_AUTH_URL`; no celular, confirme o e-mail
  abrindo o link no computador (em dev) ou configure `BETTER_AUTH_URL` com o IP da rede.
- Nome, identificador do pacote e esquema de deep link são configuráveis por ambiente (`APP_NAME`,
  `APP_BUNDLE_ID`, `APP_SCHEME`) em [apps/mobile/app.config.ts](apps/mobile/app.config.ts).

## Testes

```bash
npm test
```

```bash
npm run typecheck
```

Teste de fumaça HTTP (com `npm run dev` rodando em outro terminal):

```bash
npm run smoke -w @forja/web
```

Detalhes e resultados: [docs/TESTES.md](docs/TESTES.md).

## Produção (resumo)
1. Provisione um PostgreSQL gerenciado (Neon, Supabase, RDS…) e defina `DATABASE_URL`.
2. Defina `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (domínio público), `SMTP_URL` e `EMAIL_FROM`.
3. No deploy: `npm run db:migrate` (aplica migrações, inclusive as políticas RLS) e `npm run db:seed` se quiser os exercícios demo.
4. `npm run build` e `npm start` (ou deploy na Vercel/Render com os mesmos comandos).

## Estrutura

```
apps/web        Next.js: páginas, API /api/v1, autenticação, banco
apps/mobile     Expo (Android/iOS): telas em src/app, componentes em src/components
packages/core   regras compartilhadas: schemas Zod, constantes, cálculos, cliente tipado da API
docs/           arquitetura, banco, API, testes, roadmap
```
