'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Info, Loader2, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { registerWhatsappClick } from '@/app/actions';
import { solicitarCondicional } from '@/app/condicional-actions';
import { useBag } from './BagProvider';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function buildCondicionalMessage(items, origin) {
  const lines = items.map((item, index) => {
    const size = item.size ? ` — ${item.size}` : '';
    const amount = item.quantity > 1 ? ` (${item.quantity} peças)` : '';
    const link = origin ? `\n   ${origin}/produto/${item.productId}` : '';
    return `${index + 1}. ${item.name}${size}${amount}${link}`;
  });

  return `Olá! Gostaria de solicitar estas peças para condicional:\n\n${lines.join('\n')}`;
}

export default function BagDrawer({ isOpen, onClose, config }) {
  const { items, itemCount, total, updateQuantity, removeItem, removeByVariation, clear } = useBag();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fechar sempre devolve a sacola ao estado de lista, sem confirmação pendente.
  const handleClose = useCallback(() => {
    setIsConfirming(false);
    setErrorMessage('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') handleClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  async function handleConfirm() {
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    // Abre a aba antes do await: depois de uma chamada assíncrona o navegador
    // do celular trata window.open como pop-up e bloqueia.
    const whatsappTab = window.open('', '_blank');

    try {
      const result = await solicitarCondicional({
        cliente_nome: customerName,
        itens: items.map((item) => ({ variacao_id: item.variacaoId, quantidade: item.quantity })),
      });

      if (!result?.ok) {
        whatsappTab?.close();
        const unavailable = result?.indisponiveis || [];

        if (unavailable.length > 0) {
          removeByVariation(unavailable.map((entry) => entry.variacao_id));
          setErrorMessage(
            `${unavailable.map((entry) => `${entry.produto_nome}${entry.tamanho ? ` (${entry.tamanho})` : ''}`).join(', ')} ` +
            'acabou de ser reservado por outra cliente e saiu da sua sacola. Confira as peças restantes e solicite de novo.'
          );
        } else {
          setErrorMessage(result?.erro || 'Não foi possível registrar o condicional. Tente novamente.');
        }

        setIsConfirming(false);
        return;
      }

      const rawNumber = config?.whatsapp_numero ? String(config.whatsapp_numero) : '';
      const number = rawNumber.replace(/[^0-9]/g, '') || '5549999999999';
      const message = buildCondicionalMessage(items, window.location.origin);
      const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

      const productIds = [...new Set(items.map((item) => item.productId))];
      clear();

      if (whatsappTab) whatsappTab.location.href = url;
      else window.location.href = url;

      // Métrica em segundo plano, sem revalidar a rota (cancelaria a navegação).
      for (const productId of productIds) {
        registerWhatsappClick(productId).catch(() => {});
      }

      onClose();
    } catch (error) {
      whatsappTab?.close();
      setErrorMessage(error?.message || 'Não foi possível registrar o condicional. Tente novamente.');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const primaryColor = config?.cor_primaria || '#4A5D4E';

  return createPortal(
    <div className="fixed inset-0 z-[100] isolate" role="dialog" aria-modal="true" aria-label="Sacola para provar">
      <button type="button" aria-label="Fechar sacola" onClick={handleClose} className="absolute inset-0 h-full w-full cursor-default bg-slate-950/50 backdrop-blur-[2px]" />
      <aside className="absolute inset-y-0 right-0 flex h-dvh w-[min(100%,28rem)] flex-col overflow-hidden bg-white text-[#1A1A1A] shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-bold">Sacola para provar ({itemCount})</h2>
          </div>
          <button type="button" onClick={handleClose} aria-label="Fechar sacola" className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isConfirming ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              <h3 className="text-lg font-bold">Solicitar estas peças para provar?</h3>
              <p className="mt-1 text-sm text-slate-500">
                As peças ficam reservadas em seu nome e saem da disponibilidade da loja até você devolver.
              </p>

              <ul className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {items.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      {item.size && <p className="text-xs text-slate-500">Tamanho: {item.size}</p>}
                    </div>
                    {item.quantity > 1 && <span className="shrink-0 text-xs font-medium text-slate-500">{item.quantity} peças</span>}
                  </li>
                ))}
              </ul>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-700">Seu nome (opcional)</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Como a loja deve identificar você"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-slate-400"
                />
              </label>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                style={{ backgroundColor: primaryColor }}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                {isSubmitting ? 'Registrando...' : 'Confirmar condicional'}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="mt-2 w-full rounded-xl border border-slate-200 py-3.5 font-semibold text-slate-600 transition-colors hover:border-slate-400 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>Monte a sacola com tudo que quiser experimentar e solicite o condicional de uma vez só. A sacola fica salva neste navegador.</p>
              </div>

              {errorMessage && (
                <div className="mb-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              )}

              {items.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
                  <ShoppingBag className="mb-4 h-12 w-12 stroke-1" />
                  <p className="font-medium text-slate-600">Sua sacola está vazia</p>
                  <p className="mt-1 text-sm">Escolha uma peça e o tamanho para começar.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {items.map((item) => (
                    <div key={item.key} className="flex min-w-0 gap-3 border-b border-slate-100 pb-5 sm:gap-4">
                      <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">Código: {item.code}</p>
                            {item.size && <p className="mt-1 text-xs text-slate-500">Tamanho: {item.size}</p>}
                          </div>
                          <button type="button" onClick={() => removeItem(item.key)} aria-label={`Remover ${item.name}`} className="h-fit p-1 text-slate-400 hover:text-rose-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-slate-200">
                            <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)} className="p-1.5" aria-label="Diminuir quantidade"><Minus className="h-3.5 w-3.5" /></button>
                            <span className="w-7 text-center text-sm">{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= (item.disponivel || 1)} className="p-1.5 disabled:opacity-30" aria-label="Aumentar quantidade"><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                          <span className="text-sm font-semibold">{currency.format(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Valor das peças</span>
                  <strong className="text-xl">{currency.format(total)}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirming(true)}
                  style={{ backgroundColor: primaryColor }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-all hover:brightness-90 active:scale-[0.98]"
                >
                  <ShoppingBag className="h-5 w-5" />
                  Solicitar condicional
                </button>
                <p className="mt-3 text-center text-xs text-slate-400">Você confirma antes de qualquer reserva.</p>
              </div>
            )}
          </>
        )}
      </aside>
    </div>,
    document.body
  );
}
