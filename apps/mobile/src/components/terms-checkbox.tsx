import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';
import { API_URL } from '@/lib/config';
import { useTheme } from '@/lib/theme';
import { Text } from './ui';

/** Aceite dos termos: os textos ficam na web (mesma versão para web e app). */
export function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  const open = (path: string) => void WebBrowser.openBrowserAsync(`${API_URL}${path}`);
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Aceito os termos de uso e a política de privacidade"
        onPress={() => onChange(!checked)}
        hitSlop={10}
        style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: checked ? colors.accent : colors.line,
          backgroundColor: checked ? colors.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Ionicons name="checkmark" size={18} color={colors.accentInk} />}
      </Pressable>
      <Text tone="muted" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
        Li e aceito os{' '}
        <Text tone="accent" style={{ fontSize: 14, fontWeight: '700' }} onPress={() => open('/termos')}>
          termos de uso
        </Text>{' '}
        e a{' '}
        <Text tone="accent" style={{ fontSize: 14, fontWeight: '700' }} onPress={() => open('/privacidade')}>
          política de privacidade
        </Text>
        .
      </Text>
    </View>
  );
}
