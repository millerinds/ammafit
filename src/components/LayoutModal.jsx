'use client';

import { useState } from 'react';
import { Image as ImageIcon, Loader2, Monitor, Palette, Plus, Save, Smartphone, Trash2, X } from 'lucide-react';
import { saveLayoutConfig } from '@/app/actions';
import SearchableSelect from './SearchableSelect';

const EMPTY_BANNER = {
  imagem_desktop: '',
  imagem_mobile: '',
  titulo: '',
  subtitulo: '',
  link_tipo: 'none',
  link_valor: '',
};

const LINK_TYPE_OPTIONS = [
  { value: 'none', label: 'Sem link' },
  { value: 'product', label: 'Abrir um produto' },
  { value: 'category', label: 'Mostrar uma categoria' },
  { value: 'section', label: 'Ir para uma parte da loja' },
];
const SECTION_OPTIONS = [{ value: 'produtos', label: 'Lista de produtos' }, { value: 'topo', label: 'Topo da loja' }];

export default function LayoutModal({ isOpen, onClose, initialConfig, products, categories }) {
  if (!isOpen) return null;

  return (
    <LayoutModalContent
      key={JSON.stringify([initialConfig?.logo_url, initialConfig?.cor_primaria, initialConfig?.banners])}
      onClose={onClose}
      initialConfig={initialConfig}
      products={products}
      categories={categories}
    />
  );
}

function LayoutModalContent({ onClose, initialConfig, products, categories }) {
  const [formData, setFormData] = useState(() => ({
    logo_url: initialConfig?.logo_url || '',
    cor_primaria: initialConfig?.cor_primaria || '#4A5D4E',
    cor_secundaria: initialConfig?.cor_secundaria || '#1A1A1A',
    cor_fundo: initialConfig?.cor_fundo || '#F8F9FA',
    banners: initialConfig?.banners || [],
    categorias_menu: initialConfig?.categorias_menu || [],
    logo_largura_desktop: initialConfig?.logo_largura_desktop || 160,
    logo_largura_mobile: initialConfig?.logo_largura_mobile || 120,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const productOptions = products.map((product) => ({ value: String(product.id), label: `${product.nome} — ${product.sku || `#${product.id}`}` }));
  const categoryOptions = categories.map((category) => ({ value: category.nome, label: category.nome }));
  const filteredCategories = categories.filter((category) => category.nome.toLocaleLowerCase('pt-BR').includes(categorySearch.toLocaleLowerCase('pt-BR')));

  function toggleMenuCategory(categoryName) {
    setFormData((current) => {
      const selected = current.categorias_menu.includes(categoryName);
      if (!selected && current.categorias_menu.length >= 5) return current;
      return { ...current, categorias_menu: selected ? current.categorias_menu.filter((name) => name !== categoryName) : [...current.categorias_menu, categoryName] };
    });
  }

  function updateBanner(index, field, value) {
    setFormData((current) => ({
      ...current,
      banners: current.banners.map((banner, bannerIndex) =>
        bannerIndex === index
          ? { ...banner, [field]: value, ...(field === 'link_tipo' ? { link_valor: '' } : {}) }
          : banner
      ),
    }));
  }

  function addBanner() {
    setFormData((current) => ({
      ...current,
      banners: [...current.banners, { ...EMPTY_BANNER, id: `${Date.now()}` }],
    }));
  }

  function removeBanner(index) {
    setFormData((current) => ({
      ...current,
      banners: current.banners.filter((_, bannerIndex) => bannerIndex !== index),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await saveLayoutConfig(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar layout:', error);
      alert('Não foi possível salvar o layout da loja.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#F8F9FA] shadow-2xl sm:h-[92vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-[#4A5D4E]" />
            <div>
              <h2 className="text-lg font-bold sm:text-xl">Personalizar layout da loja</h2>
              <p className="hidden text-xs text-slate-500 sm:block">Logo, cores e slides do banner para celular e computador.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>

        <form id="layout-form" onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-2"><ImageIcon className="h-5 w-5" /><h3 className="font-bold">Identidade visual</h3></div>
              <label className="mb-1 block text-sm font-medium text-slate-700">URL da logo</label>
              <input type="url" value={formData.logo_url} onChange={(event) => setFormData({ ...formData, logo_url: event.target.value })} placeholder="https://exemplo.com/logo.png" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-500" />
              <p className="mt-1 text-xs text-slate-500">Recomendado: PNG ou SVG com fundo transparente, proporção horizontal de aproximadamente 3:1.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Largura no computador: {formData.logo_largura_desktop}px<input type="range" min="80" max="240" step="5" value={formData.logo_largura_desktop} onChange={(event) => setFormData({ ...formData, logo_largura_desktop: Number(event.target.value) })} className="mt-2 w-full accent-slate-900" /></label>
                <label className="text-sm font-medium text-slate-700">Largura no celular: {formData.logo_largura_mobile}px<input type="range" min="60" max="180" step="5" value={formData.logo_largura_mobile} onChange={(event) => setFormData({ ...formData, logo_largura_mobile: Number(event.target.value) })} className="mt-2 w-full accent-slate-900" /></label>
              </div>
              {formData.logo_url && (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><Monitor className="h-4 w-4" />PRÉVIA NO COMPUTADOR</div><div className="flex h-16 items-center rounded-xl border border-slate-200 bg-white px-4 shadow-sm"><img src={formData.logo_url} alt="Prévia da logo no computador" style={{ width: formData.logo_largura_desktop }} className="max-h-12 object-contain object-left" /><div className="ml-auto hidden gap-3 text-[10px] text-slate-400 sm:flex"><span>Todos</span><span>Categoria</span><span>Mais +</span></div></div></div>
                  <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><Smartphone className="h-4 w-4" />PRÉVIA NO CELULAR</div><div className="mx-auto flex h-16 max-w-[320px] items-center rounded-xl border border-slate-200 bg-white px-3 shadow-sm"><img src={formData.logo_url} alt="Prévia da logo no celular" style={{ width: formData.logo_largura_mobile }} className="max-h-12 object-contain object-left" /><div className="ml-auto flex gap-2 text-slate-400"><span>◯</span><span>☰</span></div></div></div>
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  ['cor_primaria', 'Cor principal'],
                  ['cor_secundaria', 'Textos e contraste'],
                  ['cor_fundo', 'Fundo da loja'],
                ].map(([field, label]) => (
                  <label key={field} className="block text-sm font-medium text-slate-700">
                    {label}
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                      <input type="color" value={formData[field]} onChange={(event) => setFormData({ ...formData, [field]: event.target.value })} className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent" />
                      <input type="text" value={formData[field]} onChange={(event) => setFormData({ ...formData, [field]: event.target.value })} className="min-w-0 flex-1 bg-transparent text-sm uppercase outline-none" maxLength="7" />
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="font-bold">Categorias na barra principal</h3>
              <p className="mt-1 text-sm text-slate-500">Escolha até 5 categorias para aparecerem diretamente no cabeçalho. As outras ficarão dentro de “Mais +”.</p>
              <div className="mt-4 flex flex-wrap gap-2">{formData.categorias_menu.map((name, index) => <span key={name} className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">{index + 1}. {name}<button type="button" onClick={() => toggleMenuCategory(name)}><X className="h-3.5 w-3.5" /></button></span>)}</div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Buscar categoria..." className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" /><span className="text-xs text-slate-400">{formData.categorias_menu.length}/5</span></div>
              <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {filteredCategories.map((category) => { const selected = formData.categorias_menu.includes(category.nome); return <button key={category.id} type="button" onClick={() => toggleMenuCategory(category.nome)} disabled={!selected && formData.categorias_menu.length >= 5} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${selected ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'}`}><span>{category.nome}</span><span>{selected ? '✓' : '+'}</span></button>; })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-bold">Slides do banner</h3>
                  <p className="mt-1 text-sm text-slate-500">Adicione quantos slides quiser. A loja alternará automaticamente entre eles.</p>
                </div>
                <button type="button" onClick={addBanner} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Adicionar slide</button>
              </div>

              <div className="mt-5 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 sm:grid-cols-2">
                <div className="flex gap-2"><Monitor className="h-4 w-4 shrink-0" /><span><strong>Computador:</strong> 1920 × 800 px (proporção 12:5).</span></div>
                <div className="flex gap-2"><Smartphone className="h-4 w-4 shrink-0" /><span><strong>Celular:</strong> 1080 × 1350 px (proporção 4:5).</span></div>
              </div>

              {formData.banners.length === 0 ? (
                <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">Nenhum slide personalizado. A imagem padrão continuará sendo exibida.</div>
              ) : (
                <div className="mt-6 space-y-5">
                  {formData.banners.map((banner, index) => (
                    <article key={banner.id || index} className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div className="mb-4 flex items-center justify-between"><h4 className="font-semibold">Slide {index + 1}</h4><button type="button" onClick={() => removeBanner(index)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" aria-label={`Excluir slide ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-slate-700">Imagem para computador *<input required type="url" value={banner.imagem_desktop} onChange={(event) => updateBanner(index, 'imagem_desktop', event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none" /></label>
                        <label className="text-sm font-medium text-slate-700">Imagem para celular<input type="url" value={banner.imagem_mobile} onChange={(event) => updateBanner(index, 'imagem_mobile', event.target.value)} placeholder="Opcional; usa a imagem desktop se vazio" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none" /></label>
                        <label className="text-sm font-medium text-slate-700">Título<input type="text" value={banner.titulo} onChange={(event) => updateBanner(index, 'titulo', event.target.value)} placeholder="Nova coleção" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none" /></label>
                        <label className="text-sm font-medium text-slate-700">Texto de apoio<input type="text" value={banner.subtitulo} onChange={(event) => updateBanner(index, 'subtitulo', event.target.value)} placeholder="Conforto e movimento" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none" /></label>
                        <label className="text-sm font-medium text-slate-700">Ao clicar em “Saiba mais”<SearchableSelect value={banner.link_tipo} onChange={(value) => updateBanner(index, 'link_tipo', value)} options={LINK_TYPE_OPTIONS} searchPlaceholder="Buscar tipo de destino..." /></label>
                        {banner.link_tipo === 'product' && <label className="text-sm font-medium text-slate-700">Produto<SearchableSelect value={banner.link_valor} onChange={(value) => updateBanner(index, 'link_valor', value)} options={productOptions} placeholder="Selecione um produto..." searchPlaceholder="Buscar por nome ou código..." /></label>}
                        {banner.link_tipo === 'category' && <label className="text-sm font-medium text-slate-700">Categoria<SearchableSelect value={banner.link_valor} onChange={(value) => updateBanner(index, 'link_valor', value)} options={categoryOptions} placeholder="Selecione uma categoria..." searchPlaceholder="Buscar categoria..." /></label>}
                        {banner.link_tipo === 'section' && <label className="text-sm font-medium text-slate-700">Parte da loja<SearchableSelect value={banner.link_valor || 'produtos'} onChange={(value) => updateBanner(index, 'link_valor', value)} options={SECTION_OPTIONS} searchPlaceholder="Buscar parte da loja..." /></label>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </form>

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-2.5 font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button form="layout-form" type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-5 py-2.5 font-semibold text-white disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSubmitting ? 'Salvando...' : 'Salvar layout'}</button>
        </div>
      </div>
    </div>
  );
}
