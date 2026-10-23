import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { radius, useTheme, type Colors } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.text} />;
}

/** Confirmação nativa (Alert) com alternativa no Expo web, onde Alert não exibe botões. */
export function confirmAction(title: string, message: string, confirmText: string, onConfirm: () => void, destructive = true) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export function haptic(kind: 'light' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else void Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
}

// ------------------------------------------------------------------ Texto

type Tone = 'text' | 'muted' | 'faint' | 'accent' | 'danger' | 'success' | 'warning';

export function Text({ tone = 'text', style, ...rest }: TextProps & { tone?: Tone }) {
  const { colors } = useTheme();
  return <RNText style={[{ color: colors[tone], fontSize: 15 }, style]} {...rest} />;
}

/** Títulos em caixa alta, condensados e pesados — identidade esportiva. */
export function Title({ size = 30, style, ...rest }: TextProps & { size?: number }) {
  const { colors } = useTheme();
  return (
    <RNText
      accessibilityRole="header"
      style={[{ color: colors.text, fontSize: size, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }, style]}
      {...rest}
    />
  );
}

export function Overline({ style, tone = 'accent', ...rest }: TextProps & { tone?: Tone }) {
  return <Text tone={tone} style={[{ fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase' }, style]} {...rest} />;
}

// ------------------------------------------------------------------ Layout

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding: 16, paddingBottom: 40, gap: 16 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, padding: 16 }, style]}>
      {children}
    </View>
  );
}

export function Row({ style, children, gap = 8 }: { style?: StyleProp<ViewStyle>; children: ReactNode; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

// ------------------------------------------------------------------ Botões

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const heights: Record<Size, number> = { sm: 36, md: 44, lg: 56, xl: 64 };

function variantStyle(v: Variant, c: Colors): { box: ViewStyle; text: string } {
  switch (v) {
    case 'primary':
      return { box: { backgroundColor: c.accent }, text: c.accentInk };
    case 'secondary':
      return { box: { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line }, text: c.text };
    case 'ghost':
      return { box: { backgroundColor: 'transparent' }, text: c.muted };
    case 'danger':
      return { box: { backgroundColor: `${c.danger}26`, borderWidth: 1, borderColor: `${c.danger}4d` }, text: c.danger };
  }
}

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title?: string;
  icon?: IconName;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Botão quadrado só com ícone. */
  square?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({ title, icon, variant = 'primary', size = 'md', loading, square, disabled, style, textStyle, onPress, ...rest }: ButtonProps) {
  const { colors } = useTheme();
  const v = variantStyle(variant, colors);
  const h = heights[size];
  const isDisplay = size === 'xl' || size === 'lg';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      onPress={(e) => {
        haptic('light');
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          height: h,
          minWidth: square ? h : undefined,
          width: square ? h : undefined,
          paddingHorizontal: square ? 0 : size === 'sm' ? 12 : 18,
          borderRadius: size === 'sm' ? radius.sm : size === 'md' ? radius.md : radius.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        v.box,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'xl' ? 24 : 20} color={v.text} />}
          {title && (
            <RNText
              style={[
                {
                  color: v.text,
                  fontWeight: isDisplay ? '900' : '700',
                  fontSize: size === 'xl' ? 19 : size === 'sm' ? 14 : 16,
                  textTransform: isDisplay ? 'uppercase' : 'none',
                  letterSpacing: isDisplay ? 0.6 : 0,
                },
                textStyle,
              ]}
            >
              {title}
            </RNText>
          )}
        </>
      )}
    </Pressable>
  );
}

// ------------------------------------------------------------------ Formulário

export const Input = forwardRef<TextInputInstance, TextInputProps>(function Input({ style, ...rest }, ref) {
  const { colors } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.faint}
      style={[
        {
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.surface2,
          color: colors.text,
          paddingHorizontal: 14,
          fontSize: 16,
        },
        style,
      ]}
      {...rest}
    />
  );
});

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text tone="muted" style={{ fontSize: 14, fontWeight: '600' }}>
        {label}
      </Text>
      {children}
      {error ? (
        <Text tone="danger" style={{ fontSize: 13 }} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text tone="faint" style={{ fontSize: 12 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Seleção em pílulas (substitui <select> no celular). */
export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  multiple,
}: {
  options: { value: T; label: string }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multiple?: boolean;
}) {
  const { colors } = useTheme();
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole={multiple ? undefined : 'radiogroup'}>
      {options.map((o) => {
        const on = isOn(o.value);
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole={multiple ? 'checkbox' : 'radio'}
            accessibilityState={multiple ? { checked: on } : { selected: on }}
            onPress={() => {
              haptic('light');
              onChange(o.value);
            }}
            style={{
              minHeight: 40,
              paddingHorizontal: 14,
              justifyContent: 'center',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? colors.accent : colors.line,
              backgroundColor: on ? colors.accentSoft : colors.surface2,
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 14, color: on ? colors.accent : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------------ Estados

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }) {
  const { colors } = useTheme();
  const map = {
    neutral: [colors.surface3, colors.muted],
    accent: [colors.accentSoft, colors.accent],
    success: [`${colors.success}26`, colors.success],
    warning: [`${colors.warning}26`, colors.warning],
    danger: [`${colors.danger}26`, colors.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Banner({ tone = 'danger', children }: { tone?: 'danger' | 'success' | 'warning' | 'info'; children: ReactNode }) {
  const { colors } = useTheme();
  const c = tone === 'info' ? colors.muted : colors[tone];
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      style={{ borderRadius: radius.md, borderWidth: 1, borderColor: `${c}4d`, backgroundColor: tone === 'info' ? colors.surface2 : `${c}1a`, padding: 12 }}
    >
      {typeof children === 'string' ? <Text style={{ color: c, fontSize: 14 }}>{children}</Text> : children}
    </View>
  );
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center', gap: 10 }} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.muted} />
      <Text tone="muted" style={{ fontSize: 14 }}>
        {label}
      </Text>
    </View>
  );
}

export function Empty({ icon, title, text }: { icon?: IconName; title: string; text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.empty, { borderColor: colors.line }]}>
      {icon && <Ionicons name={icon} size={32} color={colors.faint} />}
      <Title size={20} style={{ textAlign: 'center' }}>
        {title}
      </Title>
      {text && (
        <Text tone="muted" style={{ textAlign: 'center', fontSize: 14 }}>
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.lg, paddingVertical: 40, paddingHorizontal: 24 },
});
