import { Plus } from 'lucide-react';

export default function AddProductCard({ onAdd }) {
  return (
    <div 
      onClick={onAdd}
      className="group bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center min-h-[300px] cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
    >
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 mb-4">
        <Plus className="w-8 h-8 text-slate-400 group-hover:text-[#1A1A1A] transition-colors" />
      </div>
      <h3 className="text-lg font-semibold text-slate-500 group-hover:text-[#1A1A1A] transition-colors">
        Adicionar Novo Produto
      </h3>
    </div>
  );
}
