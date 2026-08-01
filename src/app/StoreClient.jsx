'use client';

import { useState } from 'react';
import StoreNavbar from '@/components/store/StoreNavbar';
import StoreHero from '@/components/store/StoreHero';
import StoreProductGrid from '@/components/store/StoreProductGrid';

export default function StoreClient({ products, config, categories, initialCategory = 'Todos' }) {
  const validInitialCategory = categories.some((category) => category.nome === initialCategory) ? initialCategory : 'Todos';
  const [activeCategory, setActiveCategory] = useState(validInitialCategory);

  const filteredProducts = activeCategory === 'Todos'
    ? products
    : products.filter(p => p.categoria === activeCategory);

  return (
    <div
      suppressHydrationWarning
      style={{
        '--store-primary': config?.cor_primaria || '#4A5D4E',
        '--store-secondary': config?.cor_secundaria || '#1A1A1A',
        '--store-background': config?.cor_fundo || '#F8F9FA',
        backgroundColor: config?.cor_fundo || '#F8F9FA',
        color: config?.cor_secundaria || '#1A1A1A',
      }}
      className="min-h-screen font-sans selection:bg-[var(--store-primary)]/20"
    >
      <StoreNavbar activeCategory={activeCategory} onCategoryChange={setActiveCategory} config={config} categories={categories} />
      
      <main>
        {activeCategory === 'Todos' && (
          <StoreHero banners={config?.banners} primaryColor={config?.cor_primaria} onCategoryChange={setActiveCategory} />
        )}
        
        <section id="produtos" className={`max-w-7xl mx-auto scroll-mt-20 px-4 sm:px-6 lg:px-8 ${activeCategory === 'Todos' ? 'py-16 md:py-24' : 'py-10 md:py-14'}`}>
          <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] mb-4 text-center">
              {activeCategory === 'Todos' ? 'Nossas Peças' : activeCategory}
            </h2>
            <div className="w-16 h-1 rounded-full" style={{ backgroundColor: config?.cor_primaria || '#4A5D4E' }}></div>
          </div>
          
          <StoreProductGrid products={filteredProducts} />
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Amma Fit. Todos os direitos reservados.</p>
          <p className="mt-2">Catálogo Digital Oficial</p>
        </div>
      </footer>
    </div>
  );
}
