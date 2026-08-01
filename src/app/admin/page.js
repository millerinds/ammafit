import DashboardClient from '../DashboardClient';
import { getProducts, getMetrics, getConfig, getCategories } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const products = await getProducts();
  const metrics = await getMetrics();
  const config = await getConfig();
  const categories = await getCategories();

  return <DashboardClient products={products} metrics={metrics} config={config} categories={categories} />;
}
