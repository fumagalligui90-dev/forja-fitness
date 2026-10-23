/**
 * Identidade visual padrão. Valores provisórios: o painel administrativo
 * (Etapa 6) passará a sobrescrevê-los a partir do banco.
 */
export const BRAND = {
  name: 'FORJA FITNESS',
  shortName: 'FORJA',
  tagline: 'Treine com método. Evolua com dados.',
  accentColor: '#ff5a1f',
  accentPresets: ['#ff5a1f', '#e8ff3a', '#2ee6a6', '#3aa8ff', '#b46bff', '#ff3a6e'],
} as const;

/** Versão vigente dos termos de uso e política de privacidade aceitos no cadastro. */
export const TERMS_VERSION = '2026-10-rascunho';

/** Idade mínima para cadastro sem fluxo de consentimento parental (LGPD art. 14). */
export const MIN_SIGNUP_AGE = 16;
