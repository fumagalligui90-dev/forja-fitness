import Link from 'next/link';
import { BrandLogo } from '@/components/brand';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="mb-8 inline-block">
        <BrandLogo />
      </Link>
      <div className="mb-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        RASCUNHO — texto-base a ser revisado por assessoria jurídica antes do lançamento.
      </div>
      <article className="space-y-4 text-[15px] leading-relaxed text-muted [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:uppercase [&_h1]:text-text [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </article>
    </main>
  );
}
