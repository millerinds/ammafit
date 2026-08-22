'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, X } from 'lucide-react';

/**
 * Confirmação exibida antes de qualquer reserva, para que um toque acidental
 * no catálogo não deixe uma peça presa em condicional (item 3 do pedido).
 */
export default function CondicionalConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  isSubmitting = false,
  productName,
  size,
  quantity = 1,
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

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmar-condicional">
      <button type="button" aria-label="Cancelar" onClick={() => !isSubmitting && onCancel()} className="absolute inset-0 h-full w-full cursor-default bg-slate-950/50 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl sm:p-6">
        <button type="button" onClick={() => !isSubmitting && onCancel()} aria-label="Fechar" className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </button>

        <h2 id="titulo-confirmar-condicional" className="pr-8 text-lg font-bold text-[#1A1A1A]">
          Solicitar esta peça para provar?
        </h2>

        <dl className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Produto</dt>
            <dd className="min-w-0 truncate text-right font-semibold text-[#1A1A1A]">{productName}</dd>
          </div>
          {size && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Tamanho</dt>
              <dd className="font-semibold text-[#1A1A1A]">{size}</dd>
            </div>
          )}
          {quantity > 1 && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Quantidade</dt>
              <dd className="font-semibold text-[#1A1A1A]">{quantity} peças</dd>
            </div>
          )}
        </dl>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          A peça fica reservada em seu nome e sai da disponibilidade da loja até você devolver.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-slate-200 py-3.5 font-semibold text-slate-600 transition-colors hover:border-slate-400 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{ backgroundColor: primaryColor }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isSubmitting ? 'Registrando...' : 'Confirmar condicional'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
