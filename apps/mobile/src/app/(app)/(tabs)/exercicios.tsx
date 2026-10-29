import { type ExerciseDTO } from '@forja/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { emptyFilter, ExerciseFilters, ExerciseRow, useExercises } from '@/components/exercise-list';
import { ExerciseFormModal } from '@/components/exercise-form';
import { Banner, Button, Empty, Icon, Loading, Row, Text, Title } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme';

export default function Exercises() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState(emptyFilter);
  const [reload, setReload] = useState(0);
  const { items, error, setItems } = useExercises(filter, reload);
  // Ao voltar do detalhe, recarrega (favorito ou edição feitos lá).
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) setReload((n) => n + 1);
      focused.current = true;
    }, []),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleFavorite(e: ExerciseDTO) {
    setItems((l) => l?.map((x) => (x.id === e.id ? { ...x, isFavorite: !e.isFavorite } : x)) ?? null);
    try {
      await api.exercises.favorite(e.id, !e.isFavorite);
    } catch (err) {
      setItems((l) => l?.map((x) => (x.id === e.id ? { ...x, isFavorite: e.isFavorite } : x)) ?? null);
      setActionError(errorMessage(err));
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Title>Exercícios</Title>
          <Button
            title="Novo"
            icon="add"
            size="sm"
            onPress={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          />
        </Row>
        <ExerciseFilters value={filter} onChange={setFilter} />
        {items && items.length > 0 && (
          <Text tone="faint" style={{ fontSize: 12 }}>
            {items.length} {items.length === 1 ? 'exercício' : 'exercícios'} · toque para ver o movimento e os músculos
          </Text>
        )}
        {(error || actionError) && <Banner>{error ?? actionError ?? ''}</Banner>}
      </View>
      {!items ? (
        <Loading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
          ListEmptyComponent={
            <Empty
              icon="library-outline"
              title="Nada por aqui"
              text={
                filter.scope === 'favorites'
                  ? 'Toque na estrela de um exercício para favoritá-lo.'
                  : filter.scope === 'mine'
                    ? 'Crie exercícios próprios para variações que não estão na biblioteca.'
                    : 'Nenhum exercício corresponde à busca.'
              }
            />
          }
          renderItem={({ item: e }) => (
            <ExerciseRow
              e={e}
              onPress={() => router.push({ pathname: '/exercicio/[id]', params: { id: e.id } })}
              right={
                <Pressable
                  onPress={() => toggleFavorite(e)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={e.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name={e.isFavorite ? 'star' : 'star-outline'} color={e.isFavorite ? colors.accent : colors.faint} size={22} />
                </Pressable>
              }
            />
          )}
        />
      )}
      <ExerciseFormModal
        visible={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setReload((n) => n + 1);
        }}
      />
    </SafeAreaView>
  );
}
