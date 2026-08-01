import StoreProductCard from './StoreProductCard';

export default function StoreRecommendations({ products, primaryColor }) {
  if (!products?.length) return null;

  return (
    <section className="mt-20 border-t border-slate-200 pt-12 md:mt-28 md:pt-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p style={{ color: primaryColor }} className="text-xs font-bold uppercase tracking-[0.2em]">Continue descobrindo</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Você também pode gostar</h2>
        </div>
        <span className="hidden text-sm text-slate-400 sm:block">Selecionados para combinar com esta peça</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-5">
        {products.map((product) => <StoreProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
