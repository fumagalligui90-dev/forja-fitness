import {
  exerciseMuscles,
  MUSCLE_LABELS,
  MUSCLE_MAP,
  MUSCLE_MAP_VIEWBOX,
  type ExerciseDTO,
  type Muscle,
} from '@forja/core';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { API_URL } from '@/lib/config';
import { useTheme } from '@/lib/theme';
import { Icon, Text } from './ui';

/** Fotos ficam no servidor web (public/exercicios); o app monta a URL completa. */
export const imageUrl = (path: string) => (/^https?:/.test(path) ? path : `${API_URL}${path}`);

// ------------------------------------------------------------------ Mapa muscular

function Body({ view, primary, secondary, height }: { view: 'front' | 'back'; primary: Muscle[]; secondary: Muscle[]; height: number }) {
  const { colors } = useTheme();
  const side = MUSCLE_MAP[view];
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Svg viewBox={MUSCLE_MAP_VIEWBOX} width={height * 0.333} height={height} accessibilityLabel={view === 'front' ? 'Corpo de frente' : 'Corpo de costas'}>
        {side.neutral.map((d, i) => (
          <Path key={`n${i}`} d={d} fill={colors.surface3} />
        ))}
        {side.regions.map(([m, d], i) => (
          <Path
            key={i}
            d={d}
            fill={primary.includes(m) ? colors.accent : secondary.includes(m) ? `${colors.accent}8c` : colors.line}
          />
        ))}
      </Svg>
      <Text tone="faint" style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
        {view === 'front' ? 'FRENTE' : 'COSTAS'}
      </Text>
    </View>
  );
}

export function MuscleMap({ exercise, height = 220 }: { exercise: ExerciseDTO; height?: number }) {
  const { primary, secondary } = exerciseMuscles(exercise);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28 }}>
      <Body view="front" primary={primary} secondary={secondary} height={height} />
      <Body view="back" primary={primary} secondary={secondary} height={height} />
    </View>
  );
}

function ChipGroup({ label, dot, items, accent }: { label: string; dot: string; items: Muscle[]; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
        <Text tone="muted" style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>
          {label}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.map((m) => (
          <View key={m} style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: accent ? colors.accentSoft : colors.surface3 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: accent ? colors.accent : colors.muted }}>{MUSCLE_LABELS[m]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function MuscleChips({ exercise }: { exercise: ExerciseDTO }) {
  const { colors } = useTheme();
  const { primary, secondary } = exerciseMuscles(exercise);
  return (
    <View style={{ gap: 12 }}>
      <ChipGroup label="PRINCIPAL" dot={colors.accent} items={primary} accent />
      {secondary.length > 0 && <ChipGroup label="SECUNDÁRIO" dot={`${colors.accent}8c`} items={secondary} />}
    </View>
  );
}

// ------------------------------------------------------------------ Fotos / animação

/** Alterna as fotos de posição inicial e final (animação simples do movimento). */
export function ExerciseAnimation({ exercise, style }: { exercise: ExerciseDTO; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const [frame, setFrame] = useState(0);
  const [reduced, setReduced] = useState(false);
  const frames = exercise.images;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
  }, []);
  useEffect(() => {
    if (reduced || frames.length < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 1100);
    return () => clearInterval(t);
  }, [reduced, frames.length]);

  if (frames.length === 0) {
    return (
      <View style={[{ backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }, style]}>
        <MuscleMap exercise={exercise} height={200} />
      </View>
    );
  }
  return (
    <View style={[{ backgroundColor: '#fff', overflow: 'hidden', aspectRatio: 4 / 3 }, style]}>
      {frames.map((src, i) => (
        <Image
          key={src}
          source={{ uri: imageUrl(src) }}
          accessibilityLabel={i === 0 ? 'Posição inicial' : 'Posição final'}
          resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: i === frame ? 1 : 0 }}
        />
      ))}
      {frames.length > 1 && (
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            alignSelf: 'center',
            flexDirection: 'row',
            gap: 6,
            backgroundColor: 'rgba(0,0,0,0.45)',
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 6,
          }}
        >
          {frames.map((_, i) => (
            <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === frame ? colors.accent : 'rgba(255,255,255,0.6)' }} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Miniatura quadrada para listas. */
export function ExerciseThumb({ exercise, size = 56 }: { exercise: ExerciseDTO; size?: number }) {
  const { colors } = useTheme();
  const src = exercise.images[0];
  return (
    <View style={{ width: size, height: size, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' }}>
      {src ? <Image source={{ uri: imageUrl(src) }} style={{ width: size, height: size }} resizeMode="cover" /> : <Icon name="barbell-outline" color={colors.faint} size={size / 2} />}
    </View>
  );
}
