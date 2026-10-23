import type { Metadata } from 'next';
import { socialProvidersFromEnv } from '@/server/auth';
import { SignUpForm } from './sign-up-form';

export const metadata: Metadata = { title: 'Criar conta' };
// Provedores sociais vêm do ambiente em tempo de execução, não do build.
export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <SignUpForm
      providers={Object.keys(socialProvidersFromEnv())}
      devMailbox={process.env.NODE_ENV !== 'production' && !process.env.SMTP_URL}
    />
  );
}
