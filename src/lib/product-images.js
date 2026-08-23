import 'server-only';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { all, first, run } from '@/lib/db';
import { isManagedMediaKey } from '@/lib/product-image-refs';

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

export function getProductImagesBucket() {
  const bucket = getCloudflareContext().env.PRODUCT_IMAGES;
  if (!bucket) throw new Error('Binding R2 "PRODUCT_IMAGES" não configurado.');
  return bucket;
}

export function createProductImageKey(prefix = 'products') {
  if (!['products', 'branding', 'banners'].includes(prefix)) throw new Error('Destino de mídia inválido.');
  return `${prefix}/${crypto.randomUUID()}.webp`;
}

export function getProductImageUrl(key) {
  if (!isManagedMediaKey(key)) throw new Error('Chave de imagem inválida.');
  const base = String(process.env.R2_PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}/${key}` : `/media/${key}`;
}

export async function uploadProductImage(body, contentType = 'image/webp', prefix = 'products') {
  const key = createProductImageKey(prefix);
  await getProductImagesBucket().put(key, body, {
    httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE },
  });
  return { storage: 'r2', key };
}

export async function deleteProductImage(key) {
  if (!isManagedMediaKey(key)) throw new Error('Chave de imagem inválida.');
  await getProductImagesBucket().delete(key);
}

export async function registerPendingAsset(key) {
  if (!isManagedMediaKey(key)) throw new Error('Chave de imagem inválida.');
  await run(`INSERT INTO media_assets (object_key, status) VALUES (?, 'pending')
    ON CONFLICT(object_key) DO UPDATE SET status = 'pending', product_id = NULL, updated_at = CURRENT_TIMESTAMP`, key);
}

export async function attachAssets(keys, productId) {
  for (const key of keys) {
    if (!isManagedMediaKey(key)) continue;
    await run(`UPDATE media_assets SET product_id = ?, status = 'attached', last_error = NULL,
      updated_at = CURRENT_TIMESTAMP WHERE object_key = ? AND status = 'pending'`, productId, key);
  }
}

export async function assertPendingAssets(keys) {
  for (const key of [...new Set(keys)]) {
    if (!isManagedMediaKey(key)) throw new Error('Referência de imagem gerenciada inválida.');
    const asset = await first("SELECT object_key FROM media_assets WHERE object_key = ? AND status = 'pending'", key);
    if (!asset) throw new Error('Uma imagem enviada não está mais disponível. Selecione o arquivo novamente.');
  }
}

async function keyIsReferenced(key, excludingProductId = null) {
  const productRow = excludingProductId == null
    ? await first('SELECT id FROM produtos WHERE instr(imagens, ?) > 0 LIMIT 1', key)
    : await first('SELECT id FROM produtos WHERE id != ? AND instr(imagens, ?) > 0 LIMIT 1', excludingProductId, key);
  if (productRow) return true;
  return Boolean(await first('SELECT id FROM configuracoes WHERE logo_object_key = ? OR instr(banners, ?) > 0 LIMIT 1', key, key));
}

export async function queueAndDeleteAssets(keys, productId = null) {
  for (const key of [...new Set(keys)]) {
    if (!isManagedMediaKey(key) || await keyIsReferenced(key, productId)) continue;
    await run(`INSERT INTO media_assets (object_key, product_id, status) VALUES (?, NULL, 'delete_pending')
      ON CONFLICT(object_key) DO UPDATE SET product_id = NULL, status = 'delete_pending', updated_at = CURRENT_TIMESTAMP`, key);
    try {
      await deleteProductImage(key);
      await run('DELETE FROM media_assets WHERE object_key = ?', key);
    } catch (error) {
      await run(`UPDATE media_assets SET attempts = attempts + 1, last_error = ?,
        updated_at = CURRENT_TIMESTAMP WHERE object_key = ?`, String(error?.message || error).slice(0, 500), key);
    }
  }
}

export async function cleanupMediaAssets() {
  const assets = await all(`SELECT object_key, status FROM media_assets
    WHERE status = 'delete_pending'
       OR (status = 'pending' AND created_at < datetime('now', '-24 hours'))
    ORDER BY created_at LIMIT 50`);
  for (const asset of assets) {
    if (!isManagedMediaKey(asset.object_key)) continue;
    if (await keyIsReferenced(asset.object_key)) {
      await run(`UPDATE media_assets SET status = 'attached', last_error = NULL,
        updated_at = CURRENT_TIMESTAMP WHERE object_key = ?`, asset.object_key);
      continue;
    }
    await queueAndDeleteAssets([asset.object_key]);
  }
}

export async function cleanupNewUploads(keys) {
  const pending = [];
  for (const key of [...new Set(keys)].filter(isManagedMediaKey)) {
    const asset = await first("SELECT status FROM media_assets WHERE object_key = ? AND status = 'pending'", key);
    if (asset) pending.push(key);
  }
  await queueAndDeleteAssets(pending);
}

export async function deleteUntrackedUpload(key) {
  if (!isManagedMediaKey(key)) return;
  await deleteProductImage(key).catch(() => {});
}

export { IMMUTABLE_CACHE };
