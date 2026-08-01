'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search, Menu, X, ShoppingBag } from 'lucide-react';
import CartDrawer from './CartDrawer';
import { useCart } from './CartProvider';

export default function StoreNavbar({ activeCategory, onCategoryChange, config, categories = [], searchQuery = '', onSearchChange }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(Boolean(searchQuery));
  const searchInputRef = useRef(null);
  const { itemCount } = useCart();
  const categoryNames = categories.map((category) => category.nome);
  const configuredCategories = (config?.categorias_menu || []).filter((name) => categoryNames.includes(name));
  const mainCategories = configuredCategories.length > 0 ? configuredCategories : categoryNames.slice(0, 5);
  const extraCategories = categoryNames.filter((name) => !mainCategories.includes(name));

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  function handleCategoryClick(cat) {
    setMenuOpen(false);
    if (onCategoryChange) {
      onCategoryChange(cat);
    } else {
      router.push(cat === 'Todos' ? '/' : `/?categoria=${encodeURIComponent(cat)}#produtos`);
    }
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex-shrink-0">
          <button 
            type="button"
            onClick={() => handleCategoryClick('Todos')}
            className="text-xl font-bold tracking-tight"
            style={{ color: config?.cor_secundaria || '#1A1A1A' }}
          >
            {config?.logo_url ? (
              <img
                src={config.logo_url}
                alt="Amma Fit"
                style={{ '--logo-mobile': `${config.logo_largura_mobile || 120}px`, '--logo-desktop': `${config.logo_largura_desktop || 160}px` }}
                className="max-h-12 w-[var(--logo-mobile)] object-contain object-left lg:w-[var(--logo-desktop)]"
              />
            ) : 'AMMA FIT'}
          </button>
        </div>

        {/* Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {['Todos', ...mainCategories].map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? 'text-white'
                  : 'text-slate-600 hover:text-[#1A1A1A] hover:bg-slate-100'
              }`}
              style={activeCategory === cat ? { backgroundColor: config?.cor_secundaria || '#1A1A1A' } : undefined}
            >
              {cat}
            </button>
          ))}
          {extraCategories.length > 0 && (
            <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false); }}>
              <button type="button" onClick={() => setMoreOpen((open) => !open)} className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">Mais <span className="text-base font-bold">+</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} /></button>
              {moreOpen && <div className="absolute right-0 top-full z-50 mt-2 max-h-72 min-w-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{extraCategories.map((cat) => <button key={cat} type="button" onClick={() => { handleCategoryClick(cat); setMoreOpen(false); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">{cat}</button>)}</div>}
            </div>
          )}
        </nav>

        {/* Direita: Busca + Hambúrguer mobile */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => setSearchOpen((open) => !open)} aria-label={searchOpen ? 'Fechar busca' : 'Pesquisar produtos'} className="text-[#1A1A1A] hover:bg-slate-50 p-2 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => setCartOpen(true)} aria-label={`Abrir carrinho com ${itemCount} itens`} className="relative text-[#1A1A1A] hover:bg-slate-50 p-2 rounded-full transition-colors">
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && <span style={{ backgroundColor: config?.cor_primaria || '#4A5D4E' }} className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">{itemCount}</span>}
          </button>
          <button 
            type="button" 
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-[#1A1A1A] hover:bg-slate-50 p-2 rounded-full transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 shadow-sm">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:bg-white">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input ref={searchInputRef} type="search" value={searchQuery} onChange={(event) => onSearchChange?.(event.target.value)} placeholder="Buscar por nome, código, categoria, cor ou tamanho..." className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
            {searchQuery && <button type="button" onClick={() => onSearchChange?.('')} aria-label="Limpar busca" className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X className="h-4 w-4" /></button>}
          </div>
        </div>
      )}

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col py-2">
            {['Todos', ...categoryNames].map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-6 py-3 text-left text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#1A1A1A]'
                }`}
                style={activeCategory === cat ? { backgroundColor: config?.cor_secundaria || '#1A1A1A' } : undefined}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      )}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} config={config} />
    </header>
  );
}
