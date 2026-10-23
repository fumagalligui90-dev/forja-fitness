'use client';

import { formatDuration, formatKg, type SessionListItemDTO } from '@forja/core';
import { ChevronRight, History } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

const PAGE = 20;

export default function HistoryPage() {
  const [items, setItems] = useState<SessionListItemDTO[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(before?: string) {
    const q = new URLSearchParams({ limit: String(PAGE) });
    if (before) q.set('before', before);
    const page = await api<SessionListItemDTO[]>(`/sessions?${q}`);
    setItems((cur) => (before ? [...(cur ?? []), ...page] : page));
    setHasMore(page.length === PAGE);
  }

  useEffect(() => {
    load().catch((e) => setError(errorMessage(e)));
  }, []);

  // Agrupa por mês para leitura rápida.
  const groups = new Map<string, SessionListItemDTO[]>();
  for (const s of items ?? []) {
    const key = new Date(s.startedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  return (
    <div className="animate-rise">
      <PageHeader title="Histórico" subtitle="Treinos encerrados." />
      {error && <Alert>{error}</Alert>}
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon={<History className="size-8" />} title="Sem treinos ainda">
          Quando você finalizar um treino, ele aparece aqui com duração, séries e volume.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {[...groups].map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-faint">{month}</h2>
              <div className="flex flex-col gap-2">
                {list.map((s) => (
                  <Link key={s.id} href={`/app/sessao/${s.id}/resumo`}>
                    <Card className="flex items-center gap-4 p-4 transition hover:border-faint">
                      <div className="w-12 shrink-0 text-center">
                        <p className="font-display text-2xl font-bold leading-none">{new Date(s.startedAt).getDate()}</p>
                        <p className="text-[11px] font-semibold uppercase text-faint">
                          {new Date(s.startedAt).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate font-semibold">
                          {s.workoutName}
                          {s.status === 'abandoned' && <Badge tone="warning">Descartado</Badge>}
                        </p>
                        <p className="tabular text-sm text-muted">
                          {formatDuration(s.durationMs)} · {s.setCount} séries
                          {s.volumeKg > 0 && ` · ${formatKg(s.volumeKg)}`}
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-faint" />
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
          {hasMore && (
            <Button
              variant="secondary"
              loading={loadingMore}
              onClick={async () => {
                setLoadingMore(true);
                await load(items.at(-1)?.startedAt).catch((e) => setError(errorMessage(e)));
                setLoadingMore(false);
              }}
            >
              Carregar mais
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
