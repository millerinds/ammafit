import StoreClient from './StoreClient';
import { getProducts, getConfig, getCategories } from './actions';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const products = await getProducts();
  const config = await getConfig();
  const categories = await getCategories();
  const resolvedSearchParams = await searchParams;
  const initialCategory = resolvedSearchParams?.categoria || 'Todos';

  return <StoreClient products={products} config={config} categories={categories} initialCategory={initialCategory} />;
}
