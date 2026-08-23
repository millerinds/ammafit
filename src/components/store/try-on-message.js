// Linguagem única das mensagens de WhatsApp: a peça avulsa e a sacola inteira
// falam do mesmo jeito, como uma cliente escreveria.

function formatLine(item) {
  const size = item.size ? ` — ${item.size}` : '';
  const amount = item.quantity > 1 ? ` (${item.quantity} peças)` : '';
  return `${item.name}${size}${amount}`;
}

export function buildTryOnMessage(items, origin) {
  if (!Array.isArray(items) || items.length === 0) return '';

  if (items.length === 1) {
    const link = origin && items[0].productId ? `\n\n${origin}/produto/${items[0].productId}` : '';
    return `Oi! Vi essa peça no site e gostaria de experimentar:\n\n${formatLine(items[0])}${link}`;
  }

  return `Oi! Separei algumas peças no site que gostaria de experimentar:\n\n${items.map(formatLine).join('\n')}`;
}

export function buildWhatsappUrl(number, message) {
  const digits = String(number || '').replace(/[^0-9]/g, '') || '5549999999999';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
