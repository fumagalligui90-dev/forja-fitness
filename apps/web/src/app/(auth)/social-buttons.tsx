'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { authClient } from '@/lib/auth-client';

const LABELS: Record<string, string> = { google: 'Continuar com Google', apple: 'Continuar com Apple' };

/** Renderiza apenas os provedores realmente configurados no servidor. */
export function SocialButtons({ providers }: { providers: string[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (providers.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {providers.map((p) => (
        <Button
          key={p}
          variant="secondary"
          size="lg"
          loading={busy === p}
          onClick={async () => {
            setBusy(p);
            await authClient.signIn.social({ provider: p as 'google' | 'apple', callbackURL: '/app' });
            setBusy(null);
          }}
        >
          {LABELS[p] ?? p}
        </Button>
      ))}
      <div className="my-2 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
