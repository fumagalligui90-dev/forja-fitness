import { useState } from 'react';
import { Banner, Button, Field, Input, Screen, Text, Title } from '@/components/ui';
import { authClient, authErrorMessage } from '@/lib/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setPending(true);
    // A nova senha é definida na página web (o link do e-mail abre no navegador).
    const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: '/redefinir-senha' });
    setPending(false);
    if (error) return setError(authErrorMessage(error));
    setSent(true);
  }

  return (
    <Screen edges={['bottom']}>
      <Title size={34}>Recuperar senha</Title>
      <Text tone="muted">Enviaremos um link para você criar uma nova senha.</Text>
      {sent ? (
        <Banner tone="success">{`Se houver uma conta com ${email}, você receberá o link em instantes. Ele vale por 1 hora.`}</Banner>
      ) : (
        <>
          {error && <Banner>{error}</Banner>}
          <Field label="E-mail">
            <Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel="E-mail" />
          </Field>
          <Button title="Enviar link" size="lg" onPress={submit} loading={pending} disabled={!email} />
        </>
      )}
    </Screen>
  );
}
