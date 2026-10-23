import { BRAND, EXPERIENCE_LABELS, GOAL_LABELS, WEEKDAY_SHORT } from '@forja/core';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Card, Chips, Field, Input, Loading, Row, Screen, Text, Title } from '@/components/ui';
import { authClient, authErrorMessage } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { useMe } from '@/lib/me';
import { useTheme } from '@/lib/theme';

export default function Account() {
  const { colors } = useTheme();
  const { me, updatePreferences } = useMe();
  const [prefError, setPrefError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!me) return <Loading />;
  const p = me.profile;

  const savePref = (input: Parameters<typeof updatePreferences>[0]) => {
    setPrefError(null);
    updatePreferences(input).catch((e: Error) => setPrefError(e.message));
  };

  const summary = [
    p.goal && GOAL_LABELS[p.goal],
    p.experienceLevel && EXPERIENCE_LABELS[p.experienceLevel],
    p.heightCm && `${p.heightCm} cm`,
    p.weightKg && `${String(p.weightKg).replace('.', ',')} kg`,
    p.sessionMinutes && `${p.sessionMinutes} min/treino`,
  ].filter(Boolean);

  return (
    <Screen>
      <Title>Conta</Title>

      <Card style={{ gap: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>{me.name}</Text>
        <Text tone="muted">{me.email}</Text>
        {me.birthDate && (
          <Text tone="faint" style={{ fontSize: 13 }}>
            Nascimento: {new Date(`${me.birthDate}T12:00:00`).toLocaleDateString('pt-BR')}
          </Text>
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Title size={18}>Perfil de treino</Title>
        {summary.length ? <Text tone="muted">{summary.join(' · ')}</Text> : <Text tone="muted">Ainda não preenchido.</Text>}
        {p.trainingDays.length > 0 && (
          <Text tone="faint" style={{ fontSize: 13 }}>
            Dias disponíveis: {p.trainingDays.map((d) => WEEKDAY_SHORT[d]).join(', ')}
          </Text>
        )}
        <Button title={summary.length ? 'Editar perfil' : 'Preencher perfil'} variant="secondary" icon="create-outline" onPress={() => router.push('/perfil')} />
      </Card>

      <Card style={{ gap: 14 }}>
        <Title size={18}>Aparência e avisos</Title>
        {prefError && <Banner>{prefError}</Banner>}
        <Field label="Tema">
          <Chips
            options={[
              { value: 'dark', label: 'Escuro' },
              { value: 'light', label: 'Claro' },
            ]}
            value={me.preferences.theme}
            onChange={(theme) => savePref({ theme })}
          />
        </Field>
        <Field label="Cor de destaque">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {BRAND.accentPresets.map((c) => {
              const on = (me.preferences.accentColor ?? BRAND.accentColor) === c;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={c}
                  onPress={() => savePref({ accentColor: c })}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c, borderWidth: 3, borderColor: on ? colors.text : 'transparent' }}
                />
              );
            })}
          </View>
        </Field>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700' }}>Aviso de fim do descanso</Text>
            <Text tone="faint" style={{ fontSize: 13 }}>
              Notificação, som e vibração quando o descanso termina.
            </Text>
          </View>
          <Switch
            value={me.preferences.restAlerts}
            onValueChange={(restAlerts) => savePref({ restAlerts })}
            trackColor={{ true: colors.accent, false: colors.surface3 }}
            accessibilityLabel="Aviso de fim do descanso"
          />
        </Row>
        <Text tone="faint" style={{ fontSize: 12 }}>
          Preferências sincronizadas com a versão web.
        </Text>
      </Card>

      <Card style={{ gap: 10 }}>
        <Title size={18}>Sessão e privacidade</Title>
        <Button title="Política de privacidade" variant="ghost" icon="document-text-outline" onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacidade`)} />
        <Button title="Termos de uso" variant="ghost" icon="document-outline" onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/termos`)} />
        <Button title="Sair" variant="secondary" icon="log-out-outline" onPress={() => void authClient.signOut()} />
        <Button title="Excluir conta" variant="danger" icon="trash-outline" onPress={() => setDeleteOpen(true)} />
      </Card>

      <DeleteAccountModal visible={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </Screen>
  );
}

/** Exclusão de conta dentro do app (exigência da App Store e do Google Play). */
function DeleteAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const { error } = await authClient.deleteUser({ password });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    await authClient.signOut().catch(() => {});
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 16 }}>
        <Title size={26}>Excluir conta</Title>
        <Banner tone="warning">Esta ação apaga sua conta, treinos, exercícios próprios e todo o histórico de forma permanente. Não é possível desfazer.</Banner>
        {error && <Banner>{error}</Banner>}
        <Field label="Confirme sua senha">
          <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
        </Field>
        <Button title="Excluir definitivamente" variant="danger" size="lg" loading={pending} disabled={!password} onPress={confirm} />
        <Button title="Cancelar" variant="ghost" onPress={onClose} />
      </SafeAreaView>
    </Modal>
  );
}
