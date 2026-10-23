import { DIFFICULTIES, EXPERIENCE_LABELS, GOAL_LABELS, GOALS, profileInputSchema, WEEKDAY_SHORT, type Difficulty, type Goal } from '@forja/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Banner, Button, Chips, Field, Input, Loading, Screen, Text } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { parseNum, toBr } from '@/lib/format';
import { useMe } from '@/lib/me';

const DURATIONS = [30, 45, 60, 75, 90, 120];

export default function ProfileScreen() {
  const { me, setMe } = useMe();
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Difficulty | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setHeight(me.profile.heightCm ? String(me.profile.heightCm) : '');
    setWeight(me.profile.weightKg ? toBr(me.profile.weightKg) : '');
    setGoal(me.profile.goal);
    setLevel(me.profile.experienceLevel);
    setDays(me.profile.trainingDays);
    setMinutes(me.profile.sessionMinutes);
  }, [me]);

  async function save() {
    setError(null);
    const input = { name, heightCm: parseNum(height), weightKg: parseNum(weight), goal, experienceLevel: level, trainingDays: days, sessionMinutes: minutes };
    const check = profileInputSchema.safeParse(input);
    if (!check.success) return setError(check.error.issues[0]?.message ?? 'Dados inválidos.');
    setPending(true);
    try {
      setMe(await api.me.updateProfile(input));
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (!me) return <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Text tone="muted">Esses dados ajudam a organizar sua rotina. Tudo é opcional, exceto o nome.</Text>
        {error && <Banner>{error}</Banner>}
        <Field label="Nome">
          <Input value={name} onChangeText={setName} maxLength={80} />
        </Field>
        <Field label="Altura (cm)">
          <Input value={height} onChangeText={(v) => setHeight(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Ex.: 175" maxLength={3} />
        </Field>
        <Field label="Peso (kg)" hint="O histórico de peso com gráfico chega na Etapa 5.">
          <Input value={weight} onChangeText={(v) => setWeight(v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad" placeholder="Ex.: 72,5" maxLength={6} />
        </Field>
        <Field label="Objetivo">
          <Chips options={GOALS.map((g) => ({ value: g, label: GOAL_LABELS[g] }))} value={goal} onChange={(g) => setGoal(goal === g ? null : g)} />
        </Field>
        <Field label="Nível de experiência">
          <Chips options={DIFFICULTIES.map((d) => ({ value: d, label: EXPERIENCE_LABELS[d] }))} value={level} onChange={(d) => setLevel(level === d ? null : d)} />
        </Field>
        <Field label="Dias disponíveis para treinar">
          <Chips multiple options={WEEKDAY_SHORT.map((d, i) => ({ value: i, label: d }))} value={days} onChange={(d) => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]))} />
        </Field>
        <Field label="Duração desejada do treino">
          <Chips options={DURATIONS.map((m) => ({ value: m, label: `${m} min` }))} value={minutes} onChange={(m) => setMinutes(minutes === m ? null : m)} />
        </Field>
        <Text tone="faint" style={{ fontSize: 12 }}>
          Foto de perfil: chega com o armazenamento privado de arquivos (Etapa 3).
        </Text>
        <Button title="Salvar perfil" size="lg" loading={pending} onPress={save} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
