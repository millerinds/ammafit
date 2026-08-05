import { getProductImagesBucket, IMMUTABLE_CACHE } from '@/lib/product-images';
import { isManagedMediaKey } from '@/lib/product-image-refs';

export const dynamic = 'force-dynamic';

function requestedKey(context) {
  return context.params.then(({ key }) => Array.isArray(key) ? key.join('/') : '');
}

async function getObject(context, head = false) {
  const key = await requestedKey(context);
  if (!isManagedMediaKey(key)) return null;
  return head ? getProductImagesBucket().head(key) : getProductImagesBucket().get(key);
}

function headersFor(object) {
  const headers = new Headers({
    'Content-Type': object.httpMetadata?.contentType || 'image/webp',
    'Cache-Control': IMMUTABLE_CACHE,
  });
  if (object.httpEtag) headers.set('ETag', object.httpEtag);
  return headers;
}

export async function GET(_request, context) {
  const object = await getObject(context);
  if (!object) return new Response('Imagem não encontrada.', { status: 404 });
  return new Response(object.body, { headers: headersFor(object) });
}

export async function HEAD(_request, context) {
  const object = await getObject(context, true);
  if (!object) return new Response(null, { status: 404 });
  return new Response(null, { headers: headersFor(object) });
}
