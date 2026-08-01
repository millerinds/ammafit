'use client';

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'ammafit-cart';
const EMPTY_CART = [];
const listeners = new Set();

function readStoredCart() {
  if (typeof window === 'undefined') return EMPTY_CART;

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return EMPTY_CART;

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

let cartItems = readStoredCart();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function saveItems(nextItems) {
  cartItems = nextItems;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  } catch {
    // Mantém o carrinho em memória caso o navegador bloqueie o armazenamento.
  }

  notifyListeners();
}

function subscribe(listener) {
  listeners.add(listener);

  function handleStorage(event) {
    if (event.key === STORAGE_KEY) {
      cartItems = readStoredCart();
      notifyListeners();
    }
  }

  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function getSnapshot() {
  return cartItems;
}

function getServerSnapshot() {
  return EMPTY_CART;
}

function getItemKey(productId, color, size) {
  return `${productId}:${color || '-'}:${size || '-'}`;
}

export function CartProvider({ children }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function addItem(product, color, size, quantity = 1) {
    const key = getItemKey(product.id, color, size);
    const existingItem = cartItems.find((item) => item.key === key);
    const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));

    if (existingItem) {
      saveItems(cartItems.map((item) =>
        item.key === key ? { ...item, quantity: item.quantity + safeQuantity } : item
      ));
      return;
    }

    saveItems([
      ...cartItems,
      {
        key,
        productId: product.id,
        name: product.nome,
        code: product.sku || product.nome,
        price: Number(product.preco) || 0,
        image: product.imagens?.[0] || product.imagem_url || '',
        color: color || '',
        size: size || '',
        quantity: safeQuantity,
      },
    ]);
  }

  function updateQuantity(key, quantity) {
    if (quantity < 1) {
      saveItems(cartItems.filter((item) => item.key !== key));
      return;
    }

    saveItems(cartItems.map((item) => item.key === key ? { ...item, quantity } : item));
  }

  function removeItem(key) {
    saveItems(cartItems.filter((item) => item.key !== key));
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const value = useMemo(
    () => ({ items, itemCount, total, addItem, updateQuantity, removeItem }),
    [items, itemCount, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart deve ser usado dentro de CartProvider');
  }

  return context;
}
