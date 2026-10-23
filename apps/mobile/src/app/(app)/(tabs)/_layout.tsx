import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTheme } from '@/lib/theme';
import type { IconName } from '@/components/ui';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Início', icon: 'home' },
  { name: 'treinos', title: 'Treinos', icon: 'barbell' },
  { name: 'exercicios', title: 'Exercícios', icon: 'library' },
  { name: 'historico', title: 'Histórico', icon: 'time' },
  { name: 'conta', title: 'Conta', icon: 'person' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={(focused ? t.icon : `${t.icon}-outline`) as IconName} size={24} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
