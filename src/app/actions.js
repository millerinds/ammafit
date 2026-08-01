'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

function deserializeProduct(product) {
  if (!product) return null;
  return {
    ...product,
    imagens: product.imagens ? JSON.parse(product.imagens) : [],
    tamanhos: product.tamanhos ? JSON.parse(product.tamanhos) : [],
    cores: product.cores ? JSON.parse(product.cores) : [],
    dimensoes: product.dimensoes ? JSON.parse(product.dimensoes) : { width: '', height: '', length: '' },
  };
}

function validateOffer(price, originalPrice, active) {
  if (active && (!(Number(originalPrice) > 0) || Number(originalPrice) <= Number(price))) {
    throw new Error('Em uma oferta, o preço original deve ser maior que o preço promocional.');
  }
}

export async function getProducts() {
  const stmt = db.prepare('SELECT * FROM produtos ORDER BY id DESC');
  const products = stmt.all();
  return products.map(deserializeProduct);
}

export async function getProductById(id) {
  const stmt = db.prepare('SELECT * FROM produtos WHERE id = ?');
  const p = stmt.get(id);
  if (!p) return null;
  
  return deserializeProduct(p);
}

export async function getRecommendedProducts(productId, limit = 10) {
  const target = deserializeProduct(db.prepare('SELECT * FROM produtos WHERE id = ?').get(productId));
  if (!target) return [];

  const normalize = (value) => String(value || '').trim().toLocaleLowerCase('pt-BR');
  const targetColors = new Set(target.cores.map(normalize));
  const targetSizes = new Set(target.tamanhos.map(normalize));
  const priceRange = Math.max(Number(target.preco) * 0.1, 10);

  return db.prepare('SELECT * FROM produtos WHERE id != ?').all(productId)
    .map(deserializeProduct)
    .map((product) => ({
      product,
      category: normalize(product.categoria) === normalize(target.categoria) ? 1 : 0,
      colors: product.cores.filter((color) => targetColors.has(normalize(color))).length,
      sizes: product.tamanhos.filter((size) => targetSizes.has(normalize(size))).length,
      priceBand: Math.floor(Math.abs(Number(product.preco) - Number(target.preco)) / priceRange),
      random: Math.random(),
    }))
    .sort((a, b) =>
      b.category - a.category ||
      b.colors - a.colors ||
      b.sizes - a.sizes ||
      a.priceBand - b.priceBand ||
      a.random - b.random
    )
    .slice(0, Math.min(10, Math.max(1, limit)))
    .map(({ product }) => product);
}

export async function addProduct(data) {
  const { nome, descricao, categoria, preco, preco_original, oferta_ativa, preco_custo, sku, estoque, imagens, tamanhos, cores, peso, dimensoes, slug, texto_whatsapp } = data;
  validateOffer(preco, preco_original, oferta_ativa);
  
  // Validar SKU único
  if (sku) {
    const existing = db.prepare('SELECT id FROM produtos WHERE sku = ?').get(sku);
    if (existing) {
      throw new Error(`O código (SKU) "${sku}" já está em uso por outro produto. Use um código único.`);
    }
  }
  
  const stmt = db.prepare(`
    INSERT INTO produtos (nome, descricao, categoria, preco, preco_original, oferta_ativa, preco_custo, sku, estoque, imagens, tamanhos, cores, peso, dimensoes, slug, texto_whatsapp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(nome, descricao, categoria, preco, preco_original, oferta_ativa ? 1 : 0, preco_custo, sku, estoque, JSON.stringify(imagens || []), JSON.stringify(tamanhos || []), JSON.stringify(cores || []), peso, JSON.stringify(dimensoes || {}), slug, texto_whatsapp);
  revalidatePath('/');
}

export async function updateProduct(id, data) {
  const { nome, descricao, categoria, preco, preco_original, oferta_ativa, preco_custo, sku, estoque, imagens, tamanhos, cores, peso, dimensoes, slug, texto_whatsapp } = data;
  validateOffer(preco, preco_original, oferta_ativa);
  
  // Validar SKU único (excluindo o próprio produto)
  if (sku) {
    const existing = db.prepare('SELECT id FROM produtos WHERE sku = ? AND id != ?').get(sku, id);
    if (existing) {
      throw new Error(`O código (SKU) "${sku}" já está em uso por outro produto. Use um código único.`);
    }
  }
  
  const stmt = db.prepare(`
    UPDATE produtos
    SET nome = ?, descricao = ?, categoria = ?, preco = ?, preco_original = ?, oferta_ativa = ?, preco_custo = ?, sku = ?, estoque = ?, imagens = ?, tamanhos = ?, cores = ?, peso = ?, dimensoes = ?, slug = ?, texto_whatsapp = ?
    WHERE id = ?
  `);
  stmt.run(nome, descricao, categoria, preco, preco_original, oferta_ativa ? 1 : 0, preco_custo, sku, estoque, JSON.stringify(imagens || []), JSON.stringify(tamanhos || []), JSON.stringify(cores || []), peso, JSON.stringify(dimensoes || {}), slug, texto_whatsapp, id);
  revalidatePath('/');
}

export async function deleteProduct(id) {
  const stmt = db.prepare('DELETE FROM produtos WHERE id = ?');
  stmt.run(id);
  revalidatePath('/');
}

export async function registerAccess(produtoId) {
  // Incrementar acessos na tabela produtos
  const updateStmt = db.prepare('UPDATE produtos SET acessos = acessos + 1 WHERE id = ?');
  updateStmt.run(produtoId);

  // Inserir log de acesso
  const logStmt = db.prepare('INSERT INTO logs_de_acesso (produto_id) VALUES (?)');
  logStmt.run(produtoId);
  
  // Revalidar para que os cards mostrem a métrica atualizada
  revalidatePath('/');
}

export async function getMetrics() {
  const totalAcessos = db.prepare('SELECT SUM(acessos) as total FROM produtos').get().total || 0;
  const totalCliquesZap = db.prepare('SELECT SUM(cliques_whatsapp) as total FROM produtos').get().total || 0;
  
  const produtoMaisVisto = db.prepare(`
    SELECT nome, acessos FROM produtos ORDER BY acessos DESC LIMIT 1
  `).get();

  const produtoMenosVisto = db.prepare(`
    SELECT nome, acessos FROM produtos ORDER BY acessos ASC LIMIT 1
  `).get();

  return {
    totalAcessos,
    totalCliquesZap,
    produtoMaisVisto: produtoMaisVisto || { nome: 'N/A', acessos: 0 },
    produtoMenosVisto: produtoMenosVisto || { nome: 'N/A', acessos: 0 },
  };
}

export async function getConfig() {
  const config = db.prepare('SELECT * FROM configuracoes WHERE id = 1').get();
  if (!config) return { whatsapp_numero: '', whatsapp_mensagem: '', banners: [] };

  return {
    ...config,
    logo_url: config.logo_url || '',
    cor_primaria: config.cor_primaria || '#4A5D4E',
    cor_secundaria: config.cor_secundaria || '#1A1A1A',
    cor_fundo: config.cor_fundo || '#F8F9FA',
    banners: config.banners ? JSON.parse(config.banners) : [],
    categorias_menu: config.categorias_menu ? JSON.parse(config.categorias_menu) : [],
    logo_largura_desktop: Number(config.logo_largura_desktop) || 160,
    logo_largura_mobile: Number(config.logo_largura_mobile) || 120,
  };
}

export async function getCategories() {
  return db.prepare('SELECT id, nome FROM categorias ORDER BY nome COLLATE NOCASE').all();
}

export async function addCategory(name) {
  const normalizedName = String(name || '').trim();
  if (normalizedName.length < 2) throw new Error('Informe um nome com pelo menos 2 caracteres.');
  if (normalizedName.length > 40) throw new Error('O nome deve ter no máximo 40 caracteres.');

  try {
    db.prepare('INSERT INTO categorias (nome) VALUES (?)').run(normalizedName);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new Error('Essa categoria já existe.');
    throw error;
  }
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function deleteCategory(id) {
  const category = db.prepare('SELECT nome FROM categorias WHERE id = ?').get(id);
  if (!category) return;

  const productsInUse = db.prepare('SELECT COUNT(*) AS total FROM produtos WHERE categoria = ? COLLATE NOCASE').get(category.nome).total;
  if (productsInUse > 0) throw new Error(`A categoria está sendo usada por ${productsInUse} produto(s). Altere esses produtos antes de excluí-la.`);

  db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function saveConfig(data) {
  const { whatsapp_numero, whatsapp_mensagem } = data;
  const stmt = db.prepare(`
    UPDATE configuracoes 
    SET whatsapp_numero = ?, whatsapp_mensagem = ? 
    WHERE id = 1
  `);
  stmt.run(whatsapp_numero, whatsapp_mensagem);
  revalidatePath('/');
}

export async function saveLayoutConfig(data) {
  const logoUrl = String(data.logo_url || '').trim();
  const primaryColor = /^#[0-9a-f]{6}$/i.test(data.cor_primaria) ? data.cor_primaria : '#4A5D4E';
  const secondaryColor = /^#[0-9a-f]{6}$/i.test(data.cor_secundaria) ? data.cor_secundaria : '#1A1A1A';
  const backgroundColor = /^#[0-9a-f]{6}$/i.test(data.cor_fundo) ? data.cor_fundo : '#F8F9FA';
  const banners = Array.isArray(data.banners) ? data.banners : [];
  const menuCategories = Array.isArray(data.categorias_menu) ? data.categorias_menu.slice(0, 5) : [];
  const desktopLogoWidth = Math.min(240, Math.max(80, Number(data.logo_largura_desktop) || 160));
  const mobileLogoWidth = Math.min(180, Math.max(60, Number(data.logo_largura_mobile) || 120));

  db.prepare(`
    UPDATE configuracoes
    SET logo_url = ?, cor_primaria = ?, cor_secundaria = ?, cor_fundo = ?, banners = ?,
        categorias_menu = ?, logo_largura_desktop = ?, logo_largura_mobile = ?
    WHERE id = 1
  `).run(logoUrl, primaryColor, secondaryColor, backgroundColor, JSON.stringify(banners), JSON.stringify(menuCategories), desktopLogoWidth, mobileLogoWidth);

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function registerWhatsappClick(produtoId) {
  const stmt = db.prepare('UPDATE produtos SET cliques_whatsapp = cliques_whatsapp + 1 WHERE id = ?');
  stmt.run(produtoId);
  // NÃO chamar revalidatePath aqui — isso recarrega a página e cancela o window.open
}
