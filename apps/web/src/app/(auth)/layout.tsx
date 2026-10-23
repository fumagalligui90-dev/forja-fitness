import Link from 'next/link';
import { BrandLogo } from '@/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <Link href="/" className="mb-10 self-start">
        <BrandLogo />
      </Link>
      <div className="animate-rise flex-1">{children}</div>
      <footer className="mt-10 flex gap-4 text-xs text-faint">
        <Link href="/termos" className="hover:text-text">Termos de uso</Link>
        <Link href="/privacidade" className="hover:text-text">Política de privacidade</Link>
      </footer>
    </main>
  );
}
