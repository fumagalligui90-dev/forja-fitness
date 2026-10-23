import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { socialProvidersFromEnv } from '@/server/auth';
import { getServerSession } from '@/server/session';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getServerSession();
  if (session?.user.emailVerified) redirect('/app');
  const { next } = await searchParams;
  // Só caminhos internos (evita redirecionamento aberto).
  const safeNext = next && /^\/app(\/|$)/.test(next) ? next : '/app';
  return <SignInForm next={safeNext} providers={Object.keys(socialProvidersFromEnv())} />;
}
