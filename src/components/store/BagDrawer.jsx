'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { registerWhatsappClick } from '@/app/actions';
import { solicitarCondicional } from '@/app/condicional-actions';
import { useBag } from './BagProvider';
import ConfirmTryOnModal from './ConfirmTryOnModal';
import { buildTryOnMessage, buildWhatsappUrl } from './try-on-message';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function BagDrawer({ isOpen, onClose, config }) {
  const { items, itemCount, total, updateQuantity, removeItem, removeByVariation, clear } = useBag();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customerName, setCustomerName] = useState('');

  const handleClose = useCallback(() => {
    setIsConfirmOpen(false);
    setErrorMessage('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isConfirmOpen) handleClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isConfirmOpen, handleClose]);

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
        setIsConfirmOpen(false);
        const unavailable = result?.indisponiveis || [];

        if (unavailable.length > 0) {
          removeByVariation(unavailable.map((entry) => entry.variacao_id));
          const names = unavailable
            .map((entry) => `${entry.produto_nome}${entry.tamanho ? ` (${entry.tamanho})` : ''}`)
            .join(', ');
          setErrorMessage(
            `${names} acabou de ser separado para outra cliente e saiu da sua sacola. Confira as peças restantes e tente de novo.`
          );
        } else {
          setErrorMessage(result?.erro || 'Não conseguimos separar suas peças agora. Tente de novo em instantes.');
        }
        return;
      }

      const message = buildTryOnMessage(items, window.location.origin);
      const url = buildWhatsappUrl(config?.whatsapp_numero, message);
      const productIds = [...new Set(items.map((item) => item.productId))];

      clear();
      if (whatsappTab) whatsappTab.location.href = url;
      else window.location.href = url;

      for (const productId of productIds) {
        registerWhatsappClick(productId).catch(() => {});
      }

      setIsConfirmOpen(false);
      onClose();
    } catch (error) {
      whatsappTab?.close();
      setIsConfirmOpen(false);
      setErrorMessage(error?.message || 'Não conseguimos separar suas peças agora. Tente de novo em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const primaryColor = config?.cor_primaria || '#4A5D4E';

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] isolate" role="dialog" aria-modal="true" aria-label="Sacola para experimentar">
        <button
          type="button"
          aria-label="Fechar sacola"
          onClick={handleClose}
          className="absolute inset-0 h-full w-full cursor-default bg-slate-950/50 backdrop-blur-[2px]"
        />

        <aside className="absolute inset-y-0 right-0 flex h-dvh w-[min(100%,26rem)] flex-col overflow-hidden bg-white text-[#1A1A1A] shadow-2xl animate-in slide-in-from-right duration-300">
          <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold">Sacola para experimentar</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {itemCount === 0 ? 'Nenhuma peça ainda' : `${itemCount} ${itemCount === 1 ? 'peça separada' : 'peças separadas'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar sacola"
              className="-mr-2 shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            {errorMessage && (
              <div className="mb-4 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <p className="text-xs leading-relaxed text-rose-700">{errorMessage}</p>
              </div>
            )}

            {items.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center px-6 text-center">
                <ShoppingBag className="mb-4 h-12 w-12 stroke-1 text-slate-300" />
                <p className="font-semibold text-slate-600">Sua sacola está vazia</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  Escolha as peças e os tamanhos que quiser experimentar. Elas ficam guardadas aqui.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold leading-snug">{item.name}</h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {item.size && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                                {item.size}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{currency.format(item.price)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Tirar ${item.name} da sacola`}
                          className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            aria-label="Diminuir quantidade"
                            className="flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            disabled={item.quantity >= (item.disponivel || 1)}
                            aria-label="Aumentar quantidade"
                            className="flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-25"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {item.quantity >= (item.disponivel || 1) && (
                          <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                            {item.disponivel === 1 ? 'última disponível' : `máximo ${item.disponivel}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <footer className="shrink-0 border-t border-slate-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm text-slate-500">Valor das peças</span>
                <strong className="text-lg tabular-nums">{currency.format(total)}</strong>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                style={{ backgroundColor: primaryColor }}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white shadow-sm transition-all hover:brightness-95 active:scale-[0.99]"
              >
                Quero experimentar
              </button>
              <p className="mt-2.5 text-center text-xs leading-relaxed text-slate-400">
                Não é uma compra. Você confirma antes e combina tudo pelo WhatsApp.
              </p>
            </footer>
          )}
        </aside>
      </div>

      <ConfirmTryOnModal
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        isSubmitting={isSubmitting}
        items={items}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        primaryColor={primaryColor}
      />
    </>,
    document.body
  );
}
