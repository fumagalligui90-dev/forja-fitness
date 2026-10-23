# API /api/v1

JSON em todas as rotas. Autenticação por cookie de sessão (web); o app móvel usará o
plugin Expo do Better Auth (Etapa 2). Contratos de tipos: `packages/core/src/types.ts`;
validação: `packages/core/src/schemas.ts` (os mesmos schemas no cliente e no servidor).

**Regras gerais**
- Sem sessão → `401`. E-mail não verificado → `403 email_not_verified`.
- Mutações exigem `Content-Type: application/json` (`415`) e `Origin` do próprio app (`403`).
- Erros: `{ "error": { "code", "message", "issues?", "requestId?" } }`. Erros internos nunca expõem detalhes.
- Recurso de outro usuário → `404` (não revela existência).

## Autenticação (`/api/auth/*`, Better Auth)
| Ação | Rota |
|---|---|
| Cadastro | `POST /api/auth/sign-up/email` `{ name, email, password, birthDate, termsVersion, callbackURL }` |
| Login / logout | `POST /api/auth/sign-in/email` · `POST /api/auth/sign-out` |
| Verificar e-mail | `GET /api/auth/verify-email?token=…` (link do e-mail) |
| Recuperar senha | `POST /api/auth/request-password-reset` → `POST /api/auth/reset-password` |
| Excluir conta | `POST /api/auth/delete-user` `{ password }` |
| Concluir cadastro social | `POST /api/v1/me/consent` `{ birthDate, termsVersion }` |

## Exercícios
| Método | Rota | Descrição |
|---|---|---|
| GET | `/exercises?q=&muscleGroup=&equipment=&scope=all\|mine\|favorites` | busca sem acento por nome, grupo ou equipamento |
| POST | `/exercises` | cria exercício particular |
| GET/PATCH/DELETE | `/exercises/:id` | só os próprios podem ser alterados; DELETE arquiva |
| PUT | `/exercises/:id/favorite` `{ favorite }` | favoritar |

## Treinos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/workouts` | resumo (nº de exercícios, séries, última execução) |
| POST | `/workouts` | cria ficha completa (com exercícios) |
| GET/PUT/DELETE | `/workouts/:id` | PUT substitui a ficha inteira numa transação; DELETE arquiva |
| POST | `/workouts/:id/duplicate` | duplica |

## Sessões (modo treino)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/sessions` `{ workoutId }` | inicia; `409 session_open` se já houver uma aberta |
| GET | `/sessions/active` | sessão aberta para retomada |
| GET | `/sessions/:id` | estado completo (+ `previous` = séries da última vez, `serverNow`) |
| GET | `/sessions?limit=&before=` | histórico (duração, séries, volume) |
| POST | `/sessions/:id/commands` | um comando por chamada; resposta = estado atualizado |

Comandos (`type`): `logSet`, `editSet`, `restPause`, `restResume`, `restSkip`, `restAdd`, `pause`,
`resume`, `goTo`, `setSkipped`, `substitute`, `finish` (`endAtLastSet` opcional), `abandon`.
Sessão encerrada → `409 session_closed`; comandos de execução com treino pausado → `409 session_paused`.

## Dashboard
`GET /dashboard?tz=America/Sao_Paulo` — treino do dia, próximos, sessão aberta, último treino,
sequência, totais e meta semanal, calculados no fuso informado.
