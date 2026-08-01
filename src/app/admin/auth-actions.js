'use server';

import { redirect } from 'next/navigation';
import { createAdminSession, destroyAdminSession, verifyAdminCredentials } from '@/lib/auth';

export async function loginAction(_previousState, formData) {
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  if (!username || !password) return { error: 'Informe usuário e senha.' };

  try {
    if (!(await verifyAdminCredentials(username, password))) {
      return { error: 'Usuário ou senha inválidos.' };
    }
    await createAdminSession();
  } catch (error) {
    console.error('Falha na autenticação do admin:', error.message);
    return { error: 'Não foi possível entrar. Verifique a configuração do servidor.' };
  }

  redirect('/admin');
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect('/admin/login');
}
