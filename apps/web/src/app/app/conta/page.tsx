'use client';

import {
  BRAND,
  DIFFICULTIES,
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  GOALS,
  profileInputSchema,
  WEEKDAY_SHORT,
  type MeDTO,
  type PreferencesInput,
} from '@forja/core';
import { LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Button, Card, cn, Dialog, Field, Input, PageHeader, Select, Spinner } from '@/components/ui';
import { apiClient, errorMessage } from '@/lib/api';
import { authClient, authErrorMessage } from '@/lib/auth-client';
import { applyPreferences } from '@/lib/preferences';

const DURATIONS = [30, 45, 60, 75, 90, 120];

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiClient.me
      .get()
      .then(setMe)
      .catch((e) => setLoadError(errorMessage(e)));
  }, []);

  async function savePrefs(p: PreferencesInput) {
    if (!me) return;
    setPrefError(null);
    // Aplica na hora; confirma no servidor (sincroniza com o app).
    applyPreferences({ ...me.preferences, ...p } as MeDTO['preferences']);
    try {
      const updated = await apiClient.me.updatePreferences(p);
      setMe(updated);
      applyPreferences(updated.preferences);
    } catch (err) {
      setPrefError(errorMessage(err));
      applyPreferences(me.preferences);
    }
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

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!me) return <Spinner />;
  const accent = me.preferences.accentColor ?? BRAND.accentColor;

  return (
    <div className="animate-rise flex flex-col gap-6">
      <PageHeader title="Conta" subtitle={me.email} />

      <ProfileForm me={me} onSaved={setMe} />

      <Card className="p-5">
        <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Aparência e avisos</h2>
        <div className="flex flex-col gap-4">
          {prefError && <Alert>{prefError}</Alert>}
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
                aria-checked={me.preferences.theme === k}
                onClick={() => savePrefs({ theme: k })}
                className={cn(
                  'flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border font-semibold',
                  me.preferences.theme === k ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted',
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
                  aria-checked={accent === c}
                  aria-label={c}
                  onClick={() => savePrefs({ accentColor: c })}
                  className={cn('size-11 rounded-full border-2', accent === c ? 'border-text' : 'border-transparent')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-semibold">Aviso de fim do descanso</span>
              <span className="block text-sm text-muted">Som, vibração e notificação quando o descanso termina.</span>
            </span>
            <input
              type="checkbox"
              checked={me.preferences.restAlerts}
              onChange={(e) => savePrefs({ restAlerts: e.target.checked })}
              className="size-6 shrink-0 accent-[var(--accent)]"
            />
          </label>
          <p className="text-xs text-faint">Preferências sincronizadas com o app no celular.</p>
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

function ProfileForm({ me, onSaved }: { me: MeDTO; onSaved: (m: MeDTO) => void }) {
  const p = me.profile;
  const [name, setName] = useState(me.name);
  const [height, setHeight] = useState(p.heightCm ? String(p.heightCm) : '');
  const [weight, setWeight] = useState(p.weightKg ? String(p.weightKg).replace('.', ',') : '');
  const [goal, setGoal] = useState(p.goal ?? '');
  const [level, setLevel] = useState(p.experienceLevel ?? '');
  const [days, setDays] = useState<number[]>(p.trainingDays);
  const [minutes, setMinutes] = useState(p.sessionMinutes ? String(p.sessionMinutes) : '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const input = {
      name,
      heightCm: num(height),
      weightKg: num(weight),
      goal: (goal || null) as MeDTO['profile']['goal'],
      experienceLevel: (level || null) as MeDTO['profile']['experienceLevel'],
      trainingDays: days,
      sessionMinutes: num(minutes),
    };
    const check = profileInputSchema.safeParse(input);
    if (!check.success) return setError(check.error.issues[0]?.message ?? 'Dados inválidos.');
    setPending(true);
    try {
      onSaved(await apiClient.me.updateProfile(input));
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-lg font-bold uppercase tracking-wide">Perfil de treino</h2>
      <p className="mb-4 text-sm text-muted">Tudo opcional, exceto o nome. Ajuda a organizar sua rotina.</p>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2">
            <Alert>{error}</Alert>
          </div>
        )}
        <Field label="Nome" htmlFor="p-name">
          <Input id="p-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Nascimento" htmlFor="p-birth" hint="Para alterar, fale com o suporte.">
          <Input id="p-birth" disabled value={me.birthDate ? new Date(`${me.birthDate}T12:00:00`).toLocaleDateString('pt-BR') : '—'} />
        </Field>
        <Field label="Altura (cm)" htmlFor="p-height">
          <Input id="p-height" inputMode="numeric" placeholder="Ex.: 175" value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, ''))} maxLength={3} />
        </Field>
        <Field label="Peso (kg)" htmlFor="p-weight" hint="O histórico com gráfico chega na Etapa 5.">
          <Input id="p-weight" inputMode="decimal" placeholder="Ex.: 72,5" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d.,]/g, ''))} maxLength={6} />
        </Field>
        <Field label="Objetivo" htmlFor="p-goal">
          <Select id="p-goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="">—</option>
            {GOALS.map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nível de experiência" htmlFor="p-level">
          <Select id="p-level" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">—</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {EXPERIENCE_LABELS[d]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Duração desejada do treino" htmlFor="p-minutes">
          <Select id="p-minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)}>
            <option value="">—</option>
            {DURATIONS.map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Dias disponíveis">
          <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Dias disponíveis">
            {WEEKDAY_SHORT.map((d, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
                  className={cn('h-11 rounded-xl text-xs font-bold uppercase', on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={pending}>
            Salvar perfil
          </Button>
          {saved && <span className="text-sm text-success">Perfil salvo.</span>}
        </div>
        <p className="text-xs text-faint sm:col-span-2">Foto de perfil: chega com o armazenamento privado de arquivos (Etapa 3).</p>
      </form>
    </Card>
  );
}
