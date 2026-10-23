import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuração do app. Nome, identificadores de pacote e esquema de deep link
 * vêm do ambiente para permitir rebranding e builds separados (dev/produção)
 * sem editar código. Ícone e splash definitivos: Etapa 8 (publicação).
 */
const APP_NAME = process.env.APP_NAME ?? 'FORJA FITNESS';
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'com.forjafitness.app';
const SCHEME = process.env.APP_SCHEME ?? 'forja';
const BG = '#0b0b0c';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'forja-fitness',
  version: '0.1.0',
  scheme: SCHEME,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: BG,
  ios: {
    supportsTablet: true,
    bundleIdentifier: BUNDLE_ID,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: BG,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    ['expo-notifications', { color: '#ff5a1f' }],
  ],
  experiments: { typedRoutes: true },
});
