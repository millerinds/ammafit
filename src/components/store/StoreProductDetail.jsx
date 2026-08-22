'use client';

import { useState, useEffect, useMemo } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, AlertCircle, ShoppingBag, Check, Minus, Plus, Share2, Sparkles } from 'lucide-react';
import { registerWhatsappClick, registerAccess } from '@/app/actions';
import { solicitarCondicional } from '@/app/condicional-actions';
import { useBag } from './BagProvider';
import ConfirmTryOnModal from './ConfirmTryOnModal';
import { buildTryOnMessage, buildWhatsappUrl } from './try-on-message';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const TAMANHO_UNICO = 'Único';

export default function StoreProductDetail({ product, config }) {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [selectedVariationId, setSelectedVariationId] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [addedToBag, setAddedToBag] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const { addItem } = useBag();

  const variacoes = useMemo(() => product?.variacoes || [], [product]);

  useEffect(() => {
    if (product?.id) {
      registerAccess(product.id).catch(() => {});
    }
  }, [product?.id]);

  if (!product) return null;

  const imagens = product.imagens && product.imagens.length > 0
    ? product.imagens
    : ['https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop'];

  const hasColors = product.cores && product.cores.length > 0;
  const variacaoUnica = variacoes.length === 1 && variacoes[0].tamanho === TAMANHO_UNICO ? variacoes[0] : null;
  const showSizePicker = !variacaoUnica;
  const selectedVariation = variacoes.find((variation) => variation.id === selectedVariationId) || variacaoUnica;
  const maxQuantity = Math.max(1, selectedVariation?.disponivel || 1);
  const totalDisponivel = Number(product.disponivel_total) || 0;
  const totalReservado = Number(product.reservado_total) || 0;
  const isReservada = totalDisponivel === 0 && totalReservado > 0;
  const isEsgotado = totalDisponivel === 0 && totalReservado === 0;
  const podeExperimentar = !isReservada && !isEsgotado;
  const hasOffer = Boolean(product.oferta_ativa) && Number(product.preco_original) > Number(product.preco);
  const discount = hasOffer ? Math.round((1 - Number(product.preco) / Number(product.preco_original)) * 100) : 0;
  const primaryColor = config?.cor_primaria || '#4A5D4E';

  const bagItem = selectedVariation ? [{
    key: selectedVariation.id,
    name: product.nome,
    size: selectedVariation.tamanho !== TAMANHO_UNICO ? selectedVariation.tamanho : '',
    quantity,
    productId: product.id,
  }] : [];

  function updateQuantity(nextQuantity) {
    setQuantity(Math.min(maxQuantity, Math.max(1, Math.floor(Number(nextQuantity) || 1))));
  }

  function handleSelectVariation(variation) {
    if (variation.disponivel <= 0) return;
    setSelectedVariationId(variation.id);
    setQuantity(1);
    setShowWarning(false);
    setFeedback('');
  }

  function requireSelection() {
    if (!selectedVariation || (hasColors && !selectedColor)) {
      setShowWarning(true);
      return false;
    }
    setShowWarning(false);
    return true;
  }

  function handleAddToBag() {
    if (!requireSelection()) return;

    addItem(product, selectedVariation, quantity);
    setAddedToBag(true);
    window.setTimeout(() => setAddedToBag(false), 2200);
  }

  async function handleConfirm() {
    if (!selectedVariation || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback('');

    // A aba precisa ser aberta antes do await, senão o celular bloqueia o pop-up.
    const whatsappTab = window.open('', '_blank');

    try {
      const result = await solicitarCondicional({
        itens: [{ variacao_id: selectedVariation.id, quantidade: quantity }],
      });

      if (!result?.ok) {
        whatsappTab?.close();
        setIsConfirmOpen(false);
        setFeedback(
          result?.indisponiveis?.length
            ? 'Esta peça acabou de ser separada para outra cliente. Atualize a página para ver o que ainda está disponível.'
            : result?.erro || 'Não conseguimos separar a peça agora. Tente de novo em instantes.'
        );
        return;
      }

      const message = buildTryOnMessage(bagItem, window.location.origin);
      const url = buildWhatsappUrl(config?.whatsapp_numero, message);

      setIsConfirmOpen(false);
      if (whatsappTab) whatsappTab.location.href = url;
      else window.location.href = url;

      registerWhatsappClick(product.id).catch(() => {});
    } catch (error) {
      whatsappTab?.close();
      setIsConfirmOpen(false);
      setFeedback(error?.message || 'Não conseguimos separar a peça agora. Tente de novo em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleWhatsAppClick() {
    const codigo = product.sku || product.nome;
    let msg = `Oi! Queria saber mais sobre esta peça: ${product.nome} (${codigo})`;
    if (selectedColor) msg += `, na cor ${selectedColor}`;
    if (selectedVariation && selectedVariation.tamanho !== TAMANHO_UNICO) msg += `, tamanho ${selectedVariation.tamanho}`;
    msg += '.';

    window.open(buildWhatsappUrl(config?.whatsapp_numero, msg), '_blank');
    registerWhatsappClick(product.id).catch(() => {});
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.nome, text: `Confira ${product.nome} na Amma Fit`, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500 md:flex-row lg:gap-14">

      {/* === GALERIA === */}
      <div className="group relative aspect-[4/5] w-full flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100 md:aspect-auto md:h-[640px] md:w-1/2">
        <img src={imagens[currentImageIdx]} alt={product.nome} className="h-full w-full object-cover transition-opacity duration-300" />

        {isReservada && (
          <div className="absolute left-4 top-4 rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
            Com outra cliente
          </div>
        )}

        {imagens.length > 1 && (
          <>
            <button type="button" onClick={() => setCurrentImageIdx((p) => (p === 0 ? imagens.length - 1 : p - 1))} aria-label="Imagem anterior" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#1A1A1A] shadow-md transition-all hover:bg-white md:opacity-0 md:group-hover:opacity-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setCurrentImageIdx((p) => (p === imagens.length - 1 ? 0 : p + 1))} aria-label="Próxima imagem" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#1A1A1A] shadow-md transition-all hover:bg-white md:opacity-0 md:group-hover:opacity-100">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
              {imagens.map((_, idx) => (
                <button type="button" key={idx} onClick={() => setCurrentImageIdx(idx)} aria-label={`Imagem ${idx + 1}`} className={`h-1.5 rounded-full transition-all ${idx === currentImageIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/60'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* === DETALHES === */}
      <div className="flex flex-1 flex-col">
        <span className="mb-2 text-xs font-bold uppercase tracking-widest text-[#4A5D4E]">{product.categoria || 'Coleção'}</span>
        <h1 className="text-3xl font-bold tracking-tight text-[#1A1A1A] md:text-4xl">{product.nome}</h1>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {hasOffer && <span className="text-sm text-slate-400 line-through">{currency.format(product.preco_original)}</span>}
          <span className={`text-2xl font-semibold md:text-3xl ${hasOffer ? 'text-rose-600' : 'text-[#1A1A1A]'}`}>{currency.format(product.preco)}</span>
          {hasOffer && <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-600">{discount}% OFF</span>}
        </div>

        {product.descricao && (
          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{product.descricao}</p>
        )}

        {/* === CORES === */}
        {hasColors && (
          <div className="mt-7">
            <div className="mb-2.5 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-[#1A1A1A]">Cor</span>
              {selectedColor && <span className="text-sm text-slate-500">{selectedColor}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {product.cores.map((cor, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => { setSelectedColor(cor); setShowWarning(false); }}
                  className={`h-11 rounded-xl border px-4 text-sm font-medium transition-all ${
                    selectedColor === cor
                      ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {cor}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* === TAMANHOS === */}
        {showSizePicker && (
          <div className="mt-7">
            <div className="mb-2.5 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-[#1A1A1A]">Tamanho</span>
              {selectedVariation && <span className="text-sm text-slate-500">{selectedVariation.tamanho}</span>}
            </div>

            <div className="flex flex-wrap gap-2">
              {variacoes.map((variation) => {
                const indisponivel = variation.disponivel <= 0;
                const reservada = indisponivel && variation.reservado > 0;
                const isSelected = variation.id === selectedVariationId;

                return (
                  <button
                    type="button"
                    key={variation.id}
                    onClick={() => handleSelectVariation(variation)}
                    disabled={indisponivel}
                    title={reservada ? 'Está com outra cliente para experimentar' : indisponivel ? 'Esgotado' : `${variation.disponivel} disponível(is)`}
                    className={`relative flex h-12 min-w-12 items-center justify-center rounded-xl border px-3.5 text-sm font-semibold transition-all ${
                      isSelected
                        ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white'
                        : indisponivel
                          ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span className={indisponivel ? 'line-through decoration-slate-300' : ''}>{variation.tamanho}</span>
                    {reservada && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />}
                  </button>
                );
              })}
            </div>

            {/* uma única linha de status, em vez de poluir cada tamanho */}
            <p className="mt-2.5 text-xs text-slate-500">
              {isReservada
                ? 'Todos os tamanhos estão com outras clientes no momento.'
                : selectedVariation
                  ? selectedVariation.disponivel === 1
                    ? 'Última peça neste tamanho'
                    : `${selectedVariation.disponivel} peças disponíveis neste tamanho`
                  : variacoes.some((v) => v.disponivel <= 0 && v.reservado > 0)
                    ? 'Escolha um tamanho. O ponto laranja marca o que está com outra cliente.'
                    : 'Escolha um tamanho'}
            </p>
          </div>
        )}

        {/* === PEÇA COM OUTRA CLIENTE === */}
        {isReservada && (
          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Reservada para experimentar</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              Esta peça não foi vendida — está com outra cliente experimentando. Pode voltar a ficar disponível em breve.
              Se quiser, fale com a gente que avisamos você.
            </p>
          </div>
        )}

        {isEsgotado && (
          <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Esgotado</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Esta peça não está disponível no momento.</p>
          </div>
        )}

        {/* === QUANTIDADE (só quando faz diferença) === */}
        {podeExperimentar && selectedVariation && maxQuantity > 1 && (
          <div className="mt-7">
            <span className="mb-2.5 block text-sm font-semibold text-[#1A1A1A]">Quantas peças</span>
            <div className="flex h-12 w-fit items-center overflow-hidden rounded-xl border border-slate-200">
              <button type="button" onClick={() => updateQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Diminuir quantidade" className="flex h-full w-11 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-25"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button type="button" onClick={() => updateQuantity(quantity + 1)} disabled={quantity >= maxQuantity} aria-label="Aumentar quantidade" className="flex h-full w-11 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-25"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {/* === AVISOS === */}
        {showWarning && (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-rose-100 bg-rose-50 p-3.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-sm font-medium text-rose-600">
              Escolha {!selectedVariation && hasColors && !selectedColor ? 'a cor e o tamanho' : !selectedVariation ? 'o tamanho' : 'a cor'} para continuar.
            </p>
          </div>
        )}

        {feedback && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-100 bg-rose-50 p-3.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-sm font-medium leading-relaxed text-rose-600">{feedback}</p>
          </div>
        )}

        {/* === AÇÕES === */}
        <div className="mt-8 flex flex-col gap-2.5">
          {podeExperimentar && (
            <>
              <button
                type="button"
                onClick={() => { if (requireSelection()) setIsConfirmOpen(true); }}
                style={{ backgroundColor: primaryColor }}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white shadow-sm transition-all hover:brightness-95 active:scale-[0.99]"
              >
                <Sparkles className="h-5 w-5" />
                Quero experimentar
              </button>
              <button
                type="button"
                onClick={handleAddToBag}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 bg-white text-base font-bold transition-all active:scale-[0.99] ${
                  addedToBag ? 'border-emerald-500 text-emerald-600' : 'border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {addedToBag ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                {addedToBag ? 'Na sua sacola' : 'Adicionar à sacola'}
              </button>
              <p className="mt-0.5 text-center text-xs leading-relaxed text-slate-400">
                Experimentar não é comprar. Você decide depois de provar.
              </p>
            </>
          )}

          <div className={`flex flex-col gap-2.5 sm:flex-row ${podeExperimentar ? 'mt-2' : ''}`}>
            <button type="button" onClick={handleWhatsAppClick} className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 sm:flex-1">
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </button>
            <button type="button" onClick={handleShare} className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 sm:flex-1">
              {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              {linkCopied ? 'Link copiado' : 'Compartilhar'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmTryOnModal
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        isSubmitting={isSubmitting}
        items={bagItem}
        primaryColor={primaryColor}
      />
    </div>
  );
}
