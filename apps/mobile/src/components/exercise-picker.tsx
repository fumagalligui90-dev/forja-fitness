import type { ExerciseDTO } from '@forja/core';
import { useEffect, useState } from 'react';
import { FlatList, Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';
import { emptyFilter, ExerciseFilters, ExerciseRow, useExercises, type ExerciseFilter } from './exercise-list';
import { Banner, Button, Loading, Row, Text, Title } from './ui';

/**
 * Seletor de exercícios em tela cheia. `multiple` = montar treino;
 * sem ele escolhe um (substituição durante a sessão).
 */
export function ExercisePicker({
  visible,
  onClose,
  onPick,
  multiple,
  title = 'Adicionar exercícios',
  initialMuscle,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (items: ExerciseDTO[]) => void;
  multiple?: boolean;
  title?: string;
  initialMuscle?: ExerciseDTO['muscleGroup'];
}) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<ExerciseFilter>(emptyFilter);
  const [selected, setSelected] = useState<Map<string, ExerciseDTO>>(new Map());
  const { items, error } = useExercises(filter);

  useEffect(() => {
    if (visible) {
      setFilter({ ...emptyFilter, muscleGroup: initialMuscle ?? '' });
      setSelected(new Map());
    }
  }, [visible, initialMuscle]);

  function toggle(e: ExerciseDTO) {
    if (!multiple) return onPick([e]);
    const next = new Map(selected);
    if (next.has(e.id)) next.delete(e.id);
    else next.set(e.id, e);
    setSelected(next);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Row style={{ paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'space-between' }}>
          <Title size={22}>{title}</Title>
          <Button title="Fechar" variant="ghost" size="sm" onPress={onClose} />
        </Row>
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <ExerciseFilters value={filter} onChange={setFilter} />
        </View>
        {error && (
          <View style={{ paddingHorizontal: 16 }}>
            <Banner>{error}</Banner>
          </View>
        )}
        {!items ? (
          <Loading />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 8, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text tone="muted" style={{ textAlign: 'center', paddingVertical: 32 }}>
                Nenhum exercício encontrado.
              </Text>
            }
            renderItem={({ item }) => <ExerciseRow e={item} onPress={() => toggle(item)} selected={multiple ? selected.has(item.id) : undefined} />}
          />
        )}
        {multiple && (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line }}>
            <SafeAreaView edges={['bottom']}>
              <Button
                title={selected.size ? `Adicionar (${selected.size})` : 'Selecione exercícios'}
                size="lg"
                disabled={selected.size === 0}
                onPress={() => onPick([...selected.values()])}
              />
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
