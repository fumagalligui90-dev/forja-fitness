'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { authClient, authErrorMessage } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: '/redefinir-senha' });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    setSent(true);
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">Recuperar senha</h1>
      <p className="mb-8 mt-1 text-muted">Enviaremos um link para você criar uma nova senha.</p>
      {sent ? (
        <Alert tone="success">
          Se houver uma conta com <strong>{email}</strong>, você receberá o link em instantes. Ele vale por 1 hora.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <Field label="E-mail" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" loading={pending}>
            Enviar link
          </Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link href="/entrar" className="font-semibold text-accent hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
