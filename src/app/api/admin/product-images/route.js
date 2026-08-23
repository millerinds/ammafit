import { requireAdmin } from '@/lib/auth';
import { cleanupMediaAssets, cleanupNewUploads, deleteUntrackedUpload, getProductImageUrl, registerPendingAsset, uploadProductImage } from '@/lib/product-images';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 5 * 1024 * 1024;

function detectedImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)) return 'image/png';
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp' && /^(avif|avis)$/.test(new TextDecoder().decode(bytes.slice(8, 12)))) return 'image/avif';
  return null;
}

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

async function authenticateAdmin() {
  try {
    await requireAdmin();
    return null;
  } catch {
    return jsonError('Não autorizado. Entre novamente no painel administrativo.', 401);
  }
}

export async function POST(request) {
  const unauthorized = await authenticateAdmin();
  if (unauthorized) return unauthorized;
  await cleanupMediaAssets();
  const formData = await request.formData();
  const file = formData.get('file');
  const purpose = String(formData.get('purpose') || 'products');
  const prefix = { product: 'products', products: 'products', logo: 'branding', banner: 'banners' }[purpose];
  if (!prefix) return jsonError('Destino de upload inválido.');
  if (!(file instanceof File)) return jsonError('Selecione um arquivo de imagem.');
  if (!file.size) return jsonError('O arquivo está vazio.');
  if (file.size > MAX_BYTES) return jsonError('A imagem otimizada deve ter no máximo 5 MB.', 413);
  if (!ALLOWED_TYPES.has(file.type)) return jsonError('Formato não permitido. Use JPEG, PNG, WebP ou AVIF.', 415);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectedImageType(bytes);
  if (!detectedType || detectedType !== file.type) return jsonError('O conteúdo do arquivo não corresponde a uma imagem válida.', 415);
  const reference = await uploadProductImage(bytes, detectedType, prefix);
  try {
    await registerPendingAsset(reference.key);
  } catch (error) {
    await deleteUntrackedUpload(reference.key);
    throw error;
  }
  return Response.json({ reference, previewUrl: getProductImageUrl(reference.key) }, { status: 201 });
}

export async function DELETE(request) {
  const unauthorized = await authenticateAdmin();
  if (unauthorized) return unauthorized;
  const { keys } = await request.json().catch(() => ({}));
  if (!Array.isArray(keys)) return jsonError('Informe as chaves pendentes.');
  await cleanupNewUploads(keys.slice(0, 10));
  await cleanupMediaAssets();
  return Response.json({ ok: true });
}
