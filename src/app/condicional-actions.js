'use server';

import { revalidatePath } from 'next/cache';
import { all, first, getDb, run } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { STATUS_EM_CONDICIONAL, syncProductStock } from '@/lib/estoque';

const MAX_ITENS_POR_SOLICITACAO = 40;

// Insere a reserva apenas se ainda houver unidade disponível, tudo em um único
// comando: a checagem e a gravação não podem ser separadas, senão duas clientes
// simultâneas passariam as duas pela mesma verificação (item 19 do pedido).
const RESERVA_GUARDADA = `
  INSERT INTO condicional_itens
    (condicional_id, variacao_id, produto_id, produto_nome, tamanho, preco, status)
  SELECT ?, v.id, v.produto_id, p.nome, v.tamanho, p.preco, '${STATUS_EM_CONDICIONAL}'
  FROM produto_variacoes v
  JOIN produtos p ON p.id = v.produto_id
  WHERE v.id = ?
    AND v.estoque_fisico - (
      SELECT COUNT(*)
      FROM condicional_itens ci
      WHERE ci.variacao_id = v.id AND ci.status = '${STATUS_EM_CONDICIONAL}'
    ) > 0
`;

function revalidateProduto(productId) {
  revalidatePath('/');
  revalidatePath('/admin/condicionais');
  revalidatePath('/admin');
  if (productId) revalidatePath(`/produto/${productId}`);
}

/**
 * Registra a sacola inteira como um condicional.
 *
 * Ou reserva todos os itens, ou não reserva nenhum: se qualquer unidade tiver
 * acabado enquanto a cliente montava a sacola, o condicional é desfeito e a
 * lista de indisponíveis volta para a tela.
 */
export async function solicitarCondicional(payload) {
  const clienteNome = String(payload?.cliente_nome ?? '').trim().slice(0, 80);
  const clienteTelefone = String(payload?.cliente_telefone ?? '').trim().slice(0, 30);

  // Cada unidade vira uma linha própria para o painel resolver item a item.
  const unidades = [];
  for (const item of Array.isArray(payload?.itens) ? payload.itens : []) {
    const variacaoId = Number(item?.variacao_id);
    if (!Number.isInteger(variacaoId) || variacaoId <= 0) continue;

    const quantidade = Math.min(20, Math.max(1, Math.floor(Number(item?.quantidade) || 1)));
    for (let index = 0; index < quantidade; index += 1) unidades.push(variacaoId);
  }

  if (unidades.length === 0) {
    return { ok: false, erro: 'Selecione ao menos uma peça para solicitar o condicional.' };
  }
  if (unidades.length > MAX_ITENS_POR_SOLICITACAO) {
    return { ok: false, erro: `Solicite no máximo ${MAX_ITENS_POR_SOLICITACAO} peças por vez.` };
  }

  const db = getDb();
  const cabecalho = await run(
    'INSERT INTO condicionais (cliente_nome, cliente_telefone) VALUES (?, ?)',
    clienteNome || null,
    clienteTelefone || null,
  );
  const condicionalId = cabecalho.meta?.last_row_id;
  if (!condicionalId) return { ok: false, erro: 'Não foi possível registrar o condicional. Tente novamente.' };

  // batch() roda como uma transação: cada reserva já enxerga as anteriores,
  // então pedir 2 unidades da última peça reserva 1 e recusa a outra.
  const resultados = await db.batch(
    unidades.map((variacaoId) => db.prepare(RESERVA_GUARDADA).bind(condicionalId, variacaoId)),
  );

  const indisponiveis = unidades.filter((_, index) => (resultados[index]?.meta?.changes ?? 0) === 0);

  if (indisponiveis.length > 0) {
    await run('DELETE FROM condicionais WHERE id = ?', condicionalId);

    const placeholders = [...new Set(indisponiveis)].map(() => '?').join(', ');
    const detalhes = await all(
      `SELECT v.id, v.tamanho, p.nome AS produto_nome
       FROM produto_variacoes v
       JOIN produtos p ON p.id = v.produto_id
       WHERE v.id IN (${placeholders})`,
      ...new Set(indisponiveis),
    );

    revalidateProduto(null);
    return {
      ok: false,
      erro: 'Algumas peças acabaram de ficar indisponíveis.',
      indisponiveis: detalhes.map((linha) => ({
        variacao_id: linha.id,
        produto_nome: linha.produto_nome,
        tamanho: linha.tamanho,
      })),
    };
  }

  const itens = await all(
    'SELECT id, produto_id, produto_nome, tamanho, preco FROM condicional_itens WHERE condicional_id = ? ORDER BY id',
    condicionalId,
  );

  for (const produtoId of new Set(itens.map((item) => item.produto_id).filter(Boolean))) {
    revalidatePath(`/produto/${produtoId}`);
  }
  revalidatePath('/');
  revalidatePath('/admin/condicionais');

  return { ok: true, condicional_id: condicionalId, itens };
}

export async function getCondicionais() {
  await requireAdmin();

  const reservas = await all(`
    SELECT
      c.id, c.cliente_nome, c.cliente_telefone, c.observacao, c.criado_em,
      SUM(CASE WHEN i.status = '${STATUS_EM_CONDICIONAL}' THEN 1 ELSE 0 END) AS em_aberto,
      COUNT(i.id) AS total_itens
    FROM condicionais c
    LEFT JOIN condicional_itens i ON i.condicional_id = c.id
    GROUP BY c.id
    ORDER BY c.criado_em DESC, c.id DESC
    LIMIT 200
  `);

  if (reservas.length === 0) return [];

  const placeholders = reservas.map(() => '?').join(', ');
  const itens = await all(
    `SELECT id, condicional_id, produto_id, produto_nome, tamanho, preco, status, resolvido_em
     FROM condicional_itens
     WHERE condicional_id IN (${placeholders})
     ORDER BY id`,
    ...reservas.map((reserva) => reserva.id),
  );

  return reservas.map((reserva) => ({
    ...reserva,
    em_aberto: Number(reserva.em_aberto) || 0,
    total_itens: Number(reserva.total_itens) || 0,
    itens: itens.filter((item) => item.condicional_id === reserva.id),
  }));
}

/**
 * Resolve uma peça específica do condicional.
 *
 * devolvido/cancelado: a peça volta para o disponível (o estoque físico nunca
 * saiu da loja no modelo, só estava reservado).
 * vendido: baixa o estoque físico, então a peça não retorna à disponibilidade.
 */
export async function resolverItemCondicional(itemId, acao) {
  await requireAdmin();

  const acoesValidas = ['vendido', 'devolvido', 'cancelado'];
  if (!acoesValidas.includes(acao)) throw new Error('Ação inválida para o item do condicional.');

  const id = Number(itemId);
  if (!Number.isInteger(id)) throw new Error('Item de condicional inválido.');

  const item = await first('SELECT id, variacao_id, produto_id, status FROM condicional_itens WHERE id = ?', id);
  if (!item) throw new Error('Item de condicional não encontrado.');
  if (item.status !== STATUS_EM_CONDICIONAL) throw new Error('Este item já foi resolvido.');

  // O status só muda a partir de 'em_condicional'. Se duas abas do painel
  // clicarem juntas, apenas uma altera a linha e apenas uma baixa o estoque.
  const atualizacao = await run(
    `UPDATE condicional_itens
     SET status = ?, resolvido_em = CURRENT_TIMESTAMP
     WHERE id = ? AND status = '${STATUS_EM_CONDICIONAL}'`,
    acao,
    id,
  );

  if ((atualizacao.meta?.changes ?? 0) !== 1) throw new Error('Este item já foi resolvido.');

  if (acao === 'vendido' && item.variacao_id) {
    await run(
      `UPDATE produto_variacoes
       SET estoque_fisico = MAX(0, estoque_fisico - 1), vendido = vendido + 1
       WHERE id = ?`,
      item.variacao_id,
    );
    if (item.produto_id) await syncProductStock(item.produto_id);
  }

  revalidateProduto(item.produto_id);
  return { ok: true };
}

export async function atualizarDadosCondicional(condicionalId, dados) {
  await requireAdmin();
  await run(
    'UPDATE condicionais SET cliente_nome = ?, cliente_telefone = ?, observacao = ? WHERE id = ?',
    String(dados?.cliente_nome ?? '').trim().slice(0, 80) || null,
    String(dados?.cliente_telefone ?? '').trim().slice(0, 30) || null,
    String(dados?.observacao ?? '').trim().slice(0, 500) || null,
    Number(condicionalId),
  );
  revalidatePath('/admin/condicionais');
}
