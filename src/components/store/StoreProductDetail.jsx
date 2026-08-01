'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, AlertCircle, ShoppingBag, Check, Minus, Plus } from 'lucide-react';
import { registerWhatsappClick, registerAccess } from '@/app/actions';
import { useCart } from './CartProvider';

export default function StoreProductDetail({ product, config }) {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  // Registra o acesso quando a página do produto é aberta
  useEffect(() => {
    if (product?.id) {
      registerAccess(product.id).catch(() => {});
    }
  }, [product?.id]);

  if (!product) return null;

  const imagens = product.imagens && product.imagens.length > 0
    ? product.imagens
    : ['https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop'];

  const hasSizes = product.tamanhos && product.tamanhos.length > 0;
  const hasColors = product.cores && product.cores.length > 0;
  const maxQuantity = Number(product.estoque) > 0 ? Number(product.estoque) : 99;
  const hasOffer = Boolean(product.oferta_ativa) && Number(product.preco_original) > Number(product.preco);
  const discount = hasOffer ? Math.round((1 - Number(product.preco) / Number(product.preco_original)) * 100) : 0;

  function updateQuantity(nextQuantity) {
    setQuantity(Math.min(maxQuantity, Math.max(1, Math.floor(Number(nextQuantity) || 1))));
  }

  function handleNextImage() {
    setCurrentImageIdx(prev => (prev === imagens.length - 1 ? 0 : prev + 1));
  }

  function handlePrevImage() {
    setCurrentImageIdx(prev => (prev === 0 ? imagens.length - 1 : prev - 1));
  }

  function handleSelectSize(size) {
    setSelectedSize(size);
    setShowWarning(false);
  }

  function handleSelectColor(color) {
    setSelectedColor(color);
    setShowWarning(false);
  }

  function handleWhatsAppClick() {
    // 1. Validar seleções obrigatórias
    if (hasSizes && !selectedSize) {
      setShowWarning(true);
      return;
    }
    if (hasColors && !selectedColor) {
      setShowWarning(true);
      return;
    }
    setShowWarning(false);

    // 2. Montar número (fallback para testes se vazio)
    const rawNum = config?.whatsapp_numero ? String(config.whatsapp_numero) : '';
    const numero = rawNum.replace(/[^0-9]/g, '') || '5549999999999';

    // 3. Montar mensagem dinâmica com o CÓDIGO do produto
    const codigo = product.sku || product.nome;
    let msg = `Olá! Gostaria de saber a disponibilidade de ${quantity}x do código ${codigo}`;
    if (selectedColor) msg += ` na cor ${selectedColor}`;
    if (selectedSize) msg += ` e tamanho ${selectedSize}`;
    msg += '.';

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;

    // 4. ABRIR O WHATSAPP PRIMEIRO — síncrono, direto no clique
    window.open(url, '_blank');

    // 5. Registrar clique em background (sem revalidatePath)
    registerWhatsappClick(product.id).catch(() => {});
  }

  function handleAddToCart() {
    if ((hasSizes && !selectedSize) || (hasColors && !selectedColor)) {
      setShowWarning(true);
      return;
    }

    setShowWarning(false);
    addItem(product, selectedColor, selectedSize, quantity);
    setAddedToCart(true);
    window.setTimeout(() => setAddedToCart(false), 2000);
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
          {hasOffer && <span className="w-full text-base text-slate-400 line-through">De {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco_original)}</span>}
          <span className={`text-2xl font-medium md:text-3xl ${hasOffer ? 'font-bold text-rose-600' : 'text-[#1A1A1A]'}`}>{hasOffer ? 'Por ' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco)}</span>
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
                  onClick={() => handleSelectColor(cor)}
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

        {/* === TAMANHOS === */}
        {hasSizes && (
          <div className="mb-10">
            <span className="text-sm font-semibold text-[#1A1A1A] block mb-3 uppercase tracking-wider">
              Tamanho: <span className="font-normal text-slate-500">{selectedSize || 'Nenhum'}</span>
            </span>
            <div className="flex flex-wrap gap-3">
              {product.tamanhos.map((tamanho, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectSize(tamanho)}
                  className={`w-14 h-14 flex items-center justify-center rounded-xl text-sm font-medium border transition-all duration-200 ${
                    selectedSize === tamanho
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-md scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#1A1A1A]'
                  }`}
                >
                  {tamanho}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* === QUANTIDADE === */}
        <div className="mb-8">
          <span className="mb-3 block text-sm font-semibold uppercase tracking-wider text-[#1A1A1A]">Quantidade</span>
          <div className="flex items-center gap-3">
            <div className="flex h-12 items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button type="button" onClick={() => updateQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Diminuir quantidade" className="flex h-full w-12 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><Minus className="h-4 w-4" /></button>
              <input type="number" min="1" max={maxQuantity} value={quantity} onChange={(event) => updateQuantity(event.target.value)} aria-label="Quantidade do produto" className="h-full w-14 border-x border-slate-200 bg-white text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
              <button type="button" onClick={() => updateQuantity(quantity + 1)} disabled={quantity >= maxQuantity} aria-label="Aumentar quantidade" className="flex h-full w-12 items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"><Plus className="h-4 w-4" /></button>
            </div>
            {Number(product.estoque) > 0 && <span className="text-xs text-slate-400">Até {product.estoque} em estoque</span>}
          </div>
        </div>

        {/* === DESCRIÇÃO === */}
        <div className="prose prose-sm text-slate-600 mb-10">
          <p className="whitespace-pre-wrap leading-relaxed">
            {product.descricao || 'Peça exclusiva da nova coleção Amma Fit, desenhada para garantir máximo conforto e estilo durante seus movimentos.'}
          </p>
        </div>

        {/* === AVISO === */}
        {showWarning && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-sm text-rose-600 font-medium">
              Por favor, selecione {hasSizes && !selectedSize && hasColors && !selectedColor ? 'cor e tamanho' : hasSizes && !selectedSize ? 'tamanho' : 'cor'} antes de prosseguir.
            </p>
          </div>
        )}

        {/* === BOTÃO WHATSAPP === */}
        <div className="mt-auto">
          <button
            type="button"
            onClick={handleAddToCart}
            style={{ borderColor: config?.cor_primaria || '#4A5D4E', color: config?.cor_primaria || '#4A5D4E' }}
            className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl border-2 bg-white py-4 font-bold transition-all hover:brightness-95 active:scale-[0.98] md:py-5 text-lg"
          >
            {addedToCart ? <Check className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
            <span>{addedToCart ? `${quantity} ${quantity === 1 ? 'item adicionado' : 'itens adicionados'}` : 'Adicionar ao carrinho'}</span>
          </button>
          <button
            type="button"
            onClick={handleWhatsAppClick}
            style={{ backgroundColor: config?.cor_primaria || '#4A5D4E' }}
            className="w-full py-4 md:py-5 hover:brightness-90 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg text-lg"
          >
            <MessageCircle className="w-6 h-6" />
            <span>Comprar pelo WhatsApp</span>
          </button>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs font-medium text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Atendimento humanizado e rápido
          </div>
        </div>

      </div>
    </div>
  );
}
