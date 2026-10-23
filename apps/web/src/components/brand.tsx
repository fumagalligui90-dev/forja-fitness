import { BRAND } from '@forja/core';

/** Marca provisória: bigorna estilizada + nome. Substituível pelo admin (Etapa 6). */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M7 11h18l-3 4h-4v3l3 5H11l3-5v-3h-4z" fill="var(--accent-ink)" />
    </svg>
  );
}

export function BrandLogo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark />
      <span className="font-display text-xl font-extrabold uppercase tracking-[0.08em]">
        {BRAND.shortName}
        <span className="text-accent"> Fitness</span>
      </span>
    </span>
  );
}
