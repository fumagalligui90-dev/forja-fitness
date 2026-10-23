'use client';

import type { DashboardDTO } from '@forja/core';
import { formatDuration } from '@forja/core';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { Alert, Button, Dialog } from './ui';

type Active = NonNullable<DashboardDTO['activeSession']>;

/** Sessões abertas há mais que isso disparam a pergunta "retomar ou encerrar?". */
const STALE_MS = 3 * 60 * 60 * 1000;

/**
 * Recupera uma sessão interrompida: mostra uma faixa "treino em andamento" e,
 * se a sessão for antiga, pergunta se o usuário quer retomar ou encerrar.
 */
export function ActiveSessionBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<Active | null>(null);
  const [askStale, setAskStale] = useState(false);
  const [busy, setBusy] = useState<'finish' | 'abandon' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ session: Active | null }>('/sessions/active')
      .then(({ session }) => {
        if (cancelled) return;
        setActive(session);
        if (session && Date.now() - Date.parse(session.startedAt) > STALE_MS) {
          const key = `forja:stale-asked:${session.id}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            setAskStale(true);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function close(type: 'finish' | 'abandon') {
    if (!active) return;
    setBusy(type);
    setError(null);
    try {
      await api(`/sessions/${active.id}/commands`, { method: 'POST', body: type === 'finish' ? { type, notes: '', endAtLastSet: true } : { type } });
      setAskStale(false);
      setActive(null);
      if (type === 'finish') router.push(`/app/sessao/${active.id}/resumo`);
      else router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (!active) return null;
  const since = formatDuration(Date.now() - Date.parse(active.startedAt));

  return (
    <>
      <div className="border-b border-accent/30 bg-accent-soft">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold text-accent">{active.status === 'paused' ? 'Treino pausado' : 'Treino em andamento'}</span>
            <span className="text-muted"> · {active.workoutName} · iniciado há {since}</span>
          </p>
          <Link
            href={`/app/sessao/${active.id}`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-bold text-accent-ink"
          >
            <Play className="size-4" aria-hidden /> Retomar
          </Link>
        </div>
      </div>

      <Dialog
        open={askStale}
        onClose={() => setAskStale(false)}
        title="Treino antigo em aberto"
        footer={
          <>
            <Button variant="ghost" loading={busy === 'abandon'} onClick={() => close('abandon')}>
              Descartar
            </Button>
            <Button variant="secondary" loading={busy === 'finish'} onClick={() => close('finish')}>
              Finalizar e salvar
            </Button>
            <Button onClick={() => router.push(`/app/sessao/${active.id}`)}>Retomar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-muted">
            O treino <strong className="text-text">{active.workoutName}</strong> foi iniciado há {since} e não foi encerrado. O que você quer fazer?
          </p>
          <p className="text-sm text-faint">
            “Finalizar e salvar” mantém as séries no histórico e encerra no horário da última série registrada. “Descartar” encerra sem
            contar nas estatísticas.
          </p>
          {error && <Alert>{error}</Alert>}
        </div>
      </Dialog>
    </>
  );
}
