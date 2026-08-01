'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Info, Image as ImageIcon, Tag, Box, Truck, Plus, XCircle, Loader2 } from 'lucide-react';
import { addProduct, updateProduct, deleteProduct, registerAccess } from '@/app/actions';
import SearchableSelect from './SearchableSelect';

const TABS = [
  { id: 'basico', label: 'Informações Básicas', icon: Info },
  { id: 'midia', label: 'Galeria de Mídia', icon: ImageIcon },
  { id: 'estoque', label: 'Preço e Estoque', icon: Tag },
  { id: 'variantes', label: 'Variantes', icon: Box },
];

export default function ProductModal({ isOpen, onClose, product, isEdit, categories }) {
  if (!isOpen) return null;

  return (
    <ProductModalContent
      key={isEdit ? `edit-${product?.id}` : 'new-product'}
      onClose={onClose}
      product={product}
      isEdit={isEdit}
      categories={categories}
    />
  );
}

function getInitialFormData(product, isEdit) {
  if (!isEdit || !product) {
    return {
      nome: '', descricao: '', categoria: 'Leggings', preco: '', preco_original: '', oferta_ativa: false, preco_custo: '', sku: '', estoque: '',
      imagens: [], tamanhos: [], cores: [], peso: '', dimensoes: { width: '', height: '', length: '' }, slug: ''
    };
  }

  return {
    nome: product.nome || '',
    descricao: product.descricao || '',
    categoria: product.categoria || '',
    preco: product.preco || '',
    preco_original: product.preco_original || '',
    oferta_ativa: Boolean(product.oferta_ativa),
    preco_custo: product.preco_custo || '',
    sku: product.sku || '',
    estoque: product.estoque || '',
    imagens: product.imagens || [],
    tamanhos: product.tamanhos || [],
    cores: product.cores || [],
    peso: product.peso || '',
    dimensoes: product.dimensoes || { width: '', height: '', length: '' },
    slug: product.slug || ''
  };
}

function ProductModalContent({ onClose, product, isEdit, categories }) {
  const [activeTab, setActiveTab] = useState('basico');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => getInitialFormData(product, isEdit));
  const [newImage, setNewImage] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');

  useEffect(() => {
    if (isEdit && product) {
      registerAccess(product.id).catch(console.error);
    }
  }, [isEdit, product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('dim_')) {
      const dim = name.split('_')[1];
      setFormData(prev => ({ ...prev, dimensoes: { ...prev.dimensoes, [dim]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddImage = () => {
    if (newImage && !formData.imagens.includes(newImage)) {
      setFormData(prev => ({ ...prev, imagens: [...prev.imagens, newImage] }));
      setNewImage('');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({ ...prev, imagens: prev.imagens.filter((_, i) => i !== index) }));
  };

  const handleAddVariant = (type, val, setter) => {
    if (val && !formData[type].includes(val)) {
      setFormData(prev => ({ ...prev, [type]: [...prev[type], val] }));
      setter('');
    }
  };

  const handleRemoveVariant = (type, index) => {
    setFormData(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        preco: parseFloat(formData.preco) || 0,
        preco_original: formData.oferta_ativa ? parseFloat(formData.preco_original) || 0 : null,
        oferta_ativa: Boolean(formData.oferta_ativa),
        preco_custo: parseFloat(formData.preco_custo) || 0,
        estoque: parseInt(formData.estoque, 10) || 0,
        peso: parseFloat(formData.peso) || 0,
      };

      if (isEdit) {
        await updateProduct(product.id, data);
      } else {
        await addProduct(data);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert(error.message || 'Ocorreu um erro ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      setIsSubmitting(true);
      try {
        await deleteProduct(product.id);
        onClose();
      } catch (error) {
        console.error('Erro ao deletar produto:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-[#F8F9FA] rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-[#1A1A1A]">
            {isEdit ? 'Editar Produto' : 'Adicionar Novo Produto'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive ? 'bg-slate-100 text-[#1A1A1A]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#4A5D4E]' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <form id="productForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {/* ABA BÁSICO */}
              {activeTab === 'basico' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Produto *</label>
                    <input type="text" name="nome" required value={formData.nome} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] outline-none" placeholder="Ex: Legging Confort" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                    <SearchableSelect
                      value={formData.categoria}
                      onChange={(categoria) => setFormData((current) => ({ ...current, categoria }))}
                      options={categories.map((category) => ({ value: category.nome, label: category.nome }))}
                      searchPlaceholder="Buscar categoria..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição Rica</label>
                    <textarea name="descricao" rows="4" value={formData.descricao} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] outline-none" placeholder="Detalhes do tecido, caimento..." />
                  </div>
                </div>
              )}

              {/* ABA MÍDIA */}
              {activeTab === 'midia' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Adicionar URL da Imagem</label>
                    <div className="flex gap-2">
                      <input type="url" value={newImage} onChange={e => setNewImage(e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" placeholder="https://exemplo.com/foto.jpg" />
                      <button type="button" onClick={handleAddImage} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium">Adicionar</button>
                    </div>
                  </div>
                  {formData.imagens.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                      {formData.imagens.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                          <img src={url} alt="preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => handleRemoveImage(i)} className="absolute top-2 right-2 bg-white/90 text-rose-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA ESTOQUE E PREÇO */}
              {activeTab === 'estoque' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Este produto está em oferta</p>
                      <p className="mt-0.5 text-xs text-amber-700">Mostra o valor anterior riscado e destaca o preço promocional.</p>
                    </div>
                    <button type="button" role="switch" aria-checked={formData.oferta_ativa} onClick={() => setFormData((current) => ({ ...current, oferta_ativa: !current.oferta_ativa }))} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${formData.oferta_ativa ? 'bg-amber-500' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.oferta_ativa ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.oferta_ativa && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">De: preço original (R$) *</label>
                        <input type="number" name="preco_original" required min="0.01" step="0.01" value={formData.preco_original} onChange={handleChange} className="w-full px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none" placeholder="199,90" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{formData.oferta_ativa ? 'Por: preço promocional (R$) *' : 'Preço de venda (R$) *'}</label>
                      <input type="number" name="preco" required min="0.01" step="0.01" value={formData.preco} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Custo (R$)</label>
                      <input type="number" name="preco_custo" step="0.01" value={formData.preco_custo} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">SKU (Referência)</label>
                      <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" placeholder="EX-1234" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade em Estoque *</label>
                      <input type="number" name="estoque" required step="1" value={formData.estoque} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA VARIANTES */}
              {activeTab === 'variantes' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Tamanhos Disponíveis</label>
                    <div className="flex gap-2">
                      <input type="text" value={newSize} onChange={e => setNewSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddVariant('tamanhos', newSize, setNewSize))} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" placeholder="Ex: P, M, G" />
                      <button type="button" onClick={() => handleAddVariant('tamanhos', newSize, setNewSize)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium">Add</button>
                    </div>
                    {formData.tamanhos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.tamanhos.map((size, i) => (
                          <div key={i} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium border border-slate-200">
                            {size} <button type="button" onClick={() => handleRemoveVariant('tamanhos', i)} className="text-slate-400 hover:text-rose-500"><XCircle className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Cores Disponíveis</label>
                    <div className="flex gap-2">
                      <input type="text" value={newColor} onChange={e => setNewColor(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddVariant('cores', newColor, setNewColor))} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" placeholder="Ex: Preto, Azul" />
                      <button type="button" onClick={() => handleAddVariant('cores', newColor, setNewColor)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium">Add</button>
                    </div>
                    {formData.cores.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.cores.map((color, i) => (
                          <div key={i} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium border border-slate-200">
                            {color} <button type="button" onClick={() => handleRemoveVariant('cores', i)} className="text-slate-400 hover:text-rose-500"><XCircle className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          {isEdit ? (
            <button type="button" onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          ) : <div />}
          
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button form="productForm" type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white rounded-xl font-medium flex items-center gap-2 transition-all active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
