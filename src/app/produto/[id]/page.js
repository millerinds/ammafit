import { getProductById, getConfig, getCategories, getRecommendedProducts } from '@/app/actions';
import StoreProductDetail from '@/components/store/StoreProductDetail';
import StoreNavbar from '@/components/store/StoreNavbar';
import StoreRecommendations from '@/components/store/StoreRecommendations';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  // O params.id pode vir como Promise em Next 15+ ou objeto direto dependendo da versão.
  const resolvedParams = await params;
  const productId = parseInt(resolvedParams.id, 10);
  
  if (isNaN(productId)) {
    return <div className="text-center py-20">Produto não encontrado.</div>;
  }

  const [product, config, categories, recommendedProducts] = await Promise.all([
    getProductById(productId),
    getConfig(),
    getCategories(),
    getRecommendedProducts(productId, 10),
  ]);

  if (!product) {
    return (
      <div style={{ backgroundColor: config.cor_fundo, color: config.cor_secundaria }} className="min-h-screen flex flex-col">
        <StoreNavbar config={config} categories={categories} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl text-slate-500">Produto não encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: config.cor_fundo, color: config.cor_secundaria }} className="min-h-screen flex flex-col font-sans" suppressHydrationWarning>
      <StoreNavbar config={config} categories={categories} />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 w-full">
        <StoreProductDetail product={product} config={config} />
        <StoreRecommendations products={recommendedProducts} primaryColor={config.cor_primaria} />
      </main>
      <footer className="bg-white border-t border-slate-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} Amma Fit. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
