import { BRAND, MIN_SIGNUP_AGE, TERMS_VERSION } from '@forja/core';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Termos de uso' };

export default function TermsPage() {
  return (
    <>
      <h1>Termos de uso</h1>
      <p>Versão {TERMS_VERSION}.</p>
      <h2>1. O serviço</h2>
      <p>
        {BRAND.name} é uma ferramenta para planejar e registrar treinos. As informações exibidas são organizadas a partir dos
        dados que você registra e não substituem orientação de profissionais de educação física, nutrição ou saúde.
      </p>
      <h2>2. Conta</h2>
      <ul>
        <li>É necessário ter {MIN_SIGNUP_AGE} anos ou mais para criar uma conta.</li>
        <li>Você é responsável por manter sua senha em sigilo.</li>
        <li>Você pode excluir sua conta a qualquer momento em Conta → Excluir conta.</li>
      </ul>
      <h2>3. Saúde e segurança</h2>
      <p>
        Pratique exercícios dentro dos seus limites. Em caso de dor, desconforto ou condição de saúde, procure um profissional
        habilitado. O aplicativo não promete resultados físicos.
      </p>
      <h2>4. Planos pagos</h2>
      <p>Ainda não disponíveis. Condições de assinatura serão publicadas antes do lançamento dos planos.</p>
    </>
  );
}
