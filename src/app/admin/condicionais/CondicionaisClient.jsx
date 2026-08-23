'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, Loader2, PackageCheck, RotateCcw, Search, ShoppingBag, Undo2, X } from 'lucide-react';
import { resolverItemCondicional } from '@/app/condicional-actions';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABEL = {
  em_condicional: { texto: 'Em condicional', classe: 'bg-amber-100 text-amber-700' },
  vendido: { texto: 'Vendido', classe: 'bg-emerald-100 text-emerald-700' },
  devolvido: { texto: 'Devolvido', classe: 'bg-slate-100 text-slate-600' },
  cancelado: { texto: 'Cancelado', classe: 'bg-rose-100 text-rose-600' },
};

function formatDate(value) {
  if (!value) return '';
  // O D1 devolve 'YYYY-MM-DD HH:MM:SS' em UTC.
  const parsed = new Date(String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CondicionaisClient({ condicionais }) {
  const [pendingItemId, setPendingItemId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);

  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normalizedSearch = normalize(search.trim());

  const visible = condicionais
    .filter((reserva) => (onlyOpen ? reserva.em_aberto > 0 : true))
    .filter((reserva) => !normalizedSearch || normalize([
      reserva.cliente_nome,
      reserva.cliente_telefone,
      ...reserva.itens.map((item) => `${item.produto_nome} ${item.tamanho}`),
    ].join(' ')).includes(normalizedSearch));

  const totalEmAberto = condicionais.reduce((total, reserva) => total + reserva.em_aberto, 0);

  async function handleResolve(itemId, acao) {
    setPendingItemId(itemId);
    setErrorMessage('');

    try {
      await resolverItemCondicional(itemId, acao);
    } catch (error) {
      setErrorMessage(error?.message || 'Não foi possível atualizar o item.');
    } finally {
      setPendingItemId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#1A1A1A]" suppressHydrationWarning>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Painel</span>
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-md">
                <Clock className="h-5 w-5" />
              </div>
              <h1 className="truncate text-lg font-bold sm:text-xl">Condicionais</h1>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            {totalEmAberto} fora da loja
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Peças em condicional</h2>
            <p className="mt-1 text-sm text-slate-500">Resolva item por item: cada peça tem o próprio estado.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-slate-400 sm:w-64">
              <Search className="h-4 w-4 text-slate-400" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente ou peça..." className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca" className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </div>
            <button
              type="button"
              onClick={() => setOnlyOpen((value) => !value)}
              className={`whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                onlyOpen ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {onlyOpen ? 'Somente em aberto' : 'Mostrando todos'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center text-slate-400">
            <ShoppingBag className="mb-4 h-12 w-12 stroke-1" />
            <p className="font-medium text-slate-600">Nenhum condicional {onlyOpen ? 'em aberto' : 'registrado'}</p>
            <p className="mt-1 text-sm">As solicitações feitas na loja aparecem aqui.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map((reserva) => (
              <section key={reserva.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {reserva.cliente_nome || 'Cliente não identificada'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      #{reserva.id} · {formatDate(reserva.criado_em)}
                      {reserva.cliente_telefone ? ` · ${reserva.cliente_telefone}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${reserva.em_aberto > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {reserva.em_aberto > 0 ? `${reserva.em_aberto} de ${reserva.total_itens} em aberto` : 'Finalizado'}
                  </span>
                </div>

                <ul className="divide-y divide-slate-100">
                  {reserva.itens.map((item) => {
                    const status = STATUS_LABEL[item.status] || STATUS_LABEL.em_condicional;
                    const isOpen = item.status === 'em_condicional';
                    const isPending = pendingItemId === item.id;

                    return (
                      <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {item.produto_nome}
                            {item.tamanho ? <span className="text-slate-500"> — {item.tamanho}</span> : null}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${status.classe}`}>{status.texto}</span>
                            {Number(item.preco) > 0 && <span className="text-[11px] text-slate-400">{currency.format(item.preco)}</span>}
                            {item.resolvido_em && <span className="text-[11px] text-slate-400">em {formatDate(item.resolvido_em)}</span>}
                          </div>
                        </div>

                        {isOpen && (
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleResolve(item.id, 'vendido')}
                              disabled={isPending}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
                              Vendido
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolve(item.id, 'devolvido')}
                              disabled={isPending}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              Devolvido
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolve(item.id, 'cancelado')}
                              disabled={isPending}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Cancelar
                            </button>
                          </div>
                        )}

                        {!isOpen && (
                          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-400">
                            <Check className="h-3.5 w-3.5" />
                            Resolvido
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
