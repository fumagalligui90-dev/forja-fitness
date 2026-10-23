import { BRAND } from '@forja/core';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { BrandLogo } from '@/components/brand';
import { Banner, Button, Field, Input, Screen, Text, Title } from '@/components/ui';
import { authClient, authErrorMessage } from '@/lib/auth';
import { API_URL } from '@/lib/config';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    setPending(false);
    // Sucesso: a sessão muda e o layout raiz abre o app automaticamente.
    if (error) setError(authErrorMessage(error));
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: 32 }}>
        <BrandLogo />
        <View style={{ marginTop: 24, gap: 4 }}>
          <Title size={38}>Entrar</Title>
          <Text tone="muted">{BRAND.tagline}</Text>
        </View>
        {error && <Banner>{error}</Banner>}
        <Field label="E-mail">
          <Input
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="E-mail"
          />
        </Field>
        <Field label="Senha">
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submit}
            accessibilityLabel="Senha"
          />
        </Field>
        <Link href="/recuperar-senha" style={{ alignSelf: 'flex-end' }}>
          <Text tone="accent" style={{ fontWeight: '700' }}>
            Esqueci minha senha
          </Text>
        </Link>
        <Button title="Entrar" size="lg" onPress={submit} loading={pending} disabled={!email || !password} />
        <Link href="/cadastro" style={{ alignSelf: 'center', marginTop: 8 }}>
          <Text tone="muted">
            Ainda não tem conta? <Text tone="accent" style={{ fontWeight: '700' }}>Criar conta</Text>
          </Text>
        </Link>
        {__DEV__ && (
          <Text tone="faint" style={{ fontSize: 12, textAlign: 'center' }}>
            Servidor: {API_URL}
          </Text>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
