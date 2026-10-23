# Plano de desenvolvimento

Legenda: ✅ concluído e testado · 🟡 parcial · ⬜ não iniciado

## Etapa 1 — Arquitetura e primeira versão funcional
- ✅ Monorepo (npm workspaces): `apps/web`, `packages/core`
- ✅ Banco: schema, migrações, RLS por usuário, seed de exercícios de demonstração
- ✅ Autenticação real: cadastro (nome, e-mail, senha, nascimento, aceite de termos), verificação de e-mail, login, logout, recuperação de senha, exclusão de conta
- ✅ Biblioteca de exercícios (busca, filtros por grupo/equipamento, exercícios próprios, favoritos)
- ✅ Montagem de treinos (A/B/C…, séries, faixa de reps, carga, descanso, técnica, observações, reordenar por arrastar, dias da semana, duplicar)
- ✅ Modo treino em tempo real (sessão, séries, cronômetro de descanso, pausa, edição de série com histórico, substituição, retomada, resumo com volume)
- ✅ Dashboard com dados reais (treino do dia, último treino, sequência, totais)
- 🟡 Login Google/Apple: código pronto, ativa ao configurar as credenciais
- 🟡 Envio de e-mail: SMTP pronto; em dev os e-mails aparecem em `/dev/emails`

## Etapa 2 — App móvel e componentes (atual)
- ✅ App Expo SDK 58 (Android/iOS) em `apps/mobile`, Expo Router, consumindo a mesma `/api/v1`
- ✅ Login/cadastro/recuperação no app com `@better-auth/expo` (cookie no Keychain/Keystore via SecureStore)
- ✅ Telas: início, treinos (lista, criar/editar, duplicar), exercícios (busca, filtros, favoritos, próprios), modo treino completo, resumo, histórico, conta, perfil, exclusão de conta
- ✅ Notificação local no fim do descanso (expo-notifications), tela sempre acesa durante o treino, vibração
- ✅ Perfil de treino (altura, peso, objetivo, nível, dias disponíveis, duração) — web e app
- ✅ Preferências (tema, cor de destaque, avisos de descanso) sincronizadas pelo servidor
- ✅ Cliente tipado da API compartilhado (`packages/core/src/api-client.ts`) usado pela web e pelo app
- 🟡 Testado no Expo web (navegador) e com bundles nativos gerados; **ainda não testado em aparelho físico**
- ⬜ Foto de perfil (depende do armazenamento privado — Etapa 3)
- ⬜ Reordenar exercícios por arrastar no app (hoje: botões ↑/↓; arrastar existe na web)
- ⬜ Ícone, splash e identidade definitivos (Etapa 8)

## Etapa 3 — Backend complementar
- ⬜ Armazenamento privado de arquivos (fotos de perfil/progresso) com URLs assinadas
- ⬜ Rate limit com armazenamento compartilhado (Redis/DB) para múltiplas instâncias
- ⬜ Documentação OpenAPI gerada a partir dos schemas Zod

## Etapa 4 — Treino avançado
- ⬜ Modelos de treino públicos, metas de progressão de carga, alternativas por equipamento
- ⬜ Mídia demonstrativa licenciada por exercício

## Etapa 5 — Alimentação, evolução, metas, gráficos
- ⬜ Refeições, alimentos (base TACO/USDA com fonte identificada), macros, água, cardápios, lista de compras
- ⬜ Peso, medidas, fotos privadas, gráficos de carga/volume, calendário, relatórios

## Etapa 6 — Perfis profissionais e admin
- ⬜ Personal/nutricionista, convites, vínculos, consentimentos revogáveis
- ⬜ Painel admin (usuários, biblioteca global, marca, auditoria, suspensão)

## Etapa 7 — Comercialização
- ⬜ Planos, trial, cupons, Stripe/Mercado Pago (web), Google Play Billing e App Store (via RevenueCat ou integração direta), webhooks validados

## Etapa 8 — Qualidade e publicação
- ⬜ Testes E2E (Playwright), auditoria de segurança, LGPD (exportação de dados), builds EAS, fichas das lojas

## Fora do escopo desta etapa (não simulado)
Pagamentos, IA, alimentação, notificações push (do servidor), painel admin e perfis profissionais **não existem ainda** — não há botões fictícios para eles na interface.
