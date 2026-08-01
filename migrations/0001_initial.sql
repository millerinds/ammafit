PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  preco REAL NOT NULL,
  preco_original REAL,
  oferta_ativa INTEGER DEFAULT 0,
  preco_custo REAL,
  sku TEXT,
  estoque INTEGER NOT NULL,
  imagens TEXT,
  tamanhos TEXT,
  cores TEXT,
  peso REAL,
  dimensoes TEXT,
  slug TEXT,
  texto_whatsapp TEXT,
  cliques_whatsapp INTEGER DEFAULT 0,
  acessos INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logs_de_acesso (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL,
  data_acesso DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS configuracoes (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  whatsapp_numero TEXT,
  whatsapp_mensagem TEXT,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#4A5D4E',
  cor_secundaria TEXT DEFAULT '#1A1A1A',
  cor_fundo TEXT DEFAULT '#F8F9FA',
  banners TEXT DEFAULT '[]',
  categorias_menu TEXT DEFAULT '[]',
  logo_largura_desktop INTEGER DEFAULT 160,
  logo_largura_mobile INTEGER DEFAULT 120
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
  criada_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_produtos_sku ON produtos(sku);
CREATE INDEX IF NOT EXISTS idx_logs_produto ON logs_de_acesso(produto_id);

INSERT OR IGNORE INTO produtos
  (id, nome, descricao, categoria, preco, preco_original, oferta_ativa, preco_custo, sku, estoque, imagens, tamanhos, cores, peso, dimensoes, slug, texto_whatsapp, cliques_whatsapp, acessos)
VALUES
  (1, 'Calça', 'Blebeleble', 'Leggings', 20, NULL, 0, 10, 'U-001', 30, '["https://m.media-amazon.com/images/I/412e3MNAJkL._AC_SY1000_.jpg","https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkhL25Tk6n5ztCTE6fzJPJihO5L-DMCSNleg&s"]', '["P","M","G"]', '["Preto"]', 0, '{"width":"","height":"","length":""}', '', NULL, 44, 55),
  (2, 'Camisa', '', 'Conjuntos', 15, NULL, 0, 0, 'g3333', 12, '[]', '["P"]', '["Verde"]', 0, '{"width":"","height":"","length":""}', '', NULL, 3, 6);

INSERT OR IGNORE INTO configuracoes
  (id, whatsapp_numero, whatsapp_mensagem, logo_url, cor_primaria, cor_secundaria, cor_fundo, banners, categorias_menu, logo_largura_desktop, logo_largura_mobile)
VALUES
  (1, '5567996527263', 'Olá, vim pelo catálogo e gostaria de mais informações', '', '#4A5D4E', '#d48787', '#ffffff', '[]', '["Leggings","Shorts","Tops"]', 160, 120);

INSERT OR IGNORE INTO categorias (id, nome, criada_em) VALUES
  (1, 'Leggings', '2026-08-01 22:18:27'),
  (2, 'Tops', '2026-08-01 22:18:27'),
  (3, 'Shorts', '2026-08-01 22:18:27'),
  (4, 'Conjuntos', '2026-08-01 22:18:27'),
  (5, 'Acessórios', '2026-08-01 22:18:27');
