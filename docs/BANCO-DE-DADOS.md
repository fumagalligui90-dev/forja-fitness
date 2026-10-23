# Modelo de dados

Fonte da verdade: `apps/web/src/db/schema.ts` → migrações SQL em `apps/web/drizzle/`
(`0000_init.sql` tabelas/índices, `0001_rls.sql` papel `forja_app` + políticas RLS).

## Implementado (Etapa 1)

```
users ─┬─< auth_sessions            (Better Auth: sessões em banco, token único)
       ├─< auth_accounts            (senha com hash scrypt / provedores sociais)
       ├─< exercises (owner_id)     owner_id NULL = biblioteca global
       ├─< exercise_favorites >──── exercises
       ├─< workouts ──< workout_exercises >── exercises
       └─< workout_sessions ──< session_exercises ──< set_logs ──< set_log_revisions
                │                     (snapshot do plano)   (séries)   (valores anteriores
                └ workout_id → workouts (SET NULL)                       de séries editadas)
auth_verifications   tokens de verificação de e-mail / redefinição de senha
dev_emails           caixa de saída só de desenvolvimento
```

| Tabela | Pontos-chave |
|---|---|
| `users` | + `birth_date`, `terms_version`, `terms_accepted_at`, `role` (`student` por padrão; o cliente não consegue definir) |
| `exercises` | enums `muscle_group`, `equipment`, `difficulty`; `is_demo` marca dados de demonstração; exclusão = `archived_at` (histórico preservado) |
| `workouts` | `label` (A/B/C…), `weekdays smallint[]` (0 = domingo); exclusão = `archived_at` |
| `workout_exercises` | ordem (`position`), séries, faixa de reps, `target_load_kg numeric(6,2)`, descanso, técnica, observações |
| `workout_sessions` | `status` (active/paused/completed/abandoned), timestamps de início/fim/pausa, `paused_total_ms`, `rest_ends_at`/`rest_paused_remaining_ms` (cronômetro por timestamp). **Índice único parcial: 1 sessão aberta por usuário** |
| `session_exercises` | cópia do plano no início da sessão — editar a ficha não altera o histórico; `original_exercise_id` registra substituições |
| `set_logs` | carga/reps **anuláveis** (dado ausente ≠ zero), `revision`; único por (exercício da sessão, nº da série) |
| `set_log_revisions` | valores anteriores a cada edição |

## Segurança no banco
- Toda tabela de dados do usuário tem `owner_id` + **RLS** (`owner_id = app_user_id()`).
- A API usa `SET LOCAL ROLE forja_app` + `set_config('app.user_id', …)` por transação.
- `forja_app` **não** tem acesso às tabelas de autenticação; biblioteca global é somente leitura para ele.
- Exclusão da conta: `ON DELETE CASCADE` remove todos os dados do usuário.

## Planejado (próximas etapas)
`profiles` (altura, peso, objetivo, nível, disponibilidade), `body_measurements`, `progress_photos`,
`foods`/`meals`/`meal_items`/`nutrition_goals`/`recipes`/`menus`, `plans`/`subscriptions`/`payment_events`/`coupons`,
`professionals`/`client_links`/`consents`, `notifications`/`notification_prefs`, `audit_logs`, `app_settings` (marca).
