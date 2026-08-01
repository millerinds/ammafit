import { BarChart3, TrendingUp, TrendingDown, Eye, MessageCircle } from 'lucide-react';

export default function MetricsPanel({ metrics }) {
  const cards = [
    {
      title: 'Acessos ao Site',
      value: metrics.totalAcessos,
      icon: <Eye className="w-5 h-5 text-[#4A5D4E]" />,
      description: 'Total de visualizações',
    },
    {
      title: 'Produto Mais Visto',
      value: metrics.produtoMaisVisto?.nome || 'N/A',
      icon: <TrendingUp className="w-5 h-5 text-[#4A5D4E]" />,
      description: `${metrics.produtoMaisVisto?.acessos || 0} acessos`,
    },
    {
      title: 'Produto Menos Visto',
      value: metrics.produtoMenosVisto?.nome || 'N/A',
      icon: <TrendingDown className="w-5 h-5 text-rose-500" />,
      description: `${metrics.produtoMenosVisto?.acessos || 0} acessos`,
    },
    {
      title: 'Cliques no WhatsApp',
      value: metrics.totalCliquesZap || 0,
      icon: <MessageCircle className="w-5 h-5 text-[#4A5D4E]" />,
      description: 'Contatos iniciados',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white border border-slate-200/60 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
            <div className="p-2 bg-slate-50 rounded-lg">{card.icon}</div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1A1A1A] truncate">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
