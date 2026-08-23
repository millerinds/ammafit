'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';

/**
 * Confirmação usada tanto pela peça avulsa quanto pela sacola inteira, para que
 * as duas telas falem a mesma língua e tenham o mesmo desenho.
 */
export default function ConfirmTryOnModal({
  isOpen,
  onCancel,
  onConfirm,
  isSubmitting = false,
  items = [],
  customerName = '',
  onCustomerNameChange,
  primaryColor = '#4A5D4E',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) onCancel();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  const isSingle = items.length === 1;
  const totalPieces = items.reduce((total, item) => total + (item.quantity || 1), 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-experimentar"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => !isSubmitting && onCancel()}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-950/50 backdrop-blur-[2px]"
      />

      <div className="relative flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl">
        {/* pega-dedo do bottom sheet, só no celular */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />

        <div className="shrink-0 px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="titulo-experimentar" className="text-xl font-bold leading-snug text-[#1A1A1A]">
                {isSingle ? 'Quer experimentar esta peça?' : 'Confirmar suas peças'}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {isSingle
                  ? 'Vamos separar a peça em seu nome para você experimentar.'
                  : `Vamos separar ${totalPieces} peças em seu nome para você experimentar.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => !isSubmitting && onCancel()}
              aria-label="Fechar"
              className="-mr-2 -mt-1 shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6">
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {items.map((item, index) => (
              <li key={item.key ?? index} className="flex items-center justify-between gap-3 bg-slate-50/60 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1A1A1A]">{item.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {item.quantity > 1 && (
                    <span className="text-xs font-medium text-slate-400">{item.quantity}x</span>
                  )}
                  {item.size && (
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
                      {item.size}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-h-0 shrink-0 px-6 pt-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Seu nome (opcional)</span>
            <input
              type="text"
              value={customerName}
              onChange={(event) => onCustomerNameChange?.(event.target.value)}
              placeholder="Para a loja saber quem separou"
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm outline-none transition-colors focus:border-slate-400"
            />
          </label>
        </div>

        <div className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          <p className="mb-4 text-center text-xs leading-relaxed text-slate-400">
            Ao confirmar, abrimos o WhatsApp para você combinar a retirada.
          </p>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="h-12 w-full shrink-0 rounded-xl border border-slate-200 sm:flex-1 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              style={{ backgroundColor: primaryColor }}
              className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl sm:flex-1 text-sm font-bold text-white shadow-sm transition-all hover:brightness-95 active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Separando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
