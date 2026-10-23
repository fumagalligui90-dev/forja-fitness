import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getServerSession } from '@/server/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/entrar');
  if (!session.user.emailVerified) redirect('/entrar');
  if (!session.user.termsAcceptedAt) redirect('/concluir-cadastro');
  return <AppShell userName={session.user.name}>{children}</AppShell>;
}
