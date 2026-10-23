import { MIN_SIGNUP_AGE, TERMS_VERSION } from '@forja/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { TermsCheckbox } from '@/components/terms-checkbox';
import { Banner, Button, Field, Icon, Input, Screen, Text, Title } from '@/components/ui';
import { authClient, authErrorMessage } from '@/lib/auth';
import { brDateToIso, maskDate } from '@/lib/format';
import { useTheme } from '@/lib/theme';

export default function SignUp() {
  const { colors } = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', birth: '' });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: k === 'birth' ? maskDate(v) : v }));

  async function submit() {
    setError(null);
    const birthDate = brDateToIso(form.birth);
    if (form.name.trim().length < 2) return setError('Informe seu nome.');
    if (form.password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
    if (form.password !== form.confirm) return setError('As senhas não conferem.');
    if (!birthDate) return setError('Data de nascimento inválida (use DD/MM/AAAA).');
    if (!accepted) return setError('É preciso aceitar os termos de uso e a política de privacidade.');
    setPending(true);
    const { error } = await authClient.signUp.email({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      birthDate,
      termsVersion: TERMS_VERSION,
      // Depois de confirmar o e-mail, o link volta para o app (o plugin Expo
      // converte o caminho relativo em forja://… ou exp://… no Expo Go).
      callbackURL: '/entrar',
    });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    setDone(true);
  }

  if (done) {
    return (
      <Screen edges={['bottom']}>
        <Icon name="mail-unread-outline" size={44} color={colors.accent} />
        <Title size={34}>Confira seu e-mail</Title>
        <Text tone="muted">
          Enviamos um link de confirmação para <Text style={{ fontWeight: '700' }}>{form.email}</Text>. Abra-o para ativar a conta e depois
          entre com seu e-mail e senha.
        </Text>
        <Button title="Ir para o login" size="lg" onPress={() => router.replace('/entrar')} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <View style={{ gap: 4 }}>
          <Title size={34}>Criar conta</Title>
          <Text tone="muted">Leva menos de um minuto.</Text>
        </View>
        {error && <Banner>{error}</Banner>}
        <Field label="Nome">
          <Input value={form.name} onChangeText={set('name')} autoComplete="name" textContentType="name" accessibilityLabel="Nome" />
        </Field>
        <Field label="E-mail">
          <Input
            value={form.email}
            onChangeText={set('email')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            accessibilityLabel="E-mail"
          />
        </Field>
        <Field label="Data de nascimento" hint={`DD/MM/AAAA · é preciso ter ${MIN_SIGNUP_AGE} anos ou mais.`}>
          <Input
            value={form.birth}
            onChangeText={set('birth')}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            accessibilityLabel="Data de nascimento"
          />
        </Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres.">
          <Input value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" accessibilityLabel="Senha" />
        </Field>
        <Field label="Confirmar senha">
          <Input value={form.confirm} onChangeText={set('confirm')} secureTextEntry autoComplete="new-password" accessibilityLabel="Confirmar senha" />
        </Field>
        <TermsCheckbox checked={accepted} onChange={setAccepted} />
        <Button title="Criar conta" size="lg" onPress={submit} loading={pending} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
