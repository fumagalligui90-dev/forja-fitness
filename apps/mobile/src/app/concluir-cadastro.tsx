import { MIN_SIGNUP_AGE, TERMS_VERSION } from '@forja/core';
import { useState } from 'react';
import { BrandLogo } from '@/components/brand';
import { TermsCheckbox } from '@/components/terms-checkbox';
import { Banner, Button, Field, Input, Screen, Text, Title } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { brDateToIso, maskDate } from '@/lib/format';

/** Usuários vindos de login social completam nascimento + aceite dos termos. */
export default function CompleteSignup() {
  const [birth, setBirth] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const birthDate = brDateToIso(birth);
    if (!birthDate) return setError('Data de nascimento inválida (use DD/MM/AAAA).');
    if (!accepted) return setError('É preciso aceitar os termos para continuar.');
    setPending(true);
    setError(null);
    try {
      await api.request('/me/consent', { method: 'POST', body: { birthDate, termsVersion: TERMS_VERSION } });
      // Atualiza a sessão: o layout raiz então libera o app.
      await authClient.getSession({ query: { disableCookieCache: true } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <BrandLogo />
      <Title size={34} style={{ marginTop: 16 }}>
        Falta pouco
      </Title>
      <Text tone="muted">Precisamos de mais duas informações para concluir seu cadastro.</Text>
      {error && <Banner>{error}</Banner>}
      <Field label="Data de nascimento" hint={`DD/MM/AAAA · é preciso ter ${MIN_SIGNUP_AGE} anos ou mais.`}>
        <Input value={birth} onChangeText={(v) => setBirth(maskDate(v))} keyboardType="number-pad" placeholder="DD/MM/AAAA" maxLength={10} />
      </Field>
      <TermsCheckbox checked={accepted} onChange={setAccepted} />
      <Button title="Continuar" size="lg" onPress={submit} loading={pending} />
      <Button title="Sair" variant="ghost" onPress={() => authClient.signOut()} />
    </Screen>
  );
}
