import { BRAND, type Theme } from '@forja/core';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** Mesma paleta da web (apps/web/src/app/globals.css). */
const palettes = {
  dark: {
    bg: '#0b0b0c',
    surface: '#141416',
    surface2: '#1c1c1f',
    surface3: '#26262a',
    line: '#2c2c31',
    text: '#f4f4f5',
    muted: '#a3a3ad',
    faint: '#6e6e78',
    danger: '#ff5a5f',
    success: '#3ddc97',
    warning: '#ffb547',
  },
  light: {
    bg: '#f5f5f2',
    surface: '#ffffff',
    surface2: '#efefeb',
    surface3: '#e4e4df',
    line: '#d9d9d3',
    text: '#121214',
    muted: '#5c5c66',
    faint: '#8a8a93',
    danger: '#d92d36',
    success: '#138a5a',
    warning: '#b86e00',
  },
};

export type Colors = (typeof palettes)['dark'] & { accent: string; accentInk: string; accentSoft: string };

function withAlpha(hex: string, alpha: number) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

interface ThemeCtx {
  scheme: Theme;
  colors: Colors;
  setScheme: (t: Theme) => void;
  setAccent: (c: string | null) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [scheme, setScheme] = useState<Theme>('dark');
  const [accent, setAccentState] = useState<string>(BRAND.accentColor);
  const value = useMemo<ThemeCtx>(
    () => ({
      scheme,
      colors: { ...palettes[scheme], accent, accentInk: '#0b0b0c', accentSoft: withAlpha(accent, scheme === 'dark' ? 0.16 : 0.14) },
      setScheme,
      setAccent: (c) => setAccentState(c ?? BRAND.accentColor),
    }),
    [scheme, accent],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme fora do ThemeProvider');
  return ctx;
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
