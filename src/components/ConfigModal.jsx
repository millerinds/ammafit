'use client';

import { useState } from 'react';
import { X, Save, Settings, Loader2 } from 'lucide-react';
import { saveConfig } from '@/app/actions';

export default function ConfigModal({ isOpen, onClose, initialConfig }) {
  if (!isOpen) return null;

  return (
    <ConfigModalContent
      key={`${initialConfig?.whatsapp_numero || ''}:${initialConfig?.whatsapp_mensagem || ''}`}
      onClose={onClose}
      initialConfig={initialConfig}
    />
  );
}

function ConfigModalContent({ onClose, initialConfig }) {
  const [formData, setFormData] = useState(() => ({
    whatsapp_numero: initialConfig?.whatsapp_numero || '',
    whatsapp_mensagem: initialConfig?.whatsapp_mensagem || 'Olá, vim pelo catálogo e gostaria de mais informações'
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveConfig(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar config:', error);
      alert('Erro ao salvar as configurações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#1A1A1A]" />
            <h2 className="text-xl font-bold text-[#1A1A1A]">Configurações da Loja</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Número do WhatsApp (com DDI e DDD)
              </label>
              <input
                type="text"
                name="whatsapp_numero"
                value={formData.whatsapp_numero}
                onChange={handleChange}
                placeholder="Ex: 5511999999999"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] outline-none transition-all"
              />
              <p className="text-xs text-slate-500 mt-1">Apenas números. Ex: 55 para Brasil + DDD + Número.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mensagem Padrão de Saudação
              </label>
              <textarea
                name="whatsapp_mensagem"
                rows="3"
                value={formData.whatsapp_mensagem}
                onChange={handleChange}
                placeholder="Ex: Olá, vim pelo catálogo..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] outline-none transition-all"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white rounded-xl font-medium flex items-center gap-2 transition-all active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
