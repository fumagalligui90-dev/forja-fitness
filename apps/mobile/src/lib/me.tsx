import type { MeDTO, PreferencesInput } from '@forja/core';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { useTheme } from './theme';

interface MeCtx {
  me: MeDTO | null;
  setMe: (m: MeDTO) => void;
  updatePreferences: (p: PreferencesInput) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<MeCtx | null>(null);

/**
 * Carrega conta + perfil + preferências do servidor e aplica tema e cor de
 * destaque. As preferências são as mesmas da web (sincronizadas pela API).
 */
export function MeProvider({ children }: { children: ReactNode }) {
  const { setScheme, setAccent } = useTheme();
  const [me, setMeState] = useState<MeDTO | null>(null);

  const setMe = useCallback(
    (m: MeDTO) => {
      setMeState(m);
      setScheme(m.preferences.theme);
      setAccent(m.preferences.accentColor);
    },
    [setScheme, setAccent],
  );

  const refresh = useCallback(async () => {
    try {
      setMe(await api.me.get());
    } catch {
      // Sem rede: mantém o tema atual; as telas mostram o erro de conexão.
    }
  }, [setMe]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updatePreferences = useCallback(
    async (p: PreferencesInput) => {
      // Aplica na hora (otimista) e confirma no servidor.
      if (p.theme) setScheme(p.theme);
      if (p.accentColor !== undefined) setAccent(p.accentColor);
      setMe(await api.me.updatePreferences(p));
    },
    [setMe, setScheme, setAccent],
  );

  return <Ctx.Provider value={{ me, setMe, updatePreferences, refresh }}>{children}</Ctx.Provider>;
}

export function useMe() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMe fora do MeProvider');
  return ctx;
}
