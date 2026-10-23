import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  type Equipment,
  type ExerciseDTO,
  type MuscleGroup,
} from '@forja/core';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { Badge, Icon, Input, Row, Text } from './ui';

export interface ExerciseFilter {
  q: string;
  muscleGroup: MuscleGroup | '';
  equipment: Equipment | '';
  scope: 'all' | 'mine' | 'favorites';
}
export const emptyFilter: ExerciseFilter = { q: '', muscleGroup: '', equipment: '', scope: 'all' };

/** Busca com debounce; recarrega quando `reloadKey` muda. */
export function useExercises(filter: ExerciseFilter, reloadKey = 0) {
  const [items, setItems] = useState<ExerciseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api.exercises
        .list({ q: filter.q.trim() || undefined, muscleGroup: filter.muscleGroup || undefined, equipment: filter.equipment || undefined, scope: filter.scope }, ctrl.signal)
        .then((r) => {
          setItems(r);
          setError(null);
        })
        .catch((e) => {
          if ((e as Error).name !== 'AbortError') setError(errorMessage(e));
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [filter.q, filter.muscleGroup, filter.equipment, filter.scope, reloadKey]);
  return { items, error, setItems };
}

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: on ? colors.accent : colors.line,
        backgroundColor: on ? colors.accentSoft : colors.surface2,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: on ? colors.accent : colors.muted }}>{label}</Text>
    </Pressable>
  );
}

export function ExerciseFilters({ value, onChange }: { value: ExerciseFilter; onChange: (f: ExerciseFilter) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <Input
        placeholder="Buscar por nome, músculo ou equipamento"
        value={value.q}
        onChangeText={(q) => onChange({ ...value, q })}
        returnKeyType="search"
        accessibilityLabel="Buscar exercícios"
        clearButtonMode="while-editing"
      />
      <Row gap={8}>
        {(
          [
            ['all', 'Todos'],
            ['favorites', 'Favoritos'],
            ['mine', 'Meus'],
          ] as const
        ).map(([k, label]) => (
          <Pill key={k} label={label} on={value.scope === k} onPress={() => onChange({ ...value, scope: k })} />
        ))}
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {MUSCLE_GROUPS.map((m) => (
          <Pill
            key={m}
            label={MUSCLE_GROUP_LABELS[m]}
            on={value.muscleGroup === m}
            onPress={() => onChange({ ...value, muscleGroup: value.muscleGroup === m ? '' : m })}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {EQUIPMENT.map((e) => (
          <Pill key={e} label={EQUIPMENT_LABELS[e]} on={value.equipment === e} onPress={() => onChange({ ...value, equipment: value.equipment === e ? '' : e })} />
        ))}
      </ScrollView>
    </View>
  );
}

export function ExerciseRow({
  e,
  onPress,
  right,
  selected,
}: {
  e: ExerciseDTO;
  onPress?: () => void;
  right?: React.ReactNode;
  selected?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected !== undefined ? { selected } : undefined}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.line,
        backgroundColor: selected ? colors.accentSoft : colors.surface,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontWeight: '700' }} numberOfLines={1}>
          {e.name}
        </Text>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <Text tone="muted" style={{ fontSize: 13 }}>
            {MUSCLE_GROUP_LABELS[e.muscleGroup]} · {EQUIPMENT_LABELS[e.equipment]}
          </Text>
          {e.isOwn && <Badge label="Meu" tone="accent" />}
          {e.isDemo && <Badge label="Demo" />}
        </Row>
      </View>
      {selected !== undefined && <Icon name={selected ? 'checkmark-circle' : 'ellipse-outline'} color={selected ? colors.accent : colors.faint} size={24} />}
      {right}
    </Pressable>
  );
}
