import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, type Difficulty, type ExerciseDTO } from '@forja/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { ExerciseFormModal } from '@/components/exercise-form';
import { ExerciseAnimation, MuscleChips, MuscleMap } from '@/components/exercise-visuals';
import { Badge, Banner, Button, Card, confirmAction, haptic, Icon, Loading, Row, Text, Title } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme';

const DOTS: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };

/** Divide as instruções em passos curtos (uma frase por passo). */
function steps(text: string) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ExerciseDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [e, setE] = useState<ExerciseDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    api.exercises
      .get(id)
      .then((r) => {
        setE(r);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id]);
  useEffect(load, [load]);

  async function toggleFavorite() {
    if (!e) return;
    haptic();
    setE({ ...e, isFavorite: !e.isFavorite });
    try {
      await api.exercises.favorite(e.id, !e.isFavorite);
    } catch (err) {
      setE({ ...e });
      setError(errorMessage(err));
    }
  }

  function archive() {
    if (!e) return;
    confirmAction('Remover exercício', `"${e.name}" sai da biblioteca. Treinos e históricos que já o usam continuam intactos.`, 'Remover', () =>
      api.exercises
        .archive(e.id)
        .then(() => router.back())
        .catch((err) => setError(errorMessage(err))),
    );
  }

  if (!e) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Stack.Screen options={{ title: 'Exercício' }} />
        {error ? <Banner>{error}</Banner> : <Loading />}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable
              onPress={toggleFavorite}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={e.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Icon name={e.isFavorite ? 'star' : 'star-outline'} color={e.isFavorite ? colors.accent : colors.text} size={24} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {e.images.length > 0 && <ExerciseAnimation exercise={e} />}
        <View style={{ padding: 16, gap: 16 }}>
          {error && <Banner>{error}</Banner>}
          <View style={{ gap: 8 }}>
            <Title size={26}>{e.name}</Title>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              <Badge label={MUSCLE_GROUP_LABELS[e.muscleGroup]} />
              <Badge label={EQUIPMENT_LABELS[e.equipment]} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{DIFFICULTY_LABELS[e.difficulty]}</Text>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3].map((n) => (
                    <View key={n} style={{ width: 10, height: 5, borderRadius: 3, backgroundColor: n <= DOTS[e.difficulty] ? colors.accent : colors.line }} />
                  ))}
                </View>
              </View>
              {e.isOwn && <Badge label="Meu" tone="accent" />}
            </Row>
          </View>

          <Card style={{ gap: 16 }}>
            <Text tone="muted" style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>
              MÚSCULOS TRABALHADOS
            </Text>
            <MuscleMap exercise={e} />
            <MuscleChips exercise={e} />
          </Card>

          <View style={{ gap: 10 }}>
            <Title size={20}>Como fazer</Title>
            {!!e.description && <Text tone="muted">{e.description}</Text>}
            {steps(e.instructions).length === 0 ? (
              <Text tone="muted">Sem instruções cadastradas.</Text>
            ) : (
              steps(e.instructions).map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '800' }}>{i + 1}</Text>
                  </View>
                  <Text tone="muted" style={{ flex: 1, lineHeight: 21 }}>
                    {s}
                  </Text>
                </View>
              ))
            )}
          </View>

          {e.images.length > 0 && (
            <Text tone="faint" style={{ fontSize: 11 }} onPress={() => void Linking.openURL('https://github.com/yuhonas/free-exercise-db')}>
              Fotos: Free Exercise DB (domínio público)
            </Text>
          )}

          {e.isOwn && (
            <Row>
              <Button title="Editar" icon="create-outline" variant="secondary" size="sm" onPress={() => setEditing(true)} />
              <Button title="Remover" icon="trash-outline" variant="danger" size="sm" onPress={archive} />
            </Row>
          )}
        </View>
      </ScrollView>
      <ExerciseFormModal
        visible={editing}
        editing={e}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          load();
        }}
      />
    </>
  );
}
