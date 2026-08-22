'use client';

import { useState, useEffect, useMemo } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, AlertCircle, ShoppingBag, Check, Minus, Plus, Share2, Clock } from 'lucide-react';
import { registerWhatsappClick, registerAccess } from '@/app/actions';
import { solicitarCondicional } from '@/app/condicional-actions';
import { useBag } from './BagProvider';
import CondicionalConfirmModal from './CondicionalConfirmModal';

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
  const showSizePicker = !(variacoes.length === 1 && variacoes[0].tamanho === TAMANHO_UNICO);
  // Produto de tamanho único não exige escolha: já vale como selecionado.
  const variacaoUnica = variacoes.length === 1 && variacoes[0].tamanho === TAMANHO_UNICO ? variacoes[0] : null;
  const selectedVariation = variacoes.find((variation) => variation.id === selectedVariationId) || variacaoUnica;
  const maxQuantity = Math.max(1, selectedVariation?.disponivel || 1);
  const totalDisponivel = Number(product.disponivel_total) || 0;
  const totalReservado = Number(product.reservado_total) || 0;
  const isEmCondicional = totalDisponivel === 0 && totalReservado > 0;
  const isEsgotado = totalDisponivel === 0 && totalReservado === 0;
  const hasOffer = Boolean(product.oferta_ativa) && Number(product.preco_original) > Number(product.preco);
  const discount = hasOffer ? Math.round((1 - Number(product.preco) / Number(product.preco_original)) * 100) : 0;
  const primaryColor = config?.cor_primaria || '#4A5D4E';

  function updateQuantity(nextQuantity) {
    setQuantity(Math.min(maxQuantity, Math.max(1, Math.floor(Number(nextQuantity) || 1))));
  }

  function handleNextImage() {
    setCurrentImageIdx((prev) => (prev === imagens.length - 1 ? 0 : prev + 1));
  }

  function handlePrevImage() {
    setCurrentImageIdx((prev) => (prev === 0 ? imagens.length - 1 : prev - 1));
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
    window.setTimeout(() => setAddedToBag(false), 2000);
  }

  async function handleConfirmCondicional() {
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
            ? 'Esta peça acabou de ser reservada por outra cliente. Atualize a página para ver a disponibilidade.'
            : result?.erro || 'Não foi possível registrar o condicional. Tente novamente.'
        );
        return;
      }

      const rawNumber = config?.whatsapp_numero ? String(config.whatsapp_numero) : '';
      const numero = rawNumber.replace(/[^0-9]/g, '') || '5549999999999';
      const tamanho = selectedVariation.tamanho && selectedVariation.tamanho !== TAMANHO_UNICO
        ? `\nTamanho: ${selectedVariation.tamanho}`
        : '';
      const cor = selectedColor ? `\nCor: ${selectedColor}` : '';
      const mensagem = `Olá! Gostaria de solicitar esta peça para condicional:\n\n${product.nome}${tamanho}${cor}\n\n${window.location.origin}/produto/${product.id}`;

      setIsConfirmOpen(false);
      if (whatsappTab) whatsappTab.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
      else window.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

      registerWhatsappClick(product.id).catch(() => {});
    } catch (error) {
      whatsappTab?.close();
      setIsConfirmOpen(false);
      setFeedback(error?.message || 'Não foi possível registrar o condicional. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleWhatsAppClick() {
    const rawNum = config?.whatsapp_numero ? String(config.whatsapp_numero) : '';
    const numero = rawNum.replace(/[^0-9]/g, '') || '5549999999999';
    const codigo = product.sku || product.nome;

    let msg = `Olá! Gostaria de saber mais sobre o código ${codigo}`;
    if (selectedColor) msg += ` na cor ${selectedColor}`;
    if (selectedVariation && selectedVariation.tamanho !== TAMANHO_UNICO) msg += ` e tamanho ${selectedVariation.tamanho}`;
    msg += '.';

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
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
    <div className="flex flex-col md:flex-row gap-8 lg:gap-16 animate-in fade-in slide-in-from-bottom-8 duration-500">

      {/* === GALERIA === */}
      <div className="w-full md:w-1/2 relative bg-slate-100 rounded-2xl overflow-hidden aspect-[4/5] md:aspect-auto md:h-[700px] flex-shrink-0 group">
        <img
          src={imagens[currentImageIdx]}
          alt={product.nome}
          className="w-full h-full object-cover transition-opacity duration-300"
        />

        {isEmCondicional && (
          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-md">
            <Clock className="h-3.5 w-3.5" />
            Em condicional
          </div>
        )}

        {imagens.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 text-[#1A1A1A]"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 text-[#1A1A1A]"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {imagens.map((_, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setCurrentImageIdx(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === currentImageIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* === DETALHES === */}
      <div className="flex-1 flex flex-col py-4 md:py-8">
        <span className="text-xs font-bold tracking-widest text-[#4A5D4E] uppercase mb-3">
          {product.categoria || 'Coleção'}
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-4 tracking-tight">
          {product.nome}
        </h1>
        <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1">
          {hasOffer && <span className="w-full text-base text-slate-400 line-through">De {currency.format(product.preco_original)}</span>}
          <span className={`text-2xl font-medium md:text-3xl ${hasOffer ? 'font-bold text-rose-600' : 'text-[#1A1A1A]'}`}>{hasOffer ? 'Por ' : ''}{currency.format(product.preco)}</span>
          {hasOffer && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600">{discount}% OFF</span>}
        </div>

        {/* === CORES === */}
        {hasColors && (
          <div className="mb-8">
            <span className="text-sm font-semibold text-[#1A1A1A] block mb-3 uppercase tracking-wider">
              Cor: <span className="font-normal text-slate-500">{selectedColor || 'Nenhuma'}</span>
            </span>
            <div className="flex flex-wrap gap-3">
              {product.cores.map((cor, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => { setSelectedColor(cor); setShowWarning(false); }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                    selectedColor === cor
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-md scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#1A1A1A]'
                  }`}
                >
                  {cor}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* === TAMANHOS COM ESTOQUE PRÓPRIO === */}
        {showSizePicker && (
          <div className="mb-10">
            <span className="text-sm font-semibold text-[#1A1A1A] block mb-3 uppercase tracking-wider">
              Tamanho: <span className="font-normal text-slate-500">{selectedVariation?.tamanho || 'Nenhum'}</span>
            </span>
            <div className="flex flex-wrap gap-3">
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
                    title={reservada ? 'Em condicional com outra cliente' : indisponivel ? 'Esgotado' : `${variation.disponivel} disponível(is)`}
                    className={`relative flex min-w-14 flex-col items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-md scale-105'
                        : indisponivel
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <span className={indisponivel && !isSelected ? 'line-through decoration-slate-300' : ''}>{variation.tamanho}</span>
                    <span className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      isSelected ? 'text-white/70' : reservada ? 'text-amber-500' : indisponivel ? 'text-slate-300' : 'text-slate-400'
                    }`}>
                      {reservada ? 'em prova' : indisponivel ? 'esgotado' : `${variation.disponivel} un.`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* === STATUS DA PEÇA === */}
        {isEmCondicional && (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Em condicional</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                Esta peça está com outra cliente para prova. Ela pode voltar a ficar disponível — fale com a gente pelo WhatsApp.
              </p>
            </div>
          </div>
        )}

        {/* === QUANTIDADE === */}
        {!isEmCondicional && !isEsgotado && (
          <div className="mb-8">
            <span className="mb-3 block text-sm font-semibold uppercase tracking-wider text-[#1A1A1A]">Quantidade</span>
            <div className="flex items-center gap-3">
              <div className="flex h-12 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button type="button" onClick={() => updateQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Diminuir quantidade" className="flex h-full w-12 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                <input type="number" min="1" max={maxQuantity} value={quantity} onChange={(event) => updateQuantity(event.target.value)} aria-label="Quantidade de peças" className="h-full w-14 border-x border-slate-200 bg-white text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                <button type="button" onClick={() => updateQuantity(quantity + 1)} disabled={quantity >= maxQuantity} aria-label="Aumentar quantidade" className="flex h-full w-12 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><Plus className="h-4 w-4" /></button>
              </div>
              {selectedVariation
                ? <span className="text-xs text-slate-400">{selectedVariation.disponivel} disponível(is) no tamanho {selectedVariation.tamanho}</span>
                : <span className="text-xs text-slate-400">Escolha o tamanho</span>}
            </div>
          </div>
        )}

        {/* === DESCRIÇÃO === */}
        <div className="prose prose-sm text-slate-600 mb-10">
          <p className="whitespace-pre-wrap leading-relaxed">
            {product.descricao || 'Peça exclusiva da nova coleção Amma Fit, desenhada para garantir máximo conforto e estilo durante seus movimentos.'}
          </p>
        </div>

        {/* === AVISOS === */}
        {showWarning && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-sm text-rose-600 font-medium">
              Por favor, selecione {!selectedVariation && hasColors && !selectedColor ? 'cor e tamanho' : !selectedVariation ? 'o tamanho' : 'a cor'} antes de prosseguir.
            </p>
          </div>
        )}

        {feedback && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
            <p className="text-sm font-medium text-rose-600">{feedback}</p>
          </div>
        )}

        {/* === AÇÕES === */}
        <div className="mt-auto">
          {!isEsgotado && !isEmCondicional && (
            <>
              <button
                type="button"
                onClick={() => { if (requireSelection()) setIsConfirmOpen(true); }}
                style={{ backgroundColor: primaryColor }}
                className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl py-4 text-lg font-bold text-white shadow-lg transition-all hover:brightness-90 active:scale-[0.98] md:py-5"
              >
                <Clock className="h-6 w-6" />
                <span>Solicitar condicional</span>
              </button>
              <button
                type="button"
                onClick={handleAddToBag}
                style={{ borderColor: primaryColor, color: primaryColor }}
                className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl border-2 bg-white py-4 text-lg font-bold transition-all hover:brightness-95 active:scale-[0.98] md:py-5"
              >
                {addedToBag ? <Check className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                <span>{addedToBag ? 'Adicionado à sacola' : 'Adicionar à sacola para provar'}</span>
              </button>
            </>
          )}

          {isEsgotado && (
            <div className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 py-4 text-center font-bold text-slate-400">
              Esgotado
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Falar no WhatsApp</span>
            </button>
            <button type="button" onClick={handleShare} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900">
              {linkCopied ? <Check className="h-5 w-5 text-emerald-600" /> : <Share2 className="h-5 w-5" />}
              <span>{linkCopied ? 'Link copiado' : 'Compartilhar'}</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mt-4 text-xs font-medium text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Atendimento humanizado e rápido
          </div>
        </div>
      </div>

      <CondicionalConfirmModal
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmCondicional}
        isSubmitting={isSubmitting}
        productName={product.nome}
        size={selectedVariation && selectedVariation.tamanho !== TAMANHO_UNICO ? selectedVariation.tamanho : ''}
        quantity={quantity}
        primaryColor={primaryColor}
      />
    </div>
  );
}
