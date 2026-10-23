import { BRAND } from '@forja/core';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Política de privacidade' };

export default function PrivacyPage() {
  return (
    <>
      <h1>Política de privacidade</h1>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail, data de nascimento e senha (armazenada apenas como hash).</li>
        <li>Uso: treinos, exercícios, séries, cargas, repetições e observações que você registra.</li>
        <li>Técnicos: endereço IP e navegador associados às sessões de login, para segurança.</li>
      </ul>
      <h2>Para que usamos (LGPD, art. 7º)</h2>
      <ul>
        <li>Executar o serviço que você contratou: salvar e exibir seus treinos e estatísticas.</li>
        <li>Segurança da conta: verificação de e-mail, recuperação de senha e prevenção de abuso.</li>
      </ul>
      <h2>Compartilhamento</h2>
      <p>
        {BRAND.name} não vende dados pessoais. Profissionais só terão acesso aos seus dados mediante sua autorização expressa
        (recurso futuro), revogável a qualquer momento.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode acessar, corrigir e excluir seus dados. A exclusão da conta remove seus treinos e históricos de forma
        definitiva. A exportação de dados será disponibilizada em versão futura.
      </p>
      <h2>Contato do encarregado (DPO)</h2>
      <p>A definir antes do lançamento.</p>
    </>
  );
}
