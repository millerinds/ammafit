'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, ShoppingBag, Trash2, X, MessageCircle, Info } from 'lucide-react';
import { registerWhatsappClick } from '@/app/actions';
import { useCart } from './CartProvider';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CartDrawer({ isOpen, onClose, config }) {
  const { items, itemCount, total, updateQuantity, removeItem } = useCart();

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  function handleWhatsAppOrder() {
    if (items.length === 0) return;

    const rawNumber = config?.whatsapp_numero ? String(config.whatsapp_numero) : '';
    const number = rawNumber.replace(/[^0-9]/g, '') || '5549999999999';
    const lines = items.map((item) => {
      const details = [
        item.color && `cor ${item.color}`,
        item.size && `tamanho ${item.size}`,
      ].filter(Boolean).join(', ');

      return `• ${item.quantity}x código ${item.code}${details ? ` — ${details}` : ''}`;
    });
    const message = `Olá! Gostaria de solicitar os seguintes itens:\n\n${lines.join('\n')}\n\nTotal estimado: ${currency.format(total)}.`;

    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
    Promise.all(items.map((item) => registerWhatsappClick(item.productId))).catch(() => {});
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] isolate" role="dialog" aria-modal="true" aria-label="Carrinho de compras">
      <button type="button" aria-label="Fechar carrinho" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-slate-950/50 backdrop-blur-[2px]" />
      <aside className="absolute inset-y-0 right-0 flex h-dvh w-[min(100%,28rem)] flex-col overflow-hidden bg-white text-[#1A1A1A] shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-bold">Seu carrinho ({itemCount})</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar carrinho" className="rounded-full p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>Seu carrinho fica salvo neste navegador para você continuar depois.</p>
          </div>

          {items.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <ShoppingBag className="mb-4 h-12 w-12 stroke-1" />
              <p className="font-medium text-slate-600">Seu carrinho está vazio</p>
              <p className="mt-1 text-sm">Escolha uma peça para começar.</p>
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
                        {(item.color || item.size) && (
                          <p className="mt-1 text-xs text-slate-500">
                            {[item.color && `Cor: ${item.color}`, item.size && `Tamanho: ${item.size}`].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => removeItem(item.key)} aria-label={`Remover ${item.name}`} className="h-fit p-1 text-slate-400 hover:text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-slate-200">
                        <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)} className="p-1.5" aria-label="Diminuir quantidade"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-7 text-center text-sm">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)} className="p-1.5" aria-label="Aumentar quantidade"><Plus className="h-3.5 w-3.5" /></button>
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
              <span className="text-sm text-slate-500">Total estimado</span>
              <strong className="text-xl">{currency.format(total)}</strong>
            </div>
            <button type="button" onClick={handleWhatsAppOrder} style={{ backgroundColor: config?.cor_primaria || '#4A5D4E' }} className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-all hover:brightness-90 active:scale-[0.98]">
              <MessageCircle className="h-5 w-5" />
              Solicitar itens pelo WhatsApp
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}
