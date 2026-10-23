import { formatDuration, formatKg, type SessionListItemDTO } from '@forja/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Banner, Button, Empty, Icon, Loading, Overline, Text, Title } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useApiOnFocus } from '@/lib/use-api';

const PAGE = 20;

export default function History() {
  const { colors } = useTheme();
  const { data, error, loading, reload, setData } = useApiOnFocus(() => api.sessions.list({ limit: PAGE }));
  const [more, setMore] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  async function loadMore() {
    if (!data?.length) return;
    setMore(true);
    try {
      const page = await api.sessions.list({ limit: PAGE, before: data.at(-1)!.startedAt });
      setData([...data, ...page]);
      setNoMore(page.length < PAGE);
    } catch (err) {
      setMoreError(errorMessage(err));
    } finally {
      setMore(false);
    }
  }

  const sections: { title: string; data: SessionListItemDTO[] }[] = [];
  for (const s of data ?? []) {
    const title = new Date(s.startedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(s);
    else sections.push({ title, data: [s] });
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 8 }}>
        <Title>Histórico</Title>
        {(error || moreError) && <Banner>{error ?? moreError ?? ''}</Banner>}
      </View>
      {!data ? (
        !error && <Loading />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          renderSectionHeader={({ section }) => (
            <Overline tone="faint" style={{ paddingTop: 12, paddingBottom: 4, backgroundColor: colors.bg }}>
              {section.title}
            </Overline>
          )}
          ListEmptyComponent={<Empty icon="time-outline" title="Sem treinos ainda" text="Quando você finalizar um treino, ele aparece aqui com duração, séries e volume." />}
          ListFooterComponent={data.length >= PAGE && !noMore ? <Button title="Carregar mais" variant="secondary" loading={more} onPress={loadMore} style={{ marginTop: 8 }} /> : undefined}
          renderItem={({ item: s }) => (
            <Pressable
              onPress={() => router.push(`/resumo/${s.id}`)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, marginBottom: 8 }}
            >
              <View style={{ width: 44, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '900' }}>{new Date(s.startedAt).getDate()}</Text>
                <Text tone="faint" style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  {new Date(s.startedAt).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                    {s.workoutName}
                  </Text>
                  {s.status === 'abandoned' && <Badge label="Descartado" tone="warning" />}
                </View>
                <Text tone="muted" style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>
                  {formatDuration(s.durationMs)} · {s.setCount} séries{s.volumeKg > 0 ? ` · ${formatKg(s.volumeKg)}` : ''}
                </Text>
              </View>
              <Icon name="chevron-forward" color={colors.faint} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
