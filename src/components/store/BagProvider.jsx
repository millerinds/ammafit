'use client';

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';

const BagContext = createContext(null);
// Chave nova: a sacola guarda a variação de tamanho, formato diferente do
// carrinho antigo. Sacolas velhas do navegador são simplesmente ignoradas.
const STORAGE_KEY = 'ammafit-sacola-provar';
const EMPTY_BAG = [];
const listeners = new Set();

function readStoredBag() {
  if (typeof window === 'undefined') return EMPTY_BAG;

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return EMPTY_BAG;

    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return EMPTY_BAG;

    return parsedValue.filter((item) => Number.isInteger(Number(item?.variacaoId)));
  } catch {
    return EMPTY_BAG;
  }
}

let bagItems = readStoredBag();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function saveItems(nextItems) {
  bagItems = nextItems;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  } catch {
    // Mantém a sacola em memória caso o navegador bloqueie o armazenamento.
  }

  notifyListeners();
}

function subscribe(listener) {
  listeners.add(listener);

  function handleStorage(event) {
    if (event.key === STORAGE_KEY) {
      bagItems = readStoredBag();
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
  return bagItems;
}

function getServerSnapshot() {
  return EMPTY_BAG;
}

export function BagProvider({ children }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // A variação já identifica produto + tamanho, então serve de chave da sacola.
  function addItem(product, variation, quantity = 1) {
    if (!variation?.id) return;

    const key = String(variation.id);
    const limit = Math.max(1, Number(variation.disponivel) || 1);
    const desired = Math.max(1, Math.floor(Number(quantity) || 1));
    const existingItem = bagItems.find((item) => item.key === key);

    if (existingItem) {
      saveItems(bagItems.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.min(limit, item.quantity + desired), disponivel: limit }
          : item
      ));
      return;
    }

    saveItems([
      ...bagItems,
      {
        key,
        variacaoId: variation.id,
        productId: product.id,
        name: product.nome,
        code: product.sku || product.nome,
        price: Number(product.preco) || 0,
        image: product.imagens?.[0] || product.imagem_url || '',
        size: variation.tamanho || '',
        disponivel: limit,
        quantity: Math.min(limit, desired),
      },
    ]);
  }

  function updateQuantity(key, quantity) {
    if (quantity < 1) {
      saveItems(bagItems.filter((item) => item.key !== key));
      return;
    }

    saveItems(bagItems.map((item) => {
      if (item.key !== key) return item;
      const limit = Math.max(1, Number(item.disponivel) || 1);
      return { ...item, quantity: Math.min(limit, quantity) };
    }));
  }

  function removeItem(key) {
    saveItems(bagItems.filter((item) => item.key !== key));
  }

  function removeByVariation(variacaoIds) {
    const blocked = new Set(variacaoIds.map(Number));
    saveItems(bagItems.filter((item) => !blocked.has(Number(item.variacaoId))));
  }

  function clear() {
    saveItems([]);
  }

  function hasVariation(variacaoId) {
    return bagItems.some((item) => Number(item.variacaoId) === Number(variacaoId));
  }

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const value = useMemo(
    () => ({ items, itemCount, total, addItem, updateQuantity, removeItem, removeByVariation, clear, hasVariation }),
    [items, itemCount, total]
  );

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag() {
  const context = useContext(BagContext);

  if (!context) {
    throw new Error('useBag deve ser usado dentro de BagProvider');
  }

  return context;
}
