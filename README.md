# Amma Fit - Loja Online

Catálogo responsivo da Amma Fit com painel administrativo, carrinho persistente no navegador e pedidos pelo WhatsApp.

- Produção: https://ammafit.ammafit.workers.dev
- Repositório: https://github.com/millerinds/ammafit
- Hospedagem: Cloudflare Workers
- Banco de dados: Cloudflare D1 (`ammafit-db`)
- Framework: Next.js 16, React 19 e Tailwind CSS 4

## Leia antes de alterar

Estas regras valem para qualquer pessoa ou assistente de IA, incluindo Claude e Codex:

1. Leia `AGENTS.md` e a documentação da versão instalada em `node_modules/next/dist/docs/` antes de alterar APIs do Next.js. Esta versão pode ter diferenças importantes em relação a versões anteriores.
2. Nunca coloque usuário, senha, hash, token, cookie ou `AUTH_SECRET` no código, README, commit, issue ou conversa pública.
3. Nunca versione `.env.local`, `.dev.vars`, `.wrangler/`, `.open-next/` ou `estoque.db`.
4. Não volte a usar `better-sqlite3`. A produção usa o binding D1 `DB` e os helpers assíncronos de `src/lib/db.js`.
5. Toda Server Action que altera produtos, categorias ou layout deve chamar `await requireAdmin()` antes da alteração.
6. Não edite uma migração que já foi aplicada em produção. Para mudar o banco, crie o próximo arquivo, por exemplo `migrations/0002_nome_da_mudanca.sql`.
7. Preserve dados existentes. Nunca apague ou recrie o D1 de produção como forma de aplicar uma mudança.
8. Antes de publicar, execute lint, build e teste as áreas afetadas em celular e computador.
9. Publique somente depois de confirmar que `.env.local` e `.dev.vars` continuam ignorados pelo Git.

## Funcionalidades atuais

### Loja

- Catálogo por categorias.
- Busca por nome, SKU, categoria, descrição, cor e tamanho.
- Banners em slides, com versões para computador e celular.
- Links dos banners para produto, categoria ou seção da loja.
- Página individual com cores, tamanhos, quantidade, oferta e recomendações.
- Até 10 recomendações priorizadas por categoria, cor, tamanho e preço.
- Carrinho salvo em `localStorage`, permanecendo no mesmo navegador após fechar o site.
- Pedido de um produto ou de todo o carrinho pelo WhatsApp.
- Compartilhamento de produtos pelo recurso nativo do aparelho ou cópia do link.

### Painel administrativo

- Acesso protegido por usuário e senha.
- Cadastro, edição e exclusão de produtos.
- Cadastro e exclusão de categorias.
- Busca administrativa por nome, SKU ou categoria.
- Configuração do número e da mensagem do WhatsApp.
- Edição de logo, tamanho da logo, cores, banners e categorias do menu.
- Métricas de acessos e cliques no WhatsApp.

## Arquitetura

```text
Navegador
├── Loja e carrinho (React / localStorage)
└── Painel administrativo (cookie de sessão HttpOnly)
             │
             ▼
Next.js no Cloudflare Workers
├── Server Components
├── Server Actions
├── autenticação: src/lib/auth.js
└── acesso ao banco: src/lib/db.js
             │
             ▼
Cloudflare D1: ammafit-db
```

Arquivos principais:

| Arquivo | Responsabilidade |
| --- | --- |
| `src/app/page.js` | Carrega a página inicial e os dados da loja. |
| `src/app/StoreClient.jsx` | Filtros, busca e composição da vitrine. |
| `src/app/actions.js` | Consultas e alterações no D1 por Server Actions. |
| `src/app/produto/[id]/page.js` | Página individual e recomendações. |
| `src/app/admin/page.js` | Proteção e carregamento do painel. |
| `src/app/DashboardClient.jsx` | Interface principal do admin. |
| `src/lib/db.js` | Binding e helpers assíncronos do Cloudflare D1. |
| `src/lib/auth.js` | Validação de credenciais e sessão assinada. |
| `src/components/store/CartProvider.jsx` | Estado persistente do carrinho. |
| `src/components/store/CartDrawer.jsx` | Carrinho e pedido pelo WhatsApp. |
| `migrations/` | Histórico imutável do esquema e dados iniciais. |
| `wrangler.jsonc` | Worker, bindings, D1 e compatibilidade do runtime. |
| `open-next.config.ts` | Adaptador do Next.js para Cloudflare. |

## Preparação do ambiente local

Requisitos:

- Node.js 22 ou compatível com as dependências atuais.
- npm.
- Conta Cloudflare apenas para acessar recursos remotos ou publicar.

Instale as dependências:

```bash
npm install
```

Copie os modelos de variáveis sem versionar o resultado:

```bash
cp .env.example .env.local
cp .dev.vars.example .dev.vars
```

Use os mesmos valores secretos nos dois arquivos locais. `.env.local` é usado pelo Next.js e `.dev.vars` pelo Wrangler.

Variáveis obrigatórias:

| Variável | Uso |
| --- | --- |
| `ADMIN_USERNAME` | Nome de acesso ao painel. |
| `ADMIN_PASSWORD_HASH` | Hash PBKDF2 da senha; nunca armazene a senha pura. |
| `AUTH_SECRET` | Assina o cookie de sessão; use pelo menos 32 bytes aleatórios. |
| `NEXTJS_ENV` | Em `.dev.vars`, deve ser `development` para desenvolvimento local. |

Para gerar uma nova senha e seus secrets localmente, execute este exemplo e guarde o resultado em local seguro:

```bash
node - <<'NODE'
const { randomBytes, pbkdf2Sync } = require('node:crypto');
const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16);
const iterations = 100000;
console.log('Senha:', password);
console.log('ADMIN_PASSWORD_HASH=' + [
  iterations,
  salt.toString('base64url'),
  pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url'),
].join(':'));
console.log('AUTH_SECRET=' + randomBytes(48).toString('base64url'));
NODE
```

O limite de 100 mil iterações é intencional: é o máximo aceito pelo PBKDF2 do Web Crypto no runtime atual do Cloudflare Workers.

## Banco de dados local

Aplique as migrações no D1 local:

```bash
npm run db:migrate:local
```

Os dados locais ficam dentro de `.wrangler/` e não são enviados ao GitHub.

Inicie o desenvolvimento:

```bash
npm run dev
```

- Loja: http://localhost:3000
- Admin: http://localhost:3000/admin

Para testar no mesmo runtime usado em produção:

```bash
npm run preview
```

O preview normalmente abre em http://localhost:8787.

## Alterações no banco D1

Quando uma funcionalidade exigir coluna ou tabela nova:

1. Crie uma nova migração em `migrations/`, mantendo a ordem numérica.
2. Use SQL compatível com SQLite/D1.
3. Atualize as consultas de `src/app/actions.js` e os componentes relacionados.
4. Aplique e teste localmente:

```bash
npm run db:migrate:local
```

5. Faça backup ou confirme o impacto antes da produção.
6. Aplique remotamente apenas depois dos testes:

```bash
npm run db:migrate:remote
```

Para consultar o banco remoto sem alterar dados:

```bash
npx wrangler d1 execute ammafit-db --remote --command "SELECT COUNT(*) AS produtos FROM produtos;"
```

Nunca use `DROP TABLE`, `DELETE` sem filtro ou recriação do banco de produção sem autorização explícita e backup.

## Autenticação do administrador

A senha pura não existe no código ou no banco. A produção guarda somente `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` e `AUTH_SECRET` nos secrets do Worker.

Para trocar as credenciais:

1. Gere um novo hash e um novo `AUTH_SECRET` usando o comando da seção de ambiente.
2. Atualize `.env.local` e `.dev.vars` localmente.
3. Autentique a CLI, se necessário:

```bash
npx wrangler login
```

4. Atualize cada secret pelo prompt protegido do Wrangler:

```bash
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put AUTH_SECRET
```

5. Publique novamente e teste `/admin` em janela anônima.

Não use variáveis com prefixo `NEXT_PUBLIC_` para credenciais: esse prefixo envia o valor ao navegador.

## Checklist obrigatório para uma alteração

Antes de começar:

- Entender a solicitação e localizar os componentes envolvidos.
- Conferir `git status` e preservar mudanças que já estejam no diretório.
- Ler a documentação local do Next.js quando alterar APIs, cache, rotas, Server Actions ou configuração.

Durante a implementação:

- Manter a experiência responsiva em celular e computador.
- Validar entradas no servidor, especialmente no admin.
- Manter `requireAdmin()` em todas as mutações administrativas.
- Evitar colocar dados sensíveis no componente cliente.
- Não alterar o formato do carrinho no `localStorage` sem migração ou compatibilidade.
- Não remover produtos ou configurações de produção usados em testes sem autorização.

Antes de publicar:

```bash
npm run lint
npm run build
git diff --check
git status --short
git check-ignore -v .env.local .dev.vars
```

Também teste manualmente o que foi afetado:

- Loja em largura de celular e computador.
- Navegação entre categorias e busca.
- Página do produto, quantidade, cor e tamanho.
- Carrinho após recarregar e reabrir o navegador.
- Link e mensagem do WhatsApp.
- Compartilhamento de produto.
- Login, logout e proteção do admin.
- Cadastro/edição no D1, quando houver mutação.

## Publicação no Cloudflare

Confirme a conta conectada:

```bash
npx wrangler whoami
```

Se houver uma migração nova, aplique-a antes do código que depende dela:

```bash
npm run db:migrate:remote
```

Publique:

```bash
npm run deploy
```

Depois valide a produção:

```bash
curl -I https://ammafit.ammafit.workers.dev
npx wrangler deployments status --name ammafit
```

Confira visualmente a loja e faça login no painel. Um build concluído não garante sozinho que secrets, D1 e interações do navegador estejam funcionando.

## Fluxo recomendado no GitHub

1. Trabalhe em uma branch, evitando mudanças diretas e não revisadas na branch principal.
2. Verifique exatamente quais arquivos serão incluídos:

```bash
git status --short
git diff --check
git diff --stat
```

3. Faça um commit com mensagem objetiva.
4. Envie a branch ao GitHub.
5. Abra ou atualize o Pull Request e descreva testes, migrações e impacto em produção.

Exemplo:

```bash
git add <arquivos-alterados>
git commit -m "feat: descrever a alteração"
git push origin <nome-da-branch>
```

Nunca use `git add .` sem revisar o status, pois isso pode incluir arquivos locais ou alterações não relacionadas.

## Comandos úteis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Desenvolvimento com Next.js. |
| `npm run lint` | Verifica problemas de código. |
| `npm run build` | Gera o build de produção com memória suficiente. |
| `npm run preview` | Compila e executa no runtime local do Workers. |
| `npm run deploy` | Compila e publica no Cloudflare Workers. |
| `npm run upload` | Envia uma versão sem necessariamente ativá-la. |
| `npm run db:migrate:local` | Aplica migrações no D1 local. |
| `npm run db:migrate:remote` | Aplica migrações no D1 de produção. |
| `npx wrangler tail ammafit` | Acompanha logs do Worker em tempo real. |
| `npx wrangler deployments status --name ammafit` | Mostra a versão ativa. |

## Solução de problemas

### O painel redireciona sempre para o login

- Confirme os três secrets com `npx wrangler secret list --name ammafit`.
- Teste usuário e senha sem espaços adicionais.
- Consulte os logs com `npx wrangler tail ammafit`.
- Depois de trocar secrets, publique novamente.

### O site abre, mas produtos ou alterações somem

- Confirme que o código usa `src/lib/db.js` e o binding `DB`.
- Verifique se a migração remota foi aplicada.
- Não grave arquivos SQLite no filesystem do Worker; ele não é persistente.

### O deploy dá timeout

- Confirme a conexão com `npx wrangler whoami`.
- Tente novamente com `npx opennextjs-cloudflare deploy` se o bundle `.open-next` já tiver sido gerado pelo mesmo código.

### O build encerra por falta de memória

O script `npm run build` já inicia o Next.js com até 3 GB de heap. Feche processos pesados se a máquina não tiver memória disponível.

### Alterações não aparecem no site

- Confirme a versão ativa com `npx wrangler deployments status --name ammafit`.
- Faça recarregamento completo no navegador.
- Verifique se o deploy terminou mostrando a URL de produção.

## Observações de segurança e operação

- O carrinho pertence ao navegador do cliente e não é armazenado no D1.
- Imagens de produtos, banners e logo são URLs externas; não há upload de arquivos para o Worker atualmente.
- O D1 é a fonte de verdade de produtos, categorias, métricas e layout.
- O cookie administrativo é `HttpOnly`, `Secure` em produção e `SameSite=Strict`.
- A sessão administrativa dura 8 horas.
- Os snapshots e limites da Cloudflare não substituem um plano de backup dos dados importantes.
- Antes de uma mudança grande, exporte o D1 ou estabeleça um procedimento de backup e restauração.
