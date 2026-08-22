-- Variações de tamanho com estoque próprio e controle de peças em condicional.
--
-- Modelo de disponibilidade (item 4 do pedido):
--   estoque_fisico = peças que pertencem à loja (inclui as que estão fora para prova)
--   reservado      = COUNT(condicional_itens WHERE status = 'em_condicional')  [derivado]
--   disponivel     = estoque_fisico - reservado
--   vendido        = contador acumulado, apenas para relatório
--
-- "Vendido" baixa estoque_fisico em 1 e incrementa vendido, então a peça não volta
-- para disponibilidade. "Devolvido" e "cancelado" apenas mudam o status do item,
-- então a peça volta a ficar disponível sem mexer no estoque físico.

CREATE TABLE IF NOT EXISTS produto_variacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL,
  tamanho TEXT NOT NULL,
  estoque_fisico INTEGER NOT NULL DEFAULT 0,
  vendido INTEGER NOT NULL DEFAULT 0,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_variacoes_produto_tamanho
  ON produto_variacoes(produto_id, tamanho COLLATE NOCASE);

CREATE INDEX IF NOT EXISTS idx_variacoes_produto
  ON produto_variacoes(produto_id);

CREATE TABLE IF NOT EXISTS condicionais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  observacao TEXT,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_condicionais_criado ON condicionais(criado_em DESC);

-- produto_nome e tamanho são cópias do momento da reserva: o histórico do painel
-- continua legível mesmo que o produto seja renomeado ou excluído depois.
CREATE TABLE IF NOT EXISTS condicional_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  condicional_id INTEGER NOT NULL,
  variacao_id INTEGER,
  produto_id INTEGER,
  produto_nome TEXT NOT NULL,
  tamanho TEXT NOT NULL,
  preco REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_condicional'
    CHECK (status IN ('em_condicional', 'vendido', 'devolvido', 'cancelado')),
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolvido_em DATETIME,
  FOREIGN KEY (condicional_id) REFERENCES condicionais(id) ON DELETE CASCADE,
  FOREIGN KEY (variacao_id) REFERENCES produto_variacoes(id) ON DELETE SET NULL,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_condicional_itens_condicional
  ON condicional_itens(condicional_id);

-- Índice usado pela checagem de disponibilidade em toda reserva.
CREATE INDEX IF NOT EXISTS idx_condicional_itens_variacao_status
  ON condicional_itens(variacao_id, status);

-- ---------------------------------------------------------------------------
-- Migração dos dados existentes. Nada é apagado: produtos.estoque continua
-- existindo como total agregado e passa a ser a soma das variações.
-- ---------------------------------------------------------------------------

-- 1. Uma variação para cada tamanho já cadastrado no JSON produtos.tamanhos.
INSERT OR IGNORE INTO produto_variacoes (produto_id, tamanho, estoque_fisico)
SELECT p.id, TRIM(tamanho.value), 0
FROM produtos p, json_each(p.tamanhos) AS tamanho
WHERE json_valid(p.tamanhos)
  AND json_type(p.tamanhos) = 'array'
  AND TRIM(tamanho.value) <> '';

-- 2. Produtos sem tamanho cadastrado recebem a variação "Único".
INSERT OR IGNORE INTO produto_variacoes (produto_id, tamanho, estoque_fisico)
SELECT p.id, 'Único', 0
FROM produtos p
WHERE NOT EXISTS (SELECT 1 FROM produto_variacoes v WHERE v.produto_id = p.id);

-- 3. Distribui o estoque total igualmente entre os tamanhos, sobra para os
--    primeiros. A soma por produto continua idêntica a produtos.estoque.
UPDATE produto_variacoes
SET estoque_fisico = (
  SELECT (base.total / base.n)
       + (CASE WHEN base.rn <= (base.total % base.n) THEN 1 ELSE 0 END)
  FROM (
    SELECT
      MAX(0, CAST(IFNULL(p.estoque, 0) AS INTEGER)) AS total,
      (SELECT COUNT(*) FROM produto_variacoes n
        WHERE n.produto_id = produto_variacoes.produto_id) AS n,
      (SELECT COUNT(*) FROM produto_variacoes r
        WHERE r.produto_id = produto_variacoes.produto_id
          AND r.id <= produto_variacoes.id) AS rn
    FROM produtos p
    WHERE p.id = produto_variacoes.produto_id
  ) base
);
