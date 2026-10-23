'use client';

import { MIN_SIGNUP_AGE, TERMS_VERSION } from '@forja/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BrandLogo } from '@/components/brand';
import { Alert, Button, Field, Input } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

/** Usuários vindos de login social completam nascimento + aceite dos termos aqui. */
export default function CompleteSignupPage() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) return setError('É preciso aceitar os termos para continuar.');
    setPending(true);
    try {
      await api('/me/consent', { method: 'POST', body: { birthDate, termsVersion: TERMS_VERSION } });
      router.replace('/app');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <BrandLogo />
      <h1 className="mt-10 font-display text-4xl font-extrabold uppercase tracking-wide">Falta pouco</h1>
      <p className="mb-8 mt-1 text-muted">Precisamos de mais duas informações para concluir seu cadastro.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Data de nascimento" htmlFor="birthDate" hint={`É preciso ter ${MIN_SIGNUP_AGE} anos ou mais.`}>
          <Input id="birthDate" type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </Field>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-5 accent-[var(--accent)]" />
          <span>
            Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-accent underline">termos de uso</Link> e a{' '}
            <Link href="/privacidade" target="_blank" className="font-semibold text-accent underline">política de privacidade</Link>.
          </span>
        </label>
        <Button type="submit" size="lg" loading={pending}>
          Continuar
        </Button>
      </form>
    </main>
  );
}
