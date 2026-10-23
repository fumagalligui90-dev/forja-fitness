import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  type ExerciseDTO,
  type ExerciseInput,
} from '@forja/core';
import { useEffect, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { Banner, Button, Chips, Field, Input, Row, Title } from './ui';

const blank: Required<ExerciseInput> = { name: '', description: '', muscleGroup: 'chest', equipment: 'dumbbell', difficulty: 'beginner', instructions: '' };

/** Cria ou edita um exercício particular. */
export function ExerciseFormModal({
  visible,
  editing,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editing: ExerciseDTO | null;
  onClose: () => void;
  onSaved: (e: ExerciseDTO) => void;
}) {
  const { colors } = useTheme();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setForm(editing ? { name: editing.name, description: editing.description, muscleGroup: editing.muscleGroup, equipment: editing.equipment, difficulty: editing.difficulty, instructions: editing.instructions } : blank);
  }, [visible, editing]);

  async function save() {
    setPending(true);
    setError(null);
    try {
      onSaved(editing ? await api.exercises.update(editing.id, form) : await api.exercises.create(form));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Row style={{ paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'space-between' }}>
          <Title size={22}>{editing ? 'Editar exercício' : 'Novo exercício'}</Title>
          <Button title="Cancelar" variant="ghost" size="sm" onPress={onClose} />
        </Row>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {error && <Banner>{error}</Banner>}
          <Field label="Nome">
            <Input value={form.name} onChangeText={(name) => setForm({ ...form, name })} maxLength={80} />
          </Field>
          <Field label="Grupo muscular">
            <Chips options={MUSCLE_GROUPS.map((m) => ({ value: m, label: MUSCLE_GROUP_LABELS[m] }))} value={form.muscleGroup} onChange={(muscleGroup) => setForm({ ...form, muscleGroup })} />
          </Field>
          <Field label="Equipamento">
            <Chips options={EQUIPMENT.map((m) => ({ value: m, label: EQUIPMENT_LABELS[m] }))} value={form.equipment} onChange={(equipment) => setForm({ ...form, equipment })} />
          </Field>
          <Field label="Nível">
            <Chips options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))} value={form.difficulty} onChange={(difficulty) => setForm({ ...form, difficulty })} />
          </Field>
          <Field label="Descrição (opcional)">
            <Input value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline style={{ minHeight: 80, paddingTop: 12 }} maxLength={1000} />
          </Field>
          <Field label="Instruções de execução (opcional)">
            <Input value={form.instructions} onChangeText={(instructions) => setForm({ ...form, instructions })} multiline style={{ minHeight: 100, paddingTop: 12 }} maxLength={3000} />
          </Field>
          <Button title="Salvar" size="lg" onPress={save} loading={pending} disabled={form.name.trim().length < 2} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
