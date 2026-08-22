import 'server-only';

import { all, run } from '@/lib/db';

// Tamanho usado quando o produto não tem grade de tamanhos cadastrada.
export const TAMANHO_UNICO = 'Único';

export const STATUS_EM_CONDICIONAL = 'em_condicional';

// Disponibilidade é sempre derivada, nunca guardada em coluna própria:
// evita que um contador fique dessincronizado do que existe em condicional_itens.
const SELECT_VARIACOES = `
  SELECT
    v.id,
    v.produto_id,
    v.tamanho,
    v.estoque_fisico,
    v.vendido,
    (
      SELECT COUNT(*)
      FROM condicional_itens ci
      WHERE ci.variacao_id = v.id AND ci.status = '${STATUS_EM_CONDICIONAL}'
    ) AS reservado
  FROM produto_variacoes v
`;

function decorate(variation) {
  const estoqueFisico = Number(variation.estoque_fisico) || 0;
  const reservado = Number(variation.reservado) || 0;

  return {
    id: variation.id,
    produto_id: variation.produto_id,
    tamanho: variation.tamanho,
    estoque_fisico: estoqueFisico,
    reservado,
    disponivel: Math.max(0, estoqueFisico - reservado),
    vendido: Number(variation.vendido) || 0,
  };
}

export async function getVariationsForProducts(productIds) {
  const ids = [...new Set(productIds.map(Number).filter(Number.isInteger))];
  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => '?').join(', ');
  const rows = await all(
    `${SELECT_VARIACOES} WHERE v.produto_id IN (${placeholders}) ORDER BY v.produto_id, v.id`,
    ...ids,
  );

  const grouped = new Map();
  for (const row of rows) {
    const variation = decorate(row);
    if (!grouped.has(variation.produto_id)) grouped.set(variation.produto_id, []);
    grouped.get(variation.produto_id).push(variation);
  }
  return grouped;
}

export async function getVariationsForProduct(productId) {
  return (await getVariationsForProducts([productId])).get(Number(productId)) || [];
}

// produtos.estoque continua existindo como total agregado para não quebrar
// buscas, métricas e telas antigas. Passa a ser sempre a soma das variações.
export async function syncProductStock(productId) {
  await run(
    `UPDATE produtos
     SET estoque = (
       SELECT IFNULL(SUM(estoque_fisico), 0)
       FROM produto_variacoes
       WHERE produto_id = produtos.id
     )
     WHERE id = ?`,
    productId,
  );
}

// Grava a grade de tamanhos preservando o estoque já existente: variações que
// continuam na lista mantêm as peças em condicional vinculadas a elas.
export async function saveProductVariations(productId, variations) {
  const normalized = [];
  const seen = new Set();

  for (const entry of Array.isArray(variations) ? variations : []) {
    const tamanho = String(entry?.tamanho ?? '').trim();
    if (!tamanho) continue;

    const key = tamanho.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      tamanho,
      estoque_fisico: Math.max(0, Math.floor(Number(entry?.estoque_fisico) || 0)),
    });
  }

  if (normalized.length === 0) normalized.push({ tamanho: TAMANHO_UNICO, estoque_fisico: 0 });

  const existing = await getVariationsForProduct(productId);
  const existingByName = new Map(existing.map((v) => [v.tamanho.toLocaleLowerCase('pt-BR'), v]));
  const keptIds = [];

  for (const variation of normalized) {
    const current = existingByName.get(variation.tamanho.toLocaleLowerCase('pt-BR'));

    if (current) {
      // Nunca deixa o estoque físico abaixo do que já está fora para prova.
      const floor = current.reservado;
      await run(
        'UPDATE produto_variacoes SET tamanho = ?, estoque_fisico = ? WHERE id = ?',
        variation.tamanho,
        Math.max(floor, variation.estoque_fisico),
        current.id,
      );
      keptIds.push(current.id);
      continue;
    }

    const inserted = await run(
      'INSERT INTO produto_variacoes (produto_id, tamanho, estoque_fisico) VALUES (?, ?, ?)',
      productId,
      variation.tamanho,
      variation.estoque_fisico,
    );
    if (inserted.meta?.last_row_id) keptIds.push(inserted.meta.last_row_id);
  }

  // Remove apenas variações sem nenhuma peça em condicional: excluir uma que
  // está com uma cliente apagaria o vínculo da reserva em aberto.
  const removable = existing.filter((v) => !keptIds.includes(v.id) && v.reservado === 0);
  for (const variation of removable) {
    await run('DELETE FROM produto_variacoes WHERE id = ?', variation.id);
  }

  await syncProductStock(productId);
}
