import { DIFFICULTY_LABELS, type ExerciseDTO } from '@forja/core';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { emptyFilter, ExerciseFilters, ExerciseRow, useExercises } from '@/components/exercise-list';
import { ExerciseFormModal } from '@/components/exercise-form';
import { Banner, Button, confirmAction, Empty, Icon, Loading, Row, Text, Title } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme';

export default function Exercises() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState(emptyFilter);
  const [reload, setReload] = useState(0);
  const { items, error, setItems } = useExercises(filter, reload);
  const [expanded, setExpanded] = useState<string | null>(null);
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

  function archive(e: ExerciseDTO) {
    confirmAction('Remover exercício', `"${e.name}" sai da biblioteca. Treinos e históricos que já o usam continuam intactos.`, 'Remover', () =>
      api.exercises
        .archive(e.id)
        .then(() => setReload((n) => n + 1))
        .catch((err) => setActionError(errorMessage(err))),
    );
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
            <View>
              <ExerciseRow
                e={e}
                onPress={() => setExpanded(expanded === e.id ? null : e.id)}
                right={
                  <Pressable
                    onPress={() => toggleFavorite(e)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={e.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Icon name={e.isFavorite ? 'star' : 'star-outline'} color={e.isFavorite ? colors.accent : colors.faint} size={22} />
                  </Pressable>
                }
              />
              {expanded === e.id && (
                <View style={{ padding: 14, gap: 8 }}>
                  <Text tone="faint" style={{ fontSize: 13 }}>
                    Nível: {DIFFICULTY_LABELS[e.difficulty]}
                  </Text>
                  {!!e.description && <Text tone="muted">{e.description}</Text>}
                  <Text tone="muted">{e.instructions || 'Sem instruções cadastradas.'}</Text>
                  <Text tone="faint" style={{ fontSize: 12 }}>
                    Mídia demonstrativa: indisponível (aguardando conteúdo licenciado).
                  </Text>
                  {e.isOwn && (
                    <Row>
                      <Button
                        title="Editar"
                        icon="create-outline"
                        variant="secondary"
                        size="sm"
                        onPress={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                      />
                      <Button title="Remover" icon="trash-outline" variant="danger" size="sm" onPress={() => archive(e)} />
                    </Row>
                  )}
                </View>
              )}
            </View>
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
