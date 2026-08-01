import ProductCard from './ProductCard';
import AddProductCard from './AddProductCard';

export default function ProductGrid({ products, config, onAddProduct, onEditProduct }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      <AddProductCard onAdd={onAddProduct} />
      {products.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          config={config}
          onEdit={onEditProduct} 
        />
      ))}
    </div>
  );
}
