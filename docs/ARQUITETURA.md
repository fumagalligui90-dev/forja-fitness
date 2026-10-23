# FORJA FITNESS — Arquitetura

> Nome provisório. Nome, cores e identidade são centralizados em `packages/core/src/brand.ts`
> (o painel administrativo passará a sobrescrever esses valores na Etapa 6).

## 1. Visão geral

```
┌──────────────────────┐      ┌──────────────────────┐
│  Web (Next.js 16)    │      │  App (Expo / RN)     │  ← Etapa 2
│  React 19 + Tailwind │      │  Android + iOS       │
└─────────┬────────────┘      └──────────┬───────────┘
          │  HTTPS / JSON (cookies na web, bearer no app)
┌─────────▼──────────────────────────────▼───────────┐
│  API  /api/v1/*  (Route Handlers do Next.js)       │
│  • validação Zod (schemas compartilhados)           │
│  • regras de negócio em src/server/services         │
│  • Better Auth em /api/auth/* (sessões, e-mail,     │
│    recuperação de senha, Google/Apple opcionais)    │
└─────────┬──────────────────────────────────────────┘
          │ Drizzle ORM — toda consulta de usuário roda numa
          │ transação com `SET LOCAL ROLE forja_app` + app.user_id
┌─────────▼──────────────────────────────────────────┐
│  PostgreSQL  (Row Level Security por usuário)      │
│  dev: PGlite (Postgres 17 embutido, sem instalar)  │
│  prod: Postgres gerenciado (Neon, Supabase, RDS…)  │
└────────────────────────────────────────────────────┘
```

### Por que assim

| Decisão | Motivo |
|---|---|
| **Uma API única** (`/api/v1`) consumida por web e app | Regras de negócio ficam só no servidor; web e mobile não duplicam lógica. |
| **`packages/core`** compartilhado | Schemas Zod, constantes (grupos musculares, equipamentos), cálculos de volume, progresso e cronômetro — os mesmos no servidor, na web e no app. |
| **Better Auth** | Biblioteca de autenticação open-source com sessões em banco, hash de senha (scrypt), verificação de e-mail, recuperação de senha, rate limit, Google/Apple e plugin para Expo. Sem custo por usuário. |
| **PostgreSQL + Drizzle** | SQL tipado, migrações versionadas em `apps/web/drizzle`, portável entre provedores. |
| **RLS como 2ª camada** | Além do filtro por `owner_id` nos serviços, o banco recusa ler/gravar linhas de outro usuário mesmo se um serviço tiver bug. |
| **PGlite em desenvolvimento** | Postgres real (WASM) em `apps/web/.data`, zero instalação. Em produção basta definir `DATABASE_URL`. |
| **Cronômetro por timestamp** | O servidor grava `rest_ends_at`; o cliente só calcula `fim − agora`. Funciona ao trocar de aba, minimizar ou reabrir o app. |

### Segurança (resumo)
- Senhas: hash scrypt pelo Better Auth; nunca trafegam para logs.
- Cookies de sessão `HttpOnly`, `SameSite=Lax`, `Secure` em produção.
- Mutações da API exigem `Content-Type: application/json` e `Origin` igual ao do app (proteção CSRF).
- Erros internos retornam mensagem genérica + id de correlação; detalhes só no log do servidor.
- Rate limit do Better Auth nas rotas de login/cadastro/recuperação (ativo em produção).
- Segredos apenas em variáveis de ambiente do servidor (`.env.local`, nunca commitado).

## 2. Estrutura de pastas

```
APP ACADEMIA/
├─ apps/
│  ├─ web/                    Next.js: site + API + migrações
│  │  ├─ drizzle/             migrações SQL versionadas (inclui RLS)
│  │  ├─ scripts/             migrate, seed, smoke test HTTP
│  │  ├─ src/
│  │  │  ├─ app/              rotas (App Router)
│  │  │  │  ├─ (auth)/        entrar, cadastro, recuperar/redefinir senha
│  │  │  │  ├─ app/           área logada (dashboard, treinos, exercícios, sessão…)
│  │  │  │  ├─ api/auth/      Better Auth
│  │  │  │  └─ api/v1/        API REST da plataforma
│  │  │  ├─ components/       componentes reutilizáveis (ui/, layout)
│  │  │  ├─ db/               schema Drizzle, cliente, migrador, seed
│  │  │  ├─ lib/              clientes HTTP/auth do navegador, utilitários
│  │  │  └─ server/           auth, e-mail, http helpers, services/
│  │  └─ test/                testes de integração (PGlite em memória)
│  └─ mobile/                 Expo (Etapa 2)
├─ packages/
│  └─ core/                   schemas, constantes, cálculos (+ testes)
└─ docs/                      arquitetura, banco, API, roadmap, testes
```

## 3. Ambientes

| Variável | Dev | Produção |
|---|---|---|
| `DATABASE_URL` | vazio → PGlite em `.data/pglite` | `postgres://…` gerenciado |
| `BETTER_AUTH_SECRET` | qualquer string longa | segredo forte (32+ bytes) |
| `BETTER_AUTH_URL` | `http://localhost:3000` | domínio público |
| `SMTP_URL` / `EMAIL_FROM` | vazio → caixa de e-mails de dev em `/dev/emails` | provedor SMTP (Resend, SES, Postmark…) |
| `GOOGLE_*`, `APPLE_*` | opcional | opcional |

## 4. Custos de operação (referência, validar antes de contratar)
- Hospedagem Next.js: Vercel/Render/Fly — há planos gratuitos para MVP.
- Postgres gerenciado: Neon/Supabase têm camada gratuita; produção paga a partir de ~US$ 20–25/mês.
- E-mail transacional: Resend/SES — camadas gratuitas cobrem o início.
- Lojas: Google Play (taxa única US$ 25), Apple Developer (US$ 99/ano).
