# WriteSpace

Uma plataforma pessoal de escrita moderna, construída com Next.js 16, TypeScript e React 19, que permite aos usuários escrever, armazenar e compartilhar documentos de texto.

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)

## ✨ Funcionalidades

- 📝 **Editor de Texto Rico**: Interface moderna baseada em TipTap com formatação avançada
- 🔐 **Autenticação Segura**: Login via email/senha e OAuth (Google, Discord)
- 💾 **Auto-salvamento**: Salvamento automático de documentos em tempo real
- 🔗 **Compartilhamento**: Compartilhe documentos via email ou links públicos
- 🌙 **Tema Dark/Light**: Interface adaptável com suporte a modo escuro
- 📱 **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- 👥 **Gestão de Usuários**: Sistema administrativo para gerenciar usuários e convites
- 📧 **Sistema de Email**: Configuração flexível de email via Resend

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+ ou Bun 1.0+
- Bun (recomendado para melhor performance)
- Docker (para banco de dados local)

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd writespace
   ```

2. **Instale as dependências**
   ```bash
   bun install
   ```

3. **Configure as variáveis de ambiente**

   Use `.env.example` como modelo: `cp .env.example .env.local` e preencha os valores. Nunca faça commit de `.env.local`.
   
   **⚠️ IMPORTANTE para OAuth e Produção:**
   - **Desenvolvimento**: Configure `BETTER_AUTH_URL` e `NEXT_PUBLIC_BETTER_AUTH_URL` com `http://127.0.0.1:3000`
   - **Produção**: Configure com seu domínio completo (ex: `https://seu-dominio`)

   - Configure os redirect URIs nos consoles OAuth:
     - Google: `http://127.0.0.1:3000/api/auth/callback/google` (dev) ou `https://seu-dominio/api/auth/callback/google` (prod)
     - Discord: `http://127.0.0.1:3000/api/auth/callback/discord` (dev) ou `https://seu-dominio/api/auth/callback/discord` (prod)
   - Em produção, configure explicitamente `BETTER_AUTH_URL` e `NEXT_PUBLIC_BETTER_AUTH_URL` com o mesmo domínio HTTPS.

4. **Inicie o banco de dados PostgreSQL**
   ```bash
   bun docker:dev:up
   ```

5. **Execute as migrações**
   ```bash
   bun db:migrate
   ```

6. **Inicie o servidor de desenvolvimento**
   ```bash
   bun dev
   ```

7. **Acesse o aplicativo**
   Abra [http://127.0.0.1:3000](http://127.0.0.1:3000) no seu navegador.

## 🛠️ Scripts Disponíveis

### Desenvolvimento
```bash
bun dev          # Servidor de desenvolvimento
bun build        # Build para produção
bun start        # Servidor de produção
bun check        # Linting e formatação (Biome; pode aplicar correções)
bunx biome check . # Verificação sem modificar arquivos
bunx vitest run  # Executar testes uma vez
```

### Banco de Dados
```bash
bun db:generate  # Gerar migrações
bun db:migrate   # Executar migrações
bun db:push      # Push direto (desenvolvimento)
bun db:studio    # Interface Drizzle Studio
```

### Docker
```bash
bun docker:dev:up     # Iniciar PostgreSQL
bun docker:dev:down   # Parar containers
bun docker:dev:reset  # Reset completo do banco
bun docker:dev:logs   # Ver logs do container
```

## 📁 Estrutura do Projeto

```
writespace/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── admin/         # Rotas administrativas protegidas
│   │   ├── background/    # Jobs internos; não expor publicamente
│   ├── invite/            # Páginas de convite
│   ├── shared/            # Documentos compartilhados
│   ├── layout.tsx         # Layout raiz
│   └── page.tsx           # Página inicial
├── src/                   # Código fonte
│   ├── components/        # Componentes React
│   │   ├── admin/         # Superfície administrativa (usuários, convites, email)
│   │   ├── forms/         # Formulários de autenticação
│   │   ├── editor/        # Componentes de editor
│   │   ├── document/      # Componentes de documento
│   │   └── ui/            # Componentes base (shadcn/ui) + barrels por domínio
│   ├── lib/               # Utilitários e configurações
│   │   ├── hooks/         # Hooks customizados
│   │   ├── constants/     # Constantes e configurações
│   │   ├── db/            # Schema e configuração do banco
│   │   └── ...
│   └── types/             # Definições TypeScript
├── proxy.ts               # Proxy/rate limiting do Next.js
└── ...
```

## 🔧 Tecnologias Utilizadas

### Core
- **Next.js 16** - Framework React full-stack
- **TypeScript** - Tipagem estática
- **React 19** - Interface de usuário
- **Tailwind CSS** - Estilização utilitária

### Banco de Dados
- **PostgreSQL** - Banco de dados principal
- **Drizzle ORM** - ORM type-safe
- **Turso/LibSQL** - Suporte alternativo

### Autenticação
- **Better Auth** - Sistema de autenticação
- **OAuth** - Google e Discord
- **Cookies seguros** - Sessões seguras

### Editor
- **TipTap** - Editor de texto rico
- **Lucide React** - Ícones modernos

### DevTools
- **Biome** - Linting e formatação (substitui ESLint + Prettier)
- **Docker** - Containerização do banco de dados

## 🌐 Variáveis de Ambiente

Crie `.env` para desenvolvimento ou configure as variáveis no ambiente de produção. Os valores abaixo são exemplos e não devem ser usados como secrets reais:

```bash
# Banco de Dados
DATABASE_URL=postgresql://writespace:writespace@localhost:5431/writespace

# Autenticação
BETTER_AUTH_SECRET=secret-forte-aqui  # Gere com: openssl rand -base64 32
BETTER_AUTH_URL=http://127.0.0.1:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://127.0.0.1:3000  # DEVE ser igual ao BETTER_AUTH_URL

# Criptografia e endpoints internos
ENCRYPTION_KEY=64-caracteres-hexadecimais
INTERNAL_API_TOKEN=token-forte-para-cron-e-workers

# OAuth (opcional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Serviços opcionais
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
GEMINI_API_KEY=your-gemini-api-key
REDIS_URL=redis://localhost:6379
```

### Regras para produção

- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY` e `INTERNAL_API_TOKEN` devem ser configurados com valores exclusivos.
- Não use `changeme`, credenciais de desenvolvimento ou secrets presentes neste README.
- O PostgreSQL deve ficar acessível somente pela rede interna do Docker ou por uma rede privada; não publique a porta do banco na internet.
- Os endpoints `/api/background/*` são internos e devem ser chamados somente por cron/worker autenticado com `INTERNAL_API_TOKEN`.
- Rotacione imediatamente qualquer secret exposto em logs, histórico de shell, imagens Docker ou repositórios.


1. Acesse [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crie credenciais OAuth 2.0 Client ID
3. Adicione redirect URI: `http://127.0.0.1:3000/api/auth/callback/google`
4. Copie Client ID e Secret para o `.env.local`

**Discord OAuth:**
1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Crie uma aplicação
3. Vá em OAuth2 → Redirects
4. Adicione: `http://127.0.0.1:3000/api/auth/callback/discord`
5. Copie Client ID e Secret para o `.env`



## 📖 Funcionalidades Detalhadas

### Editor de Texto
- Formatação rica (negrito, itálico, sublinhado)
- Títulos e subtítulos
- Listas numeradas e com marcadores
- Tabelas e imagens
- Links e citações
- Lista de tarefas
- Destaque de texto

### Sistema de Compartilhamento
- **Convites por email**: Envie acesso direto a usuários específicos
- **Links públicos**: Gere links de acesso para qualquer pessoa
- **Controle de expiração**: Links com data de validade
- **Apenas leitura**: Documentos compartilhados são read-only

### Administração
- Gerenciamento de usuários
- Sistema de convites
- Configurações de email
- Estatísticas de uso

## 🔒 Segurança e manutenção

O projeto utiliza Better Auth, autorização por sessão, validação com Zod, rate limiting e headers de segurança. Antes de publicar alterações, execute:

```bash
bun install --frozen-lockfile
bunx biome check .
bunx vitest run
bun run build
bun audit
```

## 🚀 Deploy

### Docker

O `docker-compose.dev.yml` é destinado somente ao desenvolvimento local e usa credenciais fixas para o banco local. O `docker-compose.yml` é a base de produção e deve receber todas as credenciais por variáveis de ambiente, sem usar defaults.

```bash
docker compose -f docker-compose.yml config
docker compose up -d
```

- Railway
- Render
- AWS Amplify

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas, abra uma issue no repositório.

---

**WriteSpace** - Seu espaço pessoal para escrever e compartilhar 📝✨
