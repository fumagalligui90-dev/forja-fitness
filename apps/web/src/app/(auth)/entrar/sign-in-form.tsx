'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { SocialButtons } from '../social-buttons';

export function SignInForm({ next, providers }: { next: string; providers: string[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password, callbackURL: next });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    router.replace(next);
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Entrar</h1>
      <p className="mb-8 mt-1 text-muted">Bom te ver de novo. Bora treinar?</p>

      <SocialButtons providers={providers} />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Link href="/recuperar-senha" className="self-end text-sm font-medium text-accent hover:underline">
          Esqueci minha senha
        </Link>
        <Button type="submit" size="lg" loading={pending}>
          Entrar
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="font-semibold text-accent hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
