import { Pressable, TextInput, View } from 'react-native';
import { haptic, Icon, Text } from './ui';
import { radius, useTheme } from '@/lib/theme';

/** Campo numérico com botões grandes de −/+ (uso com uma mão). */
export function Stepper({
  label,
  value,
  onChange,
  onStep,
  decimal,
  placeholder,
  big,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onStep: (dir: 1 | -1) => void;
  decimal?: boolean;
  placeholder?: string;
  big?: boolean;
}) {
  const { colors } = useTheme();
  const h = big ? 60 : 48;
  const btn = (dir: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'Aumentar' : 'Diminuir'} ${label}`}
      onPress={() => {
        haptic('light');
        onStep(dir);
      }}
      style={({ pressed }) => ({ width: big ? 52 : 44, height: h, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.surface3 : 'transparent' })}
    >
      <Icon name={dir > 0 ? 'add' : 'remove'} color={colors.muted} size={22} />
    </Pressable>
  );
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text tone="muted" style={{ fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden' }}>
        {btn(-1)}
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(decimal ? /[^\d.,]/g : /\D/g, ''))}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          accessibilityLabel={label}
          selectTextOnFocus
          style={{ flex: 1, minWidth: 0, height: h, textAlign: 'center', color: colors.text, fontSize: big ? 28 : 18, fontWeight: '900', fontVariant: ['tabular-nums'] }}
        />
        {btn(1)}
      </View>
    </View>
  );
}
