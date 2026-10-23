import { BRAND } from '@forja/core';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { useTheme } from '@/lib/theme';

/** Marca provisória (o admin poderá trocar nome/cores na Etapa 6). */
export function BrandLogo({ size = 22 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={BRAND.name}>
      <View style={{ width: size + 12, height: size + 12, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="barbell" size={size} color={colors.accentInk} />
      </View>
      <Text style={{ fontSize: size - 2, fontWeight: '900', letterSpacing: 1.6, color: colors.text }}>
        {BRAND.shortName}
        <Text style={{ color: colors.accent }}> FITNESS</Text>
      </Text>
    </View>
  );
}
