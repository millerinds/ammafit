'use client';

import { useActionState } from 'react';
import { Loader2, LockKeyhole, LogIn, User } from 'lucide-react';
import { loginAction } from '../auth-actions';

const initialState = { error: '' };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block text-sm font-semibold text-slate-700">
        Usuário
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-[#4A5D4E] focus-within:ring-2 focus-within:ring-[#4A5D4E]/10">
          <User className="h-4 w-4 text-slate-400" />
          <input name="username" type="text" required autoComplete="username" autoFocus className="min-w-0 flex-1 bg-transparent py-3 outline-none" />
        </div>
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        Senha
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-[#4A5D4E] focus-within:ring-2 focus-within:ring-[#4A5D4E]/10">
          <LockKeyhole className="h-4 w-4 text-slate-400" />
          <input name="password" type="password" required autoComplete="current-password" className="min-w-0 flex-1 bg-transparent py-3 outline-none" />
        </div>
      </label>
      {state?.error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{state.error}</p>}
      <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] py-3.5 font-bold text-white transition-all hover:bg-[#333] disabled:cursor-wait disabled:opacity-70">
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
        {pending ? 'Entrando...' : 'Entrar no painel'}
      </button>
    </form>
  );
}
