'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Info, Image as ImageIcon, Tag, Box, XCircle, Loader2, UploadCloud, ChevronLeft, ChevronRight } from 'lucide-react';
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
      imagem_refs: [], tamanhos: [], cores: [], peso: '', dimensoes: { width: '', height: '', length: '' }, slug: '',
      variacoes: []
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
    imagem_refs: product.imagem_refs || (product.imagens || []).map((url) => ({ storage: 'external', url })),
    tamanhos: product.tamanhos || [],
    cores: product.cores || [],
    peso: product.peso || '',
    dimensoes: product.dimensoes || { width: '', height: '', length: '' },
    slug: product.slug || '',
    variacoes: (product.variacoes || []).map((variation) => ({
      id: variation.id,
      tamanho: variation.tamanho,
      estoque_fisico: variation.estoque_fisico,
      reservado: variation.reservado,
      vendido: variation.vendido,
    }))
  };
}

function ProductModalContent({ onClose, product, isEdit, categories }) {
  const [activeTab, setActiveTab] = useState('basico');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(() => getInitialFormData(product, isEdit));
  const [newImage, setNewImage] = useState('');
  const [imageItems, setImageItems] = useState(() => formData.imagem_refs.map((ref, index) => ({ kind: 'existing', ref, preview: product?.imagens?.[index] || ref.url })));
  const [isDragging, setIsDragging] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef(null);
  const imageItemsRef = useRef(imageItems);
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');

  useEffect(() => {
    if (isEdit && product) {
      registerAccess(product.id).catch(console.error);
    }
  }, [isEdit, product]);

  useEffect(() => { imageItemsRef.current = imageItems; }, [imageItems]);
  useEffect(() => () => {
    imageItemsRef.current.forEach((item) => { if (item.kind === 'new') URL.revokeObjectURL(item.preview); });
  }, []);

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
    const url = newImage.trim();
    if (url && imageItems.length < 10 && !imageItems.some((item) => item.preview === url)) {
      setImageItems((items) => [...items, { kind: 'existing', ref: { storage: 'external', url }, preview: url }]);
      setNewImage('');
    }
  };

  const handleRemoveImage = (index) => {
    setImageItems((items) => {
      const removed = items[index];
      if (removed?.kind === 'new') URL.revokeObjectURL(removed.preview);
      return items.filter((_, i) => i !== index);
    });
  };

  const addFiles = (files) => {
    const available = Math.max(0, 10 - imageItems.length);
    const selected = [...files].slice(0, available).map((file) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type);
      return { kind: 'new', file, preview: URL.createObjectURL(file), error: allowed ? '' : 'Formato não permitido.' };
    });
    setImageItems((items) => [...items, ...selected]);
    if (files.length > available) setSaveMessage('O limite é de 10 imagens por produto.');
  };

  const moveImage = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= imageItems.length) return;
    setImageItems((items) => {
      const reordered = [...items];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  };

  const optimizeImage = async (file) => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob) throw new Error(`Não foi possível otimizar ${file.name}.`);
    if (blob.size > 5 * 1024 * 1024) throw new Error(`${file.name} continua maior que 5 MB após a otimização.`);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
  };

  const uploadImage = async (file) => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/admin/product-images', { method: 'POST', body });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Falha ao enviar ${file.name}.`);
    return result;
  };

  const discardUploads = async (keys) => {
    if (!keys.length) return;
    await fetch('/api/admin/product-images', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys }) }).catch(() => {});
  };

  const totalEstoqueFisico = formData.variacoes.reduce((total, variation) => total + (Number(variation.estoque_fisico) || 0), 0);

  const handleAddSize = (value, setter) => {
    const tamanho = String(value || '').trim();
    if (!tamanho) return;

    const exists = formData.variacoes.some((variation) => variation.tamanho.toLocaleLowerCase('pt-BR') === tamanho.toLocaleLowerCase('pt-BR'));
    if (exists) return;

    setFormData((prev) => ({ ...prev, variacoes: [...prev.variacoes, { tamanho, estoque_fisico: 0, reservado: 0 }] }));
    setter('');
  };

  const handleSizeStockChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      variacoes: prev.variacoes.map((variation, i) =>
        i === index ? { ...variation, estoque_fisico: Math.max(0, Math.floor(Number(value) || 0)) } : variation
      ),
    }));
  };

  const handleRemoveSize = (index) => {
    setFormData((prev) => ({ ...prev, variacoes: prev.variacoes.filter((_, i) => i !== index) }));
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
    setSaveMessage('Validando imagens...');
    const uploadedKeys = [];
    try {
      if (imageItems.some((item) => item.error)) throw new Error('Remova os arquivos rejeitados antes de salvar.');
      const imageRefs = [];
      for (let index = 0; index < imageItems.length; index += 1) {
        const item = imageItems[index];
        if (item.kind === 'existing') {
          imageRefs.push(item.ref);
          continue;
        }
        setSaveMessage(`Otimizando e enviando imagem ${index + 1} de ${imageItems.length}...`);
        let result;
        try {
          result = await uploadImage(await optimizeImage(item.file));
        } catch (error) {
          setImageItems((items) => items.map((candidate) => candidate === item ? { ...candidate, error: error.message || 'Falha ao processar esta imagem.' } : candidate));
          throw error;
        }
        imageRefs.push(result.reference);
        uploadedKeys.push(result.reference.key);
      }
      setSaveMessage('Salvando produto...');
      const data = {
        ...formData,
        imagem_refs: imageRefs,
        preco: parseFloat(formData.preco) || 0,
        preco_original: formData.oferta_ativa ? parseFloat(formData.preco_original) || 0 : null,
        oferta_ativa: Boolean(formData.oferta_ativa),
        preco_custo: parseFloat(formData.preco_custo) || 0,
        // produtos.estoque continua sendo o total; quem manda agora são as variações.
        estoque: totalEstoqueFisico,
        variacoes: formData.variacoes.map((variation) => ({
          tamanho: variation.tamanho,
          estoque_fisico: Math.max(0, Math.floor(Number(variation.estoque_fisico) || 0)),
        })),
        tamanhos: formData.variacoes.map((variation) => variation.tamanho),
        peso: parseFloat(formData.peso) || 0,
      };

      if (isEdit) {
        await updateProduct(product.id, data);
      } else {
        await addProduct(data);
      }
      onClose();
    } catch (error) {
      await discardUploads(uploadedKeys);
      console.error('Erro ao salvar produto:', error);
      alert(error.message || 'Ocorreu um erro ao salvar o produto.');
      setSaveMessage(error.message || 'Ocorreu um erro ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este produto? As imagens armazenadas deste produto também serão apagadas.')) {
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
                  <div
                    onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }}
                    className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${isDragging ? 'border-[#4A5D4E] bg-emerald-50' : 'border-slate-300 bg-slate-50'}`}
                  >
                    <UploadCloud className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">Arraste fotos aqui ou selecione no aparelho</p>
                    <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP ou AVIF · até 10 imagens</p>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={imageItems.length >= 10} className="mt-3 rounded-xl bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Selecionar imagens</button>
                  </div>
                  <details className="rounded-xl border border-slate-200 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600">Adicionar por URL externa</summary>
                    <div className="flex gap-2">
                      <input type="url" value={newImage} onChange={e => setNewImage(e.target.value)} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" placeholder="https://exemplo.com/foto.jpg" />
                      <button type="button" onClick={handleAddImage} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium">Adicionar</button>
                    </div>
                  </details>
                  {imageItems.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                      {imageItems.map((item, i) => (
                        <div key={`${item.preview}-${i}`} className={`relative aspect-square rounded-xl overflow-hidden border group ${item.error ? 'border-rose-400' : 'border-slate-200'}`}>
                          <img src={item.preview} alt={`Imagem ${i + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700 shadow">{i === 0 ? 'CAPA' : i + 1}</span>
                          <button type="button" aria-label={`Remover imagem ${i + 1}`} onClick={() => handleRemoveImage(i)} className="absolute top-2 right-2 bg-white/90 text-rose-500 p-1.5 rounded-full shadow-sm hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            <button type="button" aria-label="Mover imagem para trás" disabled={i === 0} onClick={() => moveImage(i, -1)} className="rounded-full bg-white/90 p-1.5 text-slate-700 shadow disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                            <button type="button" aria-label="Mover imagem para frente" disabled={i === imageItems.length - 1} onClick={() => moveImage(i, 1)} className="rounded-full bg-white/90 p-1.5 text-slate-700 shadow disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                          </div>
                          {item.error && <p className="absolute inset-x-0 bottom-0 bg-rose-600/90 p-1 text-center text-[10px] text-white">{item.error}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">{imageItems.length}/10 imagens. A primeira será usada como capa.</p>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Estoque total</label>
                      <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-semibold text-slate-600">
                        {totalEstoqueFisico} {totalEstoqueFisico === 1 ? 'peça' : 'peças'}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Some as quantidades na aba <strong>Variantes</strong>, por tamanho.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA VARIANTES */}
              {activeTab === 'variantes' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Tamanhos e estoque</label>
                      <p className="mt-1 text-xs text-slate-500">Cada tamanho tem a própria quantidade. Um produto, várias grades.</p>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newSize} onChange={e => setNewSize(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSize(newSize, setNewSize))} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] outline-none" placeholder="Ex: P, M, G, 38" />
                      <button type="button" onClick={() => handleAddSize(newSize, setNewSize)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium">Add</button>
                    </div>

                    {formData.variacoes.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                        Nenhum tamanho cadastrado. Sem tamanhos, o produto fica com a grade &quot;Único&quot;.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                        {formData.variacoes.map((variation, i) => {
                          const reservado = Number(variation.reservado) || 0;
                          const disponivel = Math.max(0, (Number(variation.estoque_fisico) || 0) - reservado);

                          return (
                            <div key={variation.id ?? `novo-${i}`} className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap">
                              <span className="min-w-14 rounded-lg bg-slate-100 px-3 py-1.5 text-center text-sm font-bold text-slate-700">{variation.tamanho}</span>

                              <label className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="whitespace-nowrap">Estoque físico</span>
                                <input
                                  type="number"
                                  min={reservado}
                                  step="1"
                                  value={variation.estoque_fisico}
                                  onChange={(event) => handleSizeStockChange(i, event.target.value)}
                                  className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                                />
                              </label>

                              <div className="flex flex-1 flex-wrap items-center gap-2 text-[11px] font-medium">
                                {reservado > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{reservado} em condicional</span>}
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">{disponivel} disponível(is)</span>
                                {Number(variation.vendido) > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{variation.vendido} vendida(s)</span>}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveSize(i)}
                                disabled={reservado > 0}
                                title={reservado > 0 ? 'Há peças em condicional neste tamanho' : 'Remover tamanho'}
                                className="text-slate-400 transition-colors hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
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
              {isSubmitting ? (saveMessage || 'Salvando...') : 'Salvar Produto'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
