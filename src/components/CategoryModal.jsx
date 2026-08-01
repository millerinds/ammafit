'use client';

import { useState } from 'react';
import { FolderPlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { addCategory, deleteCategory } from '@/app/actions';

export default function CategoryModal({ isOpen, onClose, categories }) {
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleAdd(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await addCategory(name);
      setName('');
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(category) {
    if (!window.confirm(`Excluir a categoria “${category.nome}”?`)) return;
    setPending(true);
    setError('');
    try {
      await deleteCategory(category.id);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2"><FolderPlus className="h-5 w-5" /><h2 className="text-lg font-bold">Gerenciar categorias</h2></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input required minLength="2" maxLength="40" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome da nova categoria" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-slate-500" />
            <button disabled={pending} className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 font-semibold text-white disabled:opacity-50">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Criar</button>
          </form>
          {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
          <p className="mt-4 text-xs text-slate-500">Categorias usadas por produtos não podem ser excluídas.</p>
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <span className="font-medium">{category.nome}</span>
                <button type="button" disabled={pending} onClick={() => handleDelete(category)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40" aria-label={`Excluir ${category.nome}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
