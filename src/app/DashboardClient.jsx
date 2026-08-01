'use client';

import { useState } from 'react';
import MetricsPanel from '@/components/MetricsPanel';
import ProductGrid from '@/components/ProductGrid';
import ProductModal from '@/components/ProductModal';
import ConfigModal from '@/components/ConfigModal';
import LayoutModal from '@/components/LayoutModal';
import CategoryModal from '@/components/CategoryModal';
import { FolderPlus, LogOut, Package, Palette, Settings } from 'lucide-react';
import { logoutAction } from './admin/auth-actions';

export default function DashboardClient({ metrics, products, config, categories }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedProduct(null);
      setIsEditMode(false);
    }, 200); // Wait for transition
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-[#1A1A1A] font-sans selection:bg-[#4A5D4E]/20 selection:text-[#1A1A1A]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A1A1A] text-white rounded-lg flex items-center justify-center shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">
              AmmaFit Admin
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500 hidden sm:block">
              Catálogo via WhatsApp
            </div>
            <button
              onClick={() => setIsCategoryOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              title="Criar categorias"
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden md:inline">Categorias</span>
            </button>
            <button
              onClick={() => setIsLayoutOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
              title="Personalizar layout da loja"
            >
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Editar layout</span>
            </button>
            <button 
              onClick={() => setIsConfigOpen(true)}
              className="p-2 text-slate-500 hover:text-[#1A1A1A] hover:bg-slate-100 rounded-full transition-colors"
              title="Configurações da Loja"
            >
              <Settings className="w-5 h-5" />
            </button>
            <form action={logoutAction}>
              <button type="submit" className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="Sair do painel">
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">Visão Geral</h2>
            <p className="text-slate-500 mt-1">Acompanhe as métricas e gerencie o estoque da loja.</p>
          </div>
        </div>

        <MetricsPanel metrics={metrics} />

        <div className="mt-12">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Produtos</h2>
          <ProductGrid 
            products={products} 
            config={config}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
          />
        </div>
      </main>

      <ProductModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
        isEdit={isEditMode}
        categories={categories}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        initialConfig={config}
      />

      <LayoutModal
        isOpen={isLayoutOpen}
        onClose={() => setIsLayoutOpen(false)}
        initialConfig={config}
        products={products}
        categories={categories}
      />

      <CategoryModal isOpen={isCategoryOpen} onClose={() => setIsCategoryOpen(false)} categories={categories} />
    </div>
  );
}
