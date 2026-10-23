'use client';

import { useEffect, useState } from 'react';
import { Alert, Card, PageHeader, Spinner } from '@/components/ui';

interface DevEmail {
  id: string;
  to: string;
  subject: string;
  text: string;
  createdAt: string;
}

/** Caixa de e-mails de DESENVOLVIMENTO (sem SMTP). A API retorna 404 em produção. */
export default function DevEmailsPage() {
  const [emails, setEmails] = useState<DevEmail[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/dev/emails', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setEmails)
      .catch(() => setError(true));
  }, []);

  const linkify = (text: string) =>
    text.split(/(https?:\/\/\S+)/g).map((part, i) =>
      /^https?:\/\//.test(part) ? (
        <a key={i} href={part} className="break-all font-semibold text-accent underline">
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      ),
    );

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <PageHeader title="E-mails de dev" subtitle="Apenas em desenvolvimento, quando SMTP_URL não está configurado." />
      {error && <Alert>Indisponível (produção ou SMTP configurado).</Alert>}
      {!emails && !error && <Spinner />}
      {emails?.length === 0 && <Alert tone="info">Nenhum e-mail ainda.</Alert>}
      <div className="flex flex-col gap-3">
        {emails?.map((m) => (
          <Card key={m.id} className="p-4">
            <p className="text-xs text-faint">
              {new Date(m.createdAt).toLocaleString('pt-BR')} · para {m.to}
            </p>
            <p className="mt-1 font-semibold">{m.subject}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{linkify(m.text)}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
