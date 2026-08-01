'use client';

import StoreProductCard from './StoreProductCard';

export default function StoreProductGrid({ products }) {
  if (!products || products.length === 0) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Nenhum produto encontrado na loja no momento.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
      {products.map((product) => (
        <StoreProductCard 
          key={product.id} 
          product={product} 
        />
      ))}
    </div>
  );
}
