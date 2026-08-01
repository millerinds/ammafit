'use client';

import { Eye, Package } from 'lucide-react';

export default function ProductCard({ product, onEdit }) {
  const primaryImage = (product.imagens && product.imagens.length > 0) 
    ? product.imagens[0] 
    : product.imagem_url || '';
  const hasOffer = Boolean(product.oferta_ativa) && Number(product.preco_original) > Number(product.preco);

  return (
    <div 
      onClick={() => onEdit(product)}
      className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 flex flex-col"
    >
      <div className="absolute top-3 right-3 z-10 bg-[#4A5D4E]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
        <Eye className="w-3.5 h-3.5" />
        {product.acessos}
      </div>
      {hasOffer && <div className="absolute left-3 top-3 z-10 rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Oferta</div>}
      
      <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
        {primaryImage ? (
          <img 
            src={primaryImage} 
            alt={product.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Package className="w-12 h-12" />
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-[#1A1A1A] text-lg mb-1 truncate">{product.nome}</h3>
        {product.sku && (
          <p className="text-xs text-slate-500 mb-2">SKU: {product.sku}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex flex-col">
            {hasOffer && <span className="text-[11px] text-slate-400 line-through">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco_original)}</span>}
            <span className={`font-bold ${hasOffer ? 'text-rose-600' : 'text-[#1A1A1A]'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.preco)}</span>
          </div>
          <span className="text-sm text-[#4A5D4E] bg-[#4A5D4E]/10 px-2.5 py-1 rounded-md font-medium">
            Estoque: {product.estoque}
          </span>
        </div>
        
      </div>
    </div>
  );
}
