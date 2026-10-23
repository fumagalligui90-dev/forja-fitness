import {
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  TECHNIQUE_LABELS,
  TECHNIQUES,
  WEEKDAY_SHORT,
  workoutInputSchema,
  type ExerciseDTO,
  type Technique,
  type WorkoutDTO,
} from '@forja/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExercisePicker } from '@/components/exercise-picker';
import { Stepper } from '@/components/stepper';
import { Banner, Button, Card, Chips, confirmAction, Field, Input, Loading, Row, Text, Title } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { parseNum, toBr } from '@/lib/format';
import { useTheme } from '@/lib/theme';

interface Item {
  uid: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: ExerciseDTO['muscleGroup'];
  equipment: ExerciseDTO['equipment'];
  sets: string;
  repsMin: string;
  repsMax: string;
  targetLoadKg: string;
  restSeconds: number;
  technique: Technique;
  notes: string;
}

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180, 240];
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const uid = () => Math.random().toString(36).slice(2, 10);
const restLabel = (s: number) => (s === 0 ? 'Sem' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}min${s % 60 ? `${s % 60}` : ''}`);

function fromDTO(w: WorkoutDTO): Item[] {
  return w.exercises.map((e) => ({
    uid: uid(),
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    sets: String(e.sets),
    repsMin: String(e.repsMin),
    repsMax: String(e.repsMax),
    targetLoadKg: e.targetLoadKg == null ? '' : toBr(e.targetLoadKg),
    restSeconds: e.restSeconds,
    technique: e.technique,
    notes: e.notes,
  }));
}

export default function WorkoutEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'novo';
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    api.workouts
      .get(id)
      .then((w) => {
        setName(w.name);
        setLabel(w.label);
        setNotes(w.notes);
        setWeekdays(w.weekdays);
        setItems(fromDTO(w));
        setLoaded(true);
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, [id, isNew]);

  const update = (u: string, patch: Partial<Item>) => setItems((l) => l.map((i) => (i.uid === u ? { ...i, ...patch } : i)));
  const move = (from: number, to: number) =>
    setItems((l) => {
      if (to < 0 || to >= l.length) return l;
      const next = [...l];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x!);
      return next;
    });
  const step = (u: string, key: 'sets' | 'repsMin' | 'repsMax' | 'targetLoadKg', delta: number) => {
    const item = items.find((i) => i.uid === u);
    if (!item) return;
    const v = Math.max(key === 'targetLoadKg' ? 0 : 1, (parseNum(item[key]) ?? 0) + delta);
    update(u, { [key]: toBr(Math.round(v * 100) / 100) });
  };

  function add(list: ExerciseDTO[]) {
    const added = list.map((e) => ({
      uid: uid(),
      exerciseId: e.id,
      exerciseName: e.name,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      sets: '3',
      repsMin: e.muscleGroup === 'cardio' ? '1' : '8',
      repsMax: e.muscleGroup === 'cardio' ? '1' : '12',
      targetLoadKg: '',
      restSeconds: e.muscleGroup === 'cardio' ? 0 : 90,
      technique: 'normal' as const,
      notes: '',
    }));
    setItems((l) => [...l, ...added]);
    setPicker(false);
  }

  async function save() {
    setError(null);
    const payload = {
      name,
      label,
      notes,
      weekdays,
      exercises: items.map((i) => ({
        exerciseId: i.exerciseId,
        sets: parseNum(i.sets) ?? NaN,
        repsMin: parseNum(i.repsMin) ?? NaN,
        repsMax: parseNum(i.repsMax) ?? NaN,
        targetLoadKg: parseNum(i.targetLoadKg),
        restSeconds: i.restSeconds,
        technique: i.technique,
        notes: i.notes,
      })),
    };
    // Mesmo schema do servidor, para feedback imediato.
    const check = workoutInputSchema.safeParse(payload);
    if (!check.success) {
      const issue = check.error.issues[0]!;
      const idx = issue.path[0] === 'exercises' ? Number(issue.path[1]) : -1;
      const where = idx >= 0 && items[idx] ? `${items[idx]!.exerciseName}: ` : '';
      return setError(`${where}${issue.code === 'invalid_type' ? 'preencha os números' : issue.message}`);
    }
    setSaving(true);
    try {
      if (isNew) await api.workouts.create(payload);
      else await api.workouts.update(id, payload);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    confirmAction('Excluir treino', 'O treino sai da sua lista. As sessões já realizadas continuam no histórico.', 'Excluir', () =>
      api.workouts
        .archive(id)
        .then(() => router.back())
        .catch((e) => setError(errorMessage(e))),
    );
  }

  if (loadError) return <Banner>{loadError}</Banner>;
  if (!loaded) return <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isNew ? 'Novo treino' : 'Editar treino' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 14 }}>
          <Field label="Letra">
            <Chips options={[{ value: '', label: '—' }, ...LABELS.map((l) => ({ value: l, label: l }))]} value={label} onChange={setLabel} />
          </Field>
          <Field label="Nome do treino">
            <Input value={name} onChangeText={setName} placeholder="Ex.: Peito e Tríceps" maxLength={60} />
          </Field>
          <Field label="Dias da semana" hint="O treino aparece como “treino do dia” nesses dias.">
            <Chips
              multiple
              options={WEEKDAY_SHORT.map((d, i) => ({ value: i, label: d }))}
              value={weekdays}
              onChange={(d) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d]))}
            />
          </Field>
          <Field label="Observações (opcional)">
            <Input value={notes} onChangeText={setNotes} multiline maxLength={1000} style={{ minHeight: 70, paddingTop: 12 }} />
          </Field>
        </Card>

        <Row style={{ justifyContent: 'space-between' }}>
          <Title size={20}>Exercícios ({items.length})</Title>
          <Button title="Adicionar" icon="add" variant="secondary" size="sm" onPress={() => setPicker(true)} />
        </Row>

        {items.length === 0 && (
          <Button title="Adicionar exercícios da biblioteca" icon="add" variant="secondary" size="lg" onPress={() => setPicker(true)} />
        )}

        {items.map((item, idx) => {
          const open = openItem === item.uid;
          return (
            <Card key={item.uid} style={{ padding: 0, overflow: 'hidden' }}>
              <Pressable onPress={() => setOpenItem(open ? null : item.uid)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="button" accessibilityState={{ expanded: open }}>
                <Text tone="accent" style={{ fontSize: 18, fontWeight: '900', width: 22 }}>
                  {idx + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700' }} numberOfLines={1}>
                    {item.exerciseName}
                  </Text>
                  <Text tone="faint" style={{ fontSize: 12 }}>
                    {item.sets}× {item.repsMin === item.repsMax ? item.repsMin : `${item.repsMin}–${item.repsMax}`}
                    {item.targetLoadKg ? ` · ${item.targetLoadKg} kg` : ''} · {restLabel(item.restSeconds)}
                    {item.technique !== 'normal' ? ` · ${TECHNIQUE_LABELS[item.technique]}` : ''}
                  </Text>
                </View>
                <Button icon="arrow-up" variant="ghost" size="sm" square disabled={idx === 0} accessibilityLabel="Mover para cima" onPress={() => move(idx, idx - 1)} />
                <Button icon="arrow-down" variant="ghost" size="sm" square disabled={idx === items.length - 1} accessibilityLabel="Mover para baixo" onPress={() => move(idx, idx + 1)} />
              </Pressable>
              {open && (
                <View style={{ padding: 14, paddingTop: 0, gap: 12 }}>
                  <Text tone="faint" style={{ fontSize: 12 }}>
                    {MUSCLE_GROUP_LABELS[item.muscleGroup]} · {EQUIPMENT_LABELS[item.equipment]}
                  </Text>
                  <Row gap={10}>
                    <Stepper label="Séries" value={item.sets} onChange={(v) => update(item.uid, { sets: v })} onStep={(d) => step(item.uid, 'sets', d)} />
                    <Stepper label="Carga (kg)" decimal placeholder="—" value={item.targetLoadKg} onChange={(v) => update(item.uid, { targetLoadKg: v })} onStep={(d) => step(item.uid, 'targetLoadKg', d * 2.5)} />
                  </Row>
                  <Row gap={10}>
                    <Stepper label="Reps mín." value={item.repsMin} onChange={(v) => update(item.uid, { repsMin: v })} onStep={(d) => step(item.uid, 'repsMin', d)} />
                    <Stepper label="Reps máx." value={item.repsMax} onChange={(v) => update(item.uid, { repsMax: v })} onStep={(d) => step(item.uid, 'repsMax', d)} />
                  </Row>
                  <Field label="Descanso">
                    <Chips options={REST_OPTIONS.map((s) => ({ value: s, label: restLabel(s) }))} value={item.restSeconds} onChange={(s) => update(item.uid, { restSeconds: s })} />
                  </Field>
                  <Field label="Técnica">
                    <Chips options={TECHNIQUES.map((t) => ({ value: t, label: TECHNIQUE_LABELS[t] }))} value={item.technique} onChange={(t) => update(item.uid, { technique: t })} />
                  </Field>
                  <Field label="Observações">
                    <Input value={item.notes} onChangeText={(v) => update(item.uid, { notes: v })} placeholder="Ex.: cadência 3-1-1" maxLength={500} />
                  </Field>
                  <Button title="Remover do treino" icon="close" variant="danger" size="sm" onPress={() => setItems((l) => l.filter((i) => i.uid !== item.uid))} />
                </View>
              )}
            </Card>
          );
        })}

        {!isNew && <Button title="Excluir treino" icon="trash-outline" variant="danger" onPress={remove} />}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, padding: 12, gap: 8 }}>
        {error && <Banner>{error}</Banner>}
        <Button title="Salvar treino" icon="save-outline" size="lg" onPress={save} loading={saving} />
      </SafeAreaView>

      <ExercisePicker visible={picker} onClose={() => setPicker(false)} onPick={add} multiple />
    </KeyboardAvoidingView>
  );
}
