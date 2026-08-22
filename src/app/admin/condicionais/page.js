import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/auth';
import { getCondicionais } from '@/app/condicional-actions';
import CondicionaisClient from './CondicionaisClient';

export const dynamic = 'force-dynamic';

export default async function CondicionaisPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin/login');

  const condicionais = await getCondicionais();

  return <CondicionaisClient condicionais={condicionais} />;
}
