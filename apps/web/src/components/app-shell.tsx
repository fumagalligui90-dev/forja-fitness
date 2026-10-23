'use client';

import { BRAND } from '@forja/core';
import { Dumbbell, History, Home, Library, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from './brand';
import { ActiveSessionBanner } from './active-session-banner';
import { cn } from './ui';

const NAV = [
  { href: '/app', label: 'Início', icon: Home, exact: true },
  { href: '/app/treinos', label: 'Treinos', icon: Dumbbell },
  { href: '/app/exercicios', label: 'Exercícios', icon: Library },
  { href: '/app/historico', label: 'Histórico', icon: History },
  { href: '/app/conta', label: 'Conta', icon: UserRound },
];

export function AppShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const inSession = /^\/app\/sessao\/[^/]+$/.test(pathname);
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  // O modo treino ocupa a tela toda, sem navegação que distraia.
  if (inSession) return <>{children}</>;

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <Link href="/app" className="mb-8 px-3">
          <BrandLogo />
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Principal">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href, exact) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition',
                isActive(href, exact) ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-text',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto truncate px-3 text-xs text-faint" title={userName}>
          {userName} · {BRAND.shortName}
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Link href="/app">
            <BrandLogo />
          </Link>
        </header>
        <ActiveSessionBanner />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10">{children}</main>
      </div>

      {/* Barra inferior no celular: alvos grandes, alcançáveis com o polegar. */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href, exact) ? 'page' : undefined}
            className={cn(
              'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold',
              isActive(href, exact) ? 'text-accent' : 'text-faint',
            )}
          >
            <Icon className="size-6" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
