const R2_KEY_PATTERN = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;

export function isManagedImageKey(value) {
  return typeof value === 'string' && R2_KEY_PATTERN.test(value) && !value.includes('..');
}

export function normalizeImageReference(value) {
  if (typeof value === 'string') {
    const url = value.trim();
    return /^https?:\/\//i.test(url) ? { storage: 'external', url } : null;
  }
  if (!value || typeof value !== 'object') return null;
  if (value.storage === 'r2' && isManagedImageKey(value.key)) return { storage: 'r2', key: value.key };
  if (value.storage === 'external' && typeof value.url === 'string' && /^https?:\/\//i.test(value.url.trim())) {
    return { storage: 'external', url: value.url.trim() };
  }
  return null;
}

export function parseImageReferences(value) {
  let values = value;
  if (typeof value === 'string') {
    try { values = JSON.parse(value); } catch { values = []; }
  }
  if (!Array.isArray(values)) return [];
  return values.map(normalizeImageReference).filter(Boolean).slice(0, 10);
}

export function imageReferenceUrl(reference, publicBaseUrl = '') {
  const normalized = normalizeImageReference(reference);
  if (!normalized) return '';
  if (normalized.storage === 'external') return normalized.url;
  const base = String(publicBaseUrl || '').trim().replace(/\/$/, '');
  return base ? `${base}/${normalized.key}` : `/media/${normalized.key}`;
}

export function imageReferencesToUrls(references, publicBaseUrl = '') {
  return parseImageReferences(references).map((reference) => imageReferenceUrl(reference, publicBaseUrl)).filter(Boolean);
}

export function extractManagedImageKeys(references) {
  return [...new Set(parseImageReferences(references).filter((reference) => reference.storage === 'r2').map((reference) => reference.key))];
}

export function serializeImageReferences(references) {
  return JSON.stringify(parseImageReferences(references));
}
