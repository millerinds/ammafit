import Database from 'better-sqlite3';
import path from 'path';

// Define the path to the SQLite database file
const dbPath = path.join(process.cwd(), 'estoque.db');

// Initialize the database connection
const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL');

// Initialize the database schema
db.exec(`
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
    imagens TEXT, -- JSON array
    tamanhos TEXT, -- JSON array
    cores TEXT, -- JSON array
    peso REAL,
    dimensoes TEXT, -- JSON object
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
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Ensure only one row
    whatsapp_numero TEXT,
    whatsapp_mensagem TEXT,
    logo_url TEXT,
    cor_primaria TEXT DEFAULT '#4A5D4E',
    cor_secundaria TEXT DEFAULT '#1A1A1A',
    cor_fundo TEXT DEFAULT '#F8F9FA',
    banners TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
    criada_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default config if it doesn't exist
  INSERT OR IGNORE INTO configuracoes (id, whatsapp_numero, whatsapp_mensagem) 
  VALUES (1, '', 'Olá, vim pelo catálogo e gostaria de mais informações');
`);

// Migra bancos criados por versões anteriores sem apagar dados existentes.
const configColumns = new Set(db.prepare('PRAGMA table_info(configuracoes)').all().map(column => column.name));
const visualColumns = [
  ['logo_url', 'TEXT'],
  ['cor_primaria', "TEXT DEFAULT '#4A5D4E'"],
  ['cor_secundaria', "TEXT DEFAULT '#1A1A1A'"],
  ['cor_fundo', "TEXT DEFAULT '#F8F9FA'"],
  ['banners', "TEXT DEFAULT '[]'"],
  ['categorias_menu', "TEXT DEFAULT '[]'"],
  ['logo_largura_desktop', 'INTEGER DEFAULT 160'],
  ['logo_largura_mobile', 'INTEGER DEFAULT 120'],
];

for (const [name, definition] of visualColumns) {
  if (!configColumns.has(name)) {
    db.exec(`ALTER TABLE configuracoes ADD COLUMN ${name} ${definition}`);
  }
}

const productColumns = new Set(db.prepare('PRAGMA table_info(produtos)').all().map(column => column.name));
for (const [name, definition] of [['preco_original', 'REAL'], ['oferta_ativa', 'INTEGER DEFAULT 0']]) {
  if (!productColumns.has(name)) db.exec(`ALTER TABLE produtos ADD COLUMN ${name} ${definition}`);
}

// Mantém as categorias já usadas pelos produtos e cria as categorias iniciais.
const insertCategory = db.prepare('INSERT OR IGNORE INTO categorias (nome) VALUES (?)');
for (const name of ['Leggings', 'Tops', 'Shorts', 'Conjuntos', 'Acessórios']) insertCategory.run(name);
db.prepare("INSERT OR IGNORE INTO categorias (nome) SELECT DISTINCT categoria FROM produtos WHERE categoria IS NOT NULL AND TRIM(categoria) != ''").run();

export default db;
