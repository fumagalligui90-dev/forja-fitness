'use client';

import { BRAND } from '@forja/core';
import { LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, cn, Dialog, Field, Input, PageHeader, Spinner } from '@/components/ui';
import { authClient, authErrorMessage } from '@/lib/auth-client';

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [accent, setAccent] = useState<string>(BRAND.accentColor);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    setAccent(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || BRAND.accentColor);
  }, []);

  // Preferências visuais locais deste dispositivo (sincronização com o servidor: Etapa 2).
  function applyTheme(t: 'dark' | 'light') {
    setTheme(t);
    if (t === 'light') document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem('forja:theme', t);
    } catch {}
  }
  function applyAccent(c: string) {
    setAccent(c);
    document.documentElement.style.setProperty('--accent', c);
    try {
      localStorage.setItem('forja:accent', c);
    } catch {}
  }

  async function signOut() {
    await authClient.signOut();
    router.replace('/entrar');
    router.refresh();
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await authClient.deleteUser({ password, callbackURL: '/' });
    setDeleting(false);
    if (error) return setDeleteError(authErrorMessage(error));
    router.replace('/');
    router.refresh();
  }

  if (isPending || !session) return <Spinner />;
  const u = session.user;

  return (
    <div className="animate-rise flex flex-col gap-6">
      <PageHeader title="Conta" />

      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Dados pessoais</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-faint">Nome</dt>
            <dd className="font-semibold">{u.name}</dd>
          </div>
          <div>
            <dt className="text-faint">E-mail</dt>
            <dd className="font-semibold">{u.email}</dd>
          </div>
          <div>
            <dt className="text-faint">Nascimento</dt>
            <dd className="font-semibold">{u.birthDate ? new Date(`${u.birthDate}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</dd>
          </div>
          <div>
            <dt className="text-faint">Termos aceitos em</dt>
            <dd className="font-semibold">{u.termsAcceptedAt ? new Date(u.termsAcceptedAt).toLocaleDateString('pt-BR') : '—'}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-faint">Perfil completo (foto, altura, peso, objetivo, nível e disponibilidade) chega na próxima etapa.</p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Aparência</h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2" role="radiogroup" aria-label="Tema">
            {(
              [
                ['dark', 'Escuro', Moon],
                ['light', 'Claro', Sun],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                role="radio"
                aria-checked={theme === k}
                onClick={() => applyTheme(k)}
                className={cn(
                  'flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border font-semibold',
                  theme === k ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted',
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm text-muted">Cor de destaque</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de destaque">
              {BRAND.accentPresets.map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={accent.toLowerCase() === c}
                  aria-label={c}
                  onClick={() => applyAccent(c)}
                  className={cn('size-11 rounded-full border-2', accent.toLowerCase() === c ? 'border-text' : 'border-transparent')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">Sessão e privacidade</h2>
        <Button variant="secondary" onClick={signOut} className="self-start">
          <LogOut className="size-4" /> Sair
        </Button>
        <p className="text-sm text-muted">
          Leia a <Link href="/privacidade" className="text-accent underline">política de privacidade</Link>.
        </p>
        <Button variant="danger" onClick={() => setDeleteOpen(true)} className="self-start">
          <Trash2 className="size-4" /> Excluir conta
        </Button>
      </Card>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir conta"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} disabled={!password} onClick={deleteAccount}>
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Alert tone="warning">
            Esta ação apaga sua conta, treinos, exercícios próprios e todo o histórico de forma permanente. Não é possível desfazer.
          </Alert>
          {deleteError && <Alert>{deleteError}</Alert>}
          <Field label="Confirme sua senha" htmlFor="del-pass">
            <Input id="del-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
