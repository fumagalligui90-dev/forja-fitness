import { BRAND } from '@forja/core';
import { ArrowRight, Dumbbell, LineChart, Timer } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/brand';
import { getServerSession } from '@/server/session';

export default async function Home() {
  const session = await getServerSession();
  if (session?.user.emailVerified) redirect('/app');

  const features = [
    { icon: Dumbbell, title: 'Fichas sob medida', text: 'Monte treinos A, B, C… com séries, faixas de repetição, carga e descanso.' },
    { icon: Timer, title: 'Modo treino', text: 'Registre cada série com uma mão. O descanso começa sozinho e não se perde.' },
    { icon: LineChart, title: 'Dados reais', text: 'Volume, sequência e histórico calculados a partir do que você registrou.' },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <BrandLogo />
        <Link href="/entrar" className="text-sm font-semibold text-muted hover:text-text">
          Entrar
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Treino com método</p>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-wide sm:text-7xl">
          Cada série registrada. Cada evolução visível.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">{BRAND.tagline}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/cadastro"
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-accent px-6 font-display text-lg font-bold uppercase tracking-wide text-accent-ink hover:brightness-110"
          >
            Criar conta grátis <ArrowRight className="size-5" />
          </Link>
          <Link
            href="/entrar"
            className="inline-flex h-14 items-center rounded-2xl border border-line bg-surface-2 px-6 font-semibold hover:bg-surface-3"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="grid gap-3 pb-10 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-line bg-surface p-5">
            <Icon className="mb-3 size-6 text-accent" aria-hidden />
            <h2 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <footer className="flex flex-wrap gap-4 border-t border-line pt-5 text-xs text-faint">
        <span>© {new Date().getFullYear()} {BRAND.name} (nome provisório)</span>
        <Link href="/termos" className="hover:text-text">Termos de uso</Link>
        <Link href="/privacidade" className="hover:text-text">Privacidade</Link>
      </footer>
    </main>
  );
}
