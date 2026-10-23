'use client';

import { MIN_SIGNUP_AGE, TERMS_VERSION } from '@forja/core';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { SocialButtons } from '../social-buttons';

export function SignUpForm({ providers, devMailbox }: { providers: string[]; devMailbox: boolean }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', birthDate: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) return setError('Informe seu nome.');
    if (form.password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
    if (form.password !== form.confirm) return setError('As senhas não conferem.');
    if (!form.birthDate) return setError('Informe sua data de nascimento.');
    if (!accepted) return setError('É preciso aceitar os termos de uso e a política de privacidade.');
    setPending(true);
    const { error } = await authClient.signUp.email({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      birthDate: form.birthDate,
      termsVersion: TERMS_VERSION,
      callbackURL: '/app',
    });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-start gap-4">
        <MailCheck className="size-10 text-accent" aria-hidden />
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Confira seu e-mail</h1>
        <p className="text-muted">
          Enviamos um link de confirmação para <strong className="text-text">{form.email}</strong>. Abra-o para ativar sua conta.
        </p>
        {devMailbox && (
          <Alert tone="info">
            Ambiente de desenvolvimento sem SMTP: o e-mail está na{' '}
            <Link href="/dev/emails" className="font-semibold text-accent underline">
              caixa de e-mails de dev
            </Link>
            .
          </Alert>
        )}
        <Link href="/entrar" className="text-sm font-semibold text-accent hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Criar conta</h1>
      <p className="mb-8 mt-1 text-muted">Leva menos de um minuto.</p>

      <SocialButtons providers={providers} />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Nome" htmlFor="name">
          <Input id="name" autoComplete="name" required value={form.name} onChange={set('name')} />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Data de nascimento" htmlFor="birthDate" hint={`É preciso ter ${MIN_SIGNUP_AGE} anos ou mais.`}>
          <Input id="birthDate" type="date" required value={form.birthDate} onChange={set('birthDate')} max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
          <Input id="password" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Confirmar senha" htmlFor="confirm">
          <Input id="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        </Field>
        <label className="flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
          />
          <span>
            Li e aceito os{' '}
            <Link href="/termos" target="_blank" className="font-semibold text-accent underline">
              termos de uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" target="_blank" className="font-semibold text-accent underline">
              política de privacidade
            </Link>
            .
          </span>
        </label>
        <Button type="submit" size="lg" loading={pending}>
          Criar conta
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-semibold text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
