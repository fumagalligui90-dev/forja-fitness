# Testes

## Como executar

| Comando | O que cobre |
|---|---|
| `npm test` | unitários (`packages/core`) + integração (`apps/web/test`, Postgres real via PGlite em memória, migrações e RLS reais) |
| `npm run typecheck` | TypeScript estrito em todos os pacotes |
| `npm run smoke -w @forja/web` | ponta a ponta via HTTP contra o servidor de dev rodando (`npm run dev`) |
| `npm run build` | build de produção do Next.js |

## Cobertura atual

**Unitários — `packages/core/test`**
- Volume (carga × reps), séries sem dado ficam fora e são sinalizadas, carga 0, arredondamento
- Progresso do treino (séries extras, exercício pulado), relógio de treino com pausas, estados do descanso
- Datas por fuso (dia local, dia da semana), sequência de dias, idade mínima
- Validação de treino e de comandos da sessão

**Integração — `apps/web/test`**
- `auth.test.ts`: cadastro exige termos e idade mínima; login bloqueado até verificar e-mail; verificação; cookie HttpOnly; logout; senha errada; usuário não consegue se promover a admin; recuperação de senha
- `rls.test.ts`: o papel da API não lê/grava/altera/apaga linhas de outro usuário; biblioteca global é somente leitura; sem `app.user_id` nada é visível; sem acesso às tabelas de autenticação
- `workouts-sessions.test.ts`: busca sem acento; isolamento de exercícios particulares; criar/editar/reordenar/duplicar treino; edição inválida não destrói a versão anterior; fluxo completo da sessão (início, 409 em sessão dupla, série → descanso automático, pausar/retomar/±15 s/pular descanso, pausar treino congela descanso e bloqueia registro, edição com histórico, navegação, série sem carga, finalizar, comandos após encerrar = 409), histórico com volume, "última vez" na sessão seguinte, substituição, descartar, sessão esquecida encerrada no horário da última série, dashboard

**Smoke HTTP — `apps/web/scripts/smoke.mjs`** (24 verificações): 401 sem sessão, CSRF por Origin (403), não-JSON (415), validação (400), cadastro → bloqueio → e-mail → verificação → login, criar treino, iniciar sessão, descanso, 409, isolamento entre duas contas reais (leitura, comando, início de sessão), histórico.

## Etapa 2 — resultados (23/10/2026)

| Verificação | Resultado |
|---|---|
| core (unitários) | 14/14 ✅ |
| web (integração, + `profile.test.ts`: padrões, validação, isolamento RLS do perfil) | 17/17 ✅ |
| typecheck core + web + mobile | ✅ sem erros |
| smoke HTTP (+ perfil, preferências, requisição sem Origin, CORS, callbacks `exp://`/`forja://`, callback malicioso recusado) | 35/35 ✅ |
| `expo export` Android + iOS (bundle Hermes) | ✅ |
| `expo-doctor` | 19/20 — o aviso restante (`.expo/` no git) é falso positivo: `git check-ignore` confirma que está ignorado |

Verificação manual do app no **Expo web** (navegador): dashboard com dados reais, iniciar treino,
registrar série, descanso automático, ver o mesmo treino na web em andamento (continuidade entre
plataformas), finalizar com confirmação, resumo, sair do modo treino, trocar tema no app e ver a web
abrir no tema escolhido, editar perfil na web e ver no app (e vice-versa), validação de peso.

**Não verificado ainda:** aparelho físico Android/iOS (notificação local, vibração, tela acesa,
SecureStore e teclado nativo só existem no aparelho). Roteiro sugerido para o teste no celular:
1. Login → iniciar treino → finalizar série → bloquear a tela: a notificação deve tocar no fim do descanso.
2. Pausar o descanso: a notificação agendada deve ser cancelada.
3. Fechar o app durante o treino e reabrir: a faixa "Treino em andamento" deve aparecer.

Observação: no navegador de testes com emulação de celular (toque), os botões do Expo web não
respondem ao clique simulado; em tamanho desktop funcionam. É limitação da emulação, não do app nativo.

`npm audit` aponta vulnerabilidades em ferramentas de desenvolvimento (Expo CLI via `node-forge`,
`drizzle-kit` via `esbuild`), que não entram no bundle do app nem no servidor. A "correção" sugerida
rebaixaria o Expo para o SDK 44, por isso não foi aplicada; acompanhar atualizações.

## Etapa 1 — resultados (23/10/2026, Windows 11, Node 24.22.1)

| Suíte | Resultado |
|---|---|
| core (unitários) | 14/14 ✅ |
| web (integração) | 14/14 ✅ |
| typecheck | ✅ sem erros |
| smoke HTTP | 24/24 ✅ |
| `next build` | ✅ |

Verificação manual no navegador (375 px e desktop): cadastro com e sem aceite dos termos,
verificação por e-mail, dashboard, criação de treino com busca/seleção múltipla/reordenação,
modo treino (séries, descanso, recarregar a página no meio do descanso, pausar treino,
editar série, série sem carga, finalizar com observação) e resumo.

## Lacunas conhecidas (próximas etapas)
- Testes E2E automatizados de interface (Playwright) e de layout em vários tamanhos de tela.
- Testes em dispositivos reais (app móvel ainda não existe).
- Pagamentos, perfis profissionais e notificações: módulos ainda não implementados.
- Rate limit do Better Auth só é ativado em produção; não há teste automatizado dele.
