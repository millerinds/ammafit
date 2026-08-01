'use client';

import Link from 'next/link';

export default function StoreProductCard({ product }) {
  const primaryImage = (product.imagens && product.imagens.length > 0) 
    ? product.imagens[0] 
    : product.imagem_url || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=400&auto=format&fit=crop';
  const hasOffer = Boolean(product.oferta_ativa) && Number(product.preco_original) > Number(product.preco);
  const discount = hasOffer ? Math.round((1 - Number(product.preco) / Number(product.preco_original)) * 100) : 0;

  return (
    <Link 
      href={`/produto/${product.id}`}
      className="group cursor-pointer flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-500"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-slate-100">
        <img 
          src={primaryImage} 
          alt={product.nome}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Overlay hover sutil */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
        
        {/* Badge de Lançamento ou Categoria (Opcional) */}
        {product.categoria && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
            <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider">{product.categoria}</span>
          </div>
        )}
        {hasOffer && <div className="absolute right-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">-{discount}%</div>}
      </div>

      <div className="flex flex-col">
        <h3 className="font-semibold text-[#1A1A1A] text-base leading-tight group-hover:text-[#4A5D4E] transition-colors">{product.nome}</h3>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          {hasOffer && <span className="text-xs text-slate-400 line-through">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco_original)}</span>}
          <span className={`text-sm ${hasOffer ? 'font-bold text-rose-600' : 'text-slate-500'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco)}</span>
        </div>
        
        <span className="mt-3 block w-full py-2 bg-white border border-[#1A1A1A] text-[#1A1A1A] rounded-xl text-center font-medium text-sm group-hover:bg-[#1A1A1A] group-hover:text-white transition-all duration-300">
          Tenho Interesse
        </span>
      </div>
    </Link>
  );
}
