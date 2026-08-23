'use server';

import { all, first, run } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { extractManagedImageKeys, imageReferencesToUrls, parseImageReferences, serializeImageReferences } from '@/lib/product-image-refs';
import { assertPendingAssets, attachAssets, queueAndDeleteAssets } from '@/lib/product-images';
import { getVariationsForProducts, saveProductVariations, TAMANHO_UNICO } from '@/lib/estoque';

function deserializeProduct(product) {
  if (!product) return null;
  const imageReferences = parseImageReferences(product.imagens);
  return {
    ...product,
    imagens: imageReferencesToUrls(imageReferences, process.env.R2_PUBLIC_BASE_URL),
    imagem_refs: imageReferences,
    tamanhos: product.tamanhos ? JSON.parse(product.tamanhos) : [],
    cores: product.cores ? JSON.parse(product.cores) : [],
    dimensoes: product.dimensoes ? JSON.parse(product.dimensoes) : { width: '', height: '', length: '' },
  };
}

// Junta o produto às suas variações de tamanho já com a disponibilidade calculada.
function withVariations(product, variations) {
  const variacoes = variations || [];
  const estoqueFisicoTotal = variacoes.reduce((total, v) => total + v.estoque_fisico, 0);
  const reservadoTotal = variacoes.reduce((total, v) => total + v.reservado, 0);
  const disponivelTotal = variacoes.reduce((total, v) => total + v.disponivel, 0);

  return {
    ...product,
    variacoes,
    estoque_fisico_total: estoqueFisicoTotal,
    reservado_total: reservadoTotal,
    disponivel_total: disponivelTotal,
    // Sem disponibilidade mas com peça fora para prova não é "esgotado":
    // a vitrine mostra "Em condicional" (item 6 do pedido).
    em_condicional: disponivelTotal === 0 && reservadoTotal > 0,
  };
}

async function attachVariations(products) {
  const grouped = await getVariationsForProducts(products.map((product) => product.id));
  return products.map((product) => withVariations(product, grouped.get(product.id)));
}

// A grade de tamanhos passa a ser derivada das variações, mantendo produtos.tamanhos
// preenchido para a busca da loja e para as recomendações continuarem funcionando.
function sizesFromVariations(variacoes, fallback) {
  const names = (Array.isArray(variacoes) ? variacoes : [])
    .map((variation) => String(variation?.tamanho ?? '').trim())
    .filter((tamanho) => tamanho && tamanho !== TAMANHO_UNICO);

  return names.length > 0 ? names : (Array.isArray(fallback) ? fallback : []);
}

// O D1 lança erro ao receber undefined em bind(). Campos opcionais que o
// formulário não preenche precisam virar null antes de chegar na query.
function orNull(value) {
  return value === undefined ? null : value;
}

function validateOffer(price, originalPrice, active) {
  if (active && (!(Number(originalPrice) > 0) || Number(originalPrice) <= Number(price))) {
    throw new Error('Em uma oferta, o preço original deve ser maior que o preço promocional.');
  }
}

export async function getProducts() {
  const products = await all('SELECT * FROM produtos ORDER BY id DESC');
  return attachVariations(products.map(deserializeProduct));
}

export async function getProductById(id) {
  const p = await first('SELECT * FROM produtos WHERE id = ?', id);
  if (!p) return null;

  return (await attachVariations([deserializeProduct(p)]))[0];
}

export async function getRecommendedProducts(productId, limit = 10) {
  const target = deserializeProduct(await first('SELECT * FROM produtos WHERE id = ?', productId));
  if (!target) return [];

  const normalize = (value) => String(value || '').trim().toLocaleLowerCase('pt-BR');
  const targetColors = new Set(target.cores.map(normalize));
  const targetSizes = new Set(target.tamanhos.map(normalize));
  const priceRange = Math.max(Number(target.preco) * 0.1, 10);

  const scored = (await all('SELECT * FROM produtos WHERE id != ?', productId))
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
    .slice(0, Math.min(10, Math.max(1, limit)));

  return attachVariations(scored.map(({ product }) => product));
}

export async function addProduct(data) {
  await requireAdmin();
  const { nome, descricao, categoria, preco, preco_original, oferta_ativa, preco_custo, sku, estoque, imagem_refs, tamanhos, cores, peso, dimensoes, slug, texto_whatsapp, variacoes } = data;
  const sizes = sizesFromVariations(variacoes, tamanhos);
  const imageReferences = parseImageReferences(imagem_refs);
  await assertPendingAssets(extractManagedImageKeys(imageReferences));
  validateOffer(preco, preco_original, oferta_ativa);
  
  // Validar SKU único
  if (sku) {
    const existing = await first('SELECT id FROM produtos WHERE sku = ?', sku);
    if (existing) {
      throw new Error(`O código (SKU) "${sku}" já está em uso por outro produto. Use um código único.`);
    }
  }
  
  const result = await run(`
    INSERT INTO produtos (nome, descricao, categoria, preco, preco_original, oferta_ativa, preco_custo, sku, estoque, imagens, tamanhos, cores, peso, dimensoes, slug, texto_whatsapp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, nome, orNull(descricao), orNull(categoria), preco, orNull(preco_original), oferta_ativa ? 1 : 0, orNull(preco_custo), orNull(sku), estoque, serializeImageReferences(imageReferences), JSON.stringify(sizes), JSON.stringify(cores || []), orNull(peso), JSON.stringify(dimensoes || {}), orNull(slug), orNull(texto_whatsapp));
  const productId = result.meta?.last_row_id;
  // Grava a grade de tamanhos e realinha produtos.estoque com a soma das variações.
  if (productId) await saveProductVariations(productId, variacoes);
  if (productId) await attachAssets(extractManagedImageKeys(imageReferences), productId)
    .catch((error) => console.error('Falha ao associar mídia; a limpeza posterior tentará novamente:', error));
  revalidatePath('/');
  revalidatePath('/admin');
  return productId;
}

export async function updateProduct(id, data) {
  await requireAdmin();
  const { nome, descricao, categoria, preco, preco_original, oferta_ativa, preco_custo, sku, estoque, imagem_refs, tamanhos, cores, peso, dimensoes, slug, texto_whatsapp, variacoes } = data;
  const sizes = sizesFromVariations(variacoes, tamanhos);
  const currentProduct = await first('SELECT imagens FROM produtos WHERE id = ?', id);
  if (!currentProduct) throw new Error('Produto não encontrado.');
  const previousKeys = extractManagedImageKeys(currentProduct.imagens);
  const imageReferences = parseImageReferences(imagem_refs);
  const nextKeys = extractManagedImageKeys(imageReferences);
  await assertPendingAssets(nextKeys.filter((key) => !previousKeys.includes(key)));
  validateOffer(preco, preco_original, oferta_ativa);
  
  // Validar SKU único (excluindo o próprio produto)
  if (sku) {
    const existing = await first('SELECT id FROM produtos WHERE sku = ? AND id != ?', sku, id);
    if (existing) {
      throw new Error(`O código (SKU) "${sku}" já está em uso por outro produto. Use um código único.`);
    }
  }
  
  await run(`
    UPDATE produtos
    SET nome = ?, descricao = ?, categoria = ?, preco = ?, preco_original = ?, oferta_ativa = ?, preco_custo = ?, sku = ?, estoque = ?, imagens = ?, tamanhos = ?, cores = ?, peso = ?, dimensoes = ?, slug = ?, texto_whatsapp = ?
    WHERE id = ?
  `, nome, orNull(descricao), orNull(categoria), preco, orNull(preco_original), oferta_ativa ? 1 : 0, orNull(preco_custo), orNull(sku), estoque, serializeImageReferences(imageReferences), JSON.stringify(sizes), JSON.stringify(cores || []), orNull(peso), JSON.stringify(dimensoes || {}), orNull(slug), orNull(texto_whatsapp), id);
  await saveProductVariations(id, variacoes);
  await attachAssets(nextKeys.filter((key) => !previousKeys.includes(key)), id)
    .catch((error) => console.error('Falha ao associar mídia; a limpeza posterior tentará novamente:', error));
  await queueAndDeleteAssets(previousKeys.filter((key) => !nextKeys.includes(key)), id)
    .catch((error) => console.error('Falha ao limpar mídia removida; a fila tentará novamente:', error));
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath(`/produto/${id}`);
}

export async function deleteProduct(id) {
  await requireAdmin();
  const product = await first('SELECT imagens FROM produtos WHERE id = ?', id);
  if (!product) return;
  const keys = extractManagedImageKeys(product.imagens);
  await run('DELETE FROM produtos WHERE id = ?', id);
  await queueAndDeleteAssets(keys, id)
    .catch((error) => console.error('Falha ao limpar mídia do produto; a fila tentará novamente:', error));
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath(`/produto/${id}`);
}

export async function registerAccess(produtoId) {
  // Incrementar acessos na tabela produtos
  await run('UPDATE produtos SET acessos = acessos + 1 WHERE id = ?', produtoId);
  await run('INSERT INTO logs_de_acesso (produto_id) VALUES (?)', produtoId);
  
  // Revalidar para que os cards mostrem a métrica atualizada
  revalidatePath('/');
}

export async function getMetrics() {
  await requireAdmin();
  const totalAcessos = (await first('SELECT SUM(acessos) as total FROM produtos'))?.total || 0;
  const totalCliquesZap = (await first('SELECT SUM(cliques_whatsapp) as total FROM produtos'))?.total || 0;
  
  const produtoMaisVisto = await first(`
    SELECT nome, acessos FROM produtos ORDER BY acessos DESC LIMIT 1
  `);

  const produtoMenosVisto = await first(`
    SELECT nome, acessos FROM produtos ORDER BY acessos ASC LIMIT 1
  `);

  return {
    totalAcessos,
    totalCliquesZap,
    produtoMaisVisto: produtoMaisVisto || { nome: 'N/A', acessos: 0 },
    produtoMenosVisto: produtoMenosVisto || { nome: 'N/A', acessos: 0 },
  };
}

export async function getConfig() {
  const config = await first('SELECT * FROM configuracoes WHERE id = 1');
  if (!config) return { whatsapp_numero: '', whatsapp_mensagem: '', banners: [] };

  return {
    ...config,
    logo_url: config.logo_url || '',
    logo_object_key: config.logo_object_key || '',
    cabecalho_texto: config.cabecalho_texto || 'AMMA FIT',
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
  return all('SELECT id, nome FROM categorias ORDER BY nome COLLATE NOCASE');
}

export async function addCategory(name) {
  await requireAdmin();
  const normalizedName = String(name || '').trim();
  if (normalizedName.length < 2) throw new Error('Informe um nome com pelo menos 2 caracteres.');
  if (normalizedName.length > 40) throw new Error('O nome deve ter no máximo 40 caracteres.');

  try {
    await run('INSERT INTO categorias (nome) VALUES (?)', normalizedName);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new Error('Essa categoria já existe.');
    throw error;
  }
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function deleteCategory(id) {
  await requireAdmin();
  const category = await first('SELECT nome FROM categorias WHERE id = ?', id);
  if (!category) return;

  const productsInUse = (await first('SELECT COUNT(*) AS total FROM produtos WHERE categoria = ? COLLATE NOCASE', category.nome)).total;
  if (productsInUse > 0) throw new Error(`A categoria está sendo usada por ${productsInUse} produto(s). Altere esses produtos antes de excluí-la.`);

  await run('DELETE FROM categorias WHERE id = ?', id);
  revalidatePath('/admin');
  revalidatePath('/');
}

export async function saveConfig(data) {
  await requireAdmin();
  const { whatsapp_numero, whatsapp_mensagem } = data;
  await run(`
    UPDATE configuracoes 
    SET whatsapp_numero = ?, whatsapp_mensagem = ? 
    WHERE id = 1
  `, whatsapp_numero, whatsapp_mensagem);
  revalidatePath('/');
}

export async function saveLayoutConfig(data) {
  await requireAdmin();
  const current = await first('SELECT logo_object_key, banners FROM configuracoes WHERE id = 1');
  const logoUrl = String(data.logo_url || '').trim();
  const logoObjectKey = String(data.logo_object_key || '').trim();
  const headerText = String(data.cabecalho_texto || 'AMMA FIT').trim().slice(0, 40) || 'AMMA FIT';
  const primaryColor = /^#[0-9a-f]{6}$/i.test(data.cor_primaria) ? data.cor_primaria : '#4A5D4E';
  const secondaryColor = /^#[0-9a-f]{6}$/i.test(data.cor_secundaria) ? data.cor_secundaria : '#1A1A1A';
  const backgroundColor = /^#[0-9a-f]{6}$/i.test(data.cor_fundo) ? data.cor_fundo : '#F8F9FA';
  const banners = Array.isArray(data.banners) ? data.banners.slice(0, 12).map((banner) => ({
    ...banner,
    imagem_desktop: String(banner.imagem_desktop || '').trim(),
    imagem_mobile: String(banner.imagem_mobile || '').trim(),
    imagem_desktop_key: String(banner.imagem_desktop_key || '').trim(),
    imagem_mobile_key: String(banner.imagem_mobile_key || '').trim(),
  })) : [];
  const oldBanners = current?.banners ? JSON.parse(current.banners) : [];
  const oldKeys = [current?.logo_object_key, ...oldBanners.flatMap((banner) => [banner.imagem_desktop_key, banner.imagem_mobile_key])].filter(Boolean);
  const nextKeys = [logoObjectKey, ...banners.flatMap((banner) => [banner.imagem_desktop_key, banner.imagem_mobile_key])].filter(Boolean);
  await assertPendingAssets(nextKeys.filter((key) => !oldKeys.includes(key)));
  const menuCategories = Array.isArray(data.categorias_menu) ? data.categorias_menu.slice(0, 5) : [];
  const desktopLogoWidth = Math.min(240, Math.max(80, Number(data.logo_largura_desktop) || 160));
  const mobileLogoWidth = Math.min(180, Math.max(60, Number(data.logo_largura_mobile) || 120));

  await run(`
    UPDATE configuracoes
    SET logo_url = ?, logo_object_key = ?, cabecalho_texto = ?, cor_primaria = ?, cor_secundaria = ?, cor_fundo = ?, banners = ?,
        categorias_menu = ?, logo_largura_desktop = ?, logo_largura_mobile = ?
    WHERE id = 1
  `, logoUrl, logoObjectKey, headerText, primaryColor, secondaryColor, backgroundColor, JSON.stringify(banners), JSON.stringify(menuCategories), desktopLogoWidth, mobileLogoWidth);

  await attachAssets(nextKeys.filter((key) => !oldKeys.includes(key)), null)
    .catch((error) => console.error('Falha ao associar mídia do layout:', error));
  await queueAndDeleteAssets(oldKeys.filter((key) => !nextKeys.includes(key)))
    .catch((error) => console.error('Falha ao limpar mídia antiga do layout:', error));

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function registerWhatsappClick(produtoId) {
  await run('UPDATE produtos SET cliques_whatsapp = cliques_whatsapp + 1 WHERE id = ?', produtoId);
  // NÃO chamar revalidatePath aqui — isso recarrega a página e cancela o window.open
}
