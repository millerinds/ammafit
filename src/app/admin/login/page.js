import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { isAdminAuthenticated } from '@/lib/auth';
import LoginForm from './LoginForm';

export const metadata = { title: 'Login administrativo | AmmaFit' };

// A página lê o cookie de sessão para redirecionar quem já está logado,
// então não pode ser pré-renderizada como estática.
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect('/admin');

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A1A1A] text-white"><LockKeyhole className="h-6 w-6" /></div>
        <h1 className="mt-5 text-2xl font-bold text-[#1A1A1A]">Acesso administrativo</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Entre com suas credenciais para gerenciar produtos e configurações da loja.</p>
        <LoginForm />
        <Link href="/" className="mt-6 block text-center text-sm font-medium text-slate-500 hover:text-slate-900">Voltar para a loja</Link>
      </div>
    </main>
  );
}
