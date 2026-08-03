# CLAUDE.md


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Rules

- **Language**: Always respond to the user in **Portuguese (pt-BR)**.
- **Context**: This preference applies to all chat interactions, explanations, and comments unless the user explicitly requests otherwise.


## Project Overview

This is a Next.js 15 application built with TypeScript and React 19. The app is **"WriteSpace"** - a personal writing platform that allows users to write, store and share text documents easily and securely. The project was initially created using v0.app but has evolved into a full-stack application with authentication, database integration, and advanced sharing features.

## Development Commands

Essential development workflow:
```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server (uses next start)
bun start:bun    # Start production server with Bun (faster, Docker optimized)
bun check        # Run Biome linting and formatting (auto-fixes)

# Database operations
bun db:generate  # Generate database migrations from schema changes
bun db:migrate   # Run pending migrations
bun db:push      # Push schema changes directly (dev only)
bun db:studio    # Open Drizzle Studio for database inspection

# Docker operations
# Development (PostgreSQL only)
bun docker:dev:up      # Start PostgreSQL container
bun docker:dev:down    # Stop PostgreSQL container
bun docker:dev:reset   # Reset database and restart container
bun docker:dev:logs    # View container logs
bun docker:check       # Verify Docker installation

# Production (Full Stack)
docker compose up -d           # Start full application stack
docker compose down            # Stop all containers
docker compose logs -f         # Follow logs
docker compose build --no-cache # Rebuild containers from scratch
```

**Code Quality**: Uses Biome instead of ESLint/Prettier. Run `bun check` for formatting and linting.

**Production Optimization**: The Dockerfile uses `bun server.js` to run the Next.js standalone build directly with Bun, which is significantly faster and more memory-efficient than `next start`. This leverages Bun's native performance advantages for production deployments.

## Architecture & Key Components

### Code Organization
The project follows a strict `src/` structure with organized component hierarchy:
- **src/components/admin/**: Administrative UI (user management, invites, email settings)
- **src/components/forms/**: Authentication forms with shared `AuthFormBase` component
- **src/components/editor/**: TipTap rich text editor and viewer components
- **src/components/document/**: Document-specific UI components
- **src/components/ui/**: Reusable shadcn/ui components and custom UI elements
- **src/components/** subfolders use `index.ts` barrels for consistent imports
- **src/lib/hooks/**: Organized by domain (auth/, documents/, ui/)
- **src/lib/constants/**: Shared configurations (TipTap extensions, form styles)
- **src/types/**: Centralized TypeScript definitions

### Application Architecture
- **Next.js 15 App Router**: Modern file-based routing in `app/` directory
- **Authentication**: Better Auth with email/password and Google/Discord OAuth
- **Database**: PostgreSQL with Drizzle ORM and Turso/LibSQL support
- **Styling**: Tailwind CSS v4 with extensive Shadcn/ui components
- **State Management**: React hooks with Better Auth session management
- **Security**: Rate limiting middleware with per-endpoint configurations

### Rich Text Editor Architecture
- **Centralized TipTap Configuration**: `src/lib/constants/tiptap-config.ts` contains shared extensions
- **Editor/Viewer Split**: Separate components with different capabilities and configurations
- **Auto-save System**: Debounced auto-save with visual indicators via custom hooks
- **Content Migration**: HTML to plain text conversion utilities for search and fallback

### Document Sharing System
- **Two Sharing Modes**: Email invitations (user-specific) and public links (token-based)
- **Token Management**: UUID-based share tokens with optional expiration
- **Access Control**: Read-only shared documents with owner attribution
- **Email Integration**: Configurable email service via admin panel (Resend integration)

### Authentication & Security Flow
- `app/page.tsx`: Main router handling authenticated/unauthenticated states
- `src/components/forms/`: Refactored auth forms with shared base component
- `src/lib/auth.ts`: Better Auth configuration with Drizzle adapter
- `src/lib/auth-client.ts`: Client-side auth hooks and session management
- `proxy.ts`: Security logging and rate limiting for sensitive endpoints (Next.js 16 proxy convention)

## Database & Environment Setup

### Required Environment Variables (.env.local)
```bash
DATABASE_URL=postgresql://user:password@localhost:5431/writespace
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://127.0.0.1:3000

# OAuth Providers (optional - only include what you want to enable)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Email Service (configured via admin panel, not environment variables)
# Resend API key is stored in database for security
```

### Database Configuration
- **Primary**: PostgreSQL (production/development)
- **Alternative**: LibSQL/Turso support configured
- **ORM**: Drizzle with migrations in `src/lib/db/migrations/`
- **Connection**: Configured in `src/lib/db/index.ts`
- **Schema**: Located at `src/lib/db/schema.ts` with role-based access controls

### Docker Setup

**Development (PostgreSQL only)**:
- PostgreSQL runs on port 5431 (not 5432) to avoid conflicts
- Container name: `writespace`
- Includes health checks and persistent volumes
- Uses `docker-compose.dev.yml`

**Production (Full Stack)**:
- Complete application stack with PostgreSQL + Next.js app
- Uses multi-stage Dockerfile with Bun for optimization
- Configured with `docker-compose.yml`
- Environment variables via `.env.production`
- Next.js output mode: `standalone` for minimal container size

## Configuration Details

### Code Quality & Formatting (biome.json)
- **Biome**: Replaces ESLint + Prettier with unified tooling
- **Format**: 2-space indentation, double quotes, ES5 trailing commas, 100 char line width
- **Rules**:
  - Allows explicit `any` (`noExplicitAny: off`)
  - Disables non-null assertion warnings (`noNonNullAssertion: off`)
  - Warns on exhaustive dependencies (`useExhaustiveDependencies: warn`)
  - Disables semantic elements requirement (`useSemanticElements: off`)
- **UI Component Overrides**: `src/components/ui/**` disables nested component and array index key rules

### Path Aliases & Import Conventions
- `@/*` maps to project root for imports
- `@/src/*` used consistently for all source code imports
- Named exports preferred over default exports for better tree-shaking
- Relative imports only used within closely related components (e.g., `../ui/use-debounce`)

### Multi-language Support
- Portuguese-language focused (lang="pt-BR")
- All UI text and metadata in Portuguese

## Key Implementation Patterns

### Component Architecture
- **Shared Base Components**: `AuthFormBase` reduces auth form duplication by 75%
- **Domain-Specific Organization**: Components grouped by function (forms/, editor/, document/)
- **Reusable UI Layer**: Custom shadcn/ui components with consistent styling patterns
- **Props Interface Naming**: Consistent `ComponentNameProps` pattern throughout

### Hook Patterns
- **Domain Separation**: Hooks organized by domain (auth/, documents/, ui/)
- **Custom State Management**: `useFormState`, `useLoadingState` for consistent patterns
- **Composition**: Hooks compose smaller utilities (e.g., `useDebounce` within `useAutoSave`)
- **Error Handling**: Consistent error state management across all data-fetching hooks

### Security & Performance
- **Rate Limiting**: Middleware-based rate limiting with different limits per endpoint type
  - `authRateLimit`: Strictest for auth endpoints
  - `shareRateLimit`: Moderate for document sharing
  - `apiRateLimit`: General for other API routes
- **Security Logging**: Structured logging in proxy for sensitive endpoint access (`/api/auth`, `/api/admin`)
- **Auto-save**: Debounced document saving (2000ms default) with abort controller and error recovery
- **Input Validation**: Zod schemas on all API endpoints with SQL injection prevention (LIKE wildcard escaping)
- **Type Safety**: Centralized type definitions prevent interface duplication across components
- **Authorization Pattern**: Always verify session + resource ownership before operations
- **Open Redirect Prevention**: Redirect URLs validated to same origin only (see `app/page.tsx:29-40`)

## API Architecture Patterns

### RESTful Endpoint Structure
- **Authentication**: `/api/auth/[...all]` - Better Auth routes (sign in/up/out, OAuth callbacks)
- **Documents**: `/api/documents` - CRUD with pagination, search, filtering (never exposes `shareToken`)
- **Sharing**: `/api/documents/[id]/share` - POST creates share with token collision detection, DELETE revokes
- **Public Access**: `/api/shared/[token]` - No auth required for viewing shared documents
- **Admin**: `/api/admin/*` - User management, email settings, invite history

### Data Flow Pattern
1. **Create/Update**: Client → API → Zod validation → Session check → Ownership verification → Drizzle ORM → PostgreSQL
2. **Sharing**: Generate UUID token → Retry on collision (max 5) → Store in DB → Send email (non-blocking) → Return success
3. **Auto-save**: User types → Debounce (2s) → Abort previous save → API call → Update cache → Visual feedback

## Key Files & Their Responsibilities

### Configuration Files
- `src/lib/auth.ts`: Better Auth server config with Drizzle adapter, conditional OAuth providers
- `src/lib/auth-client.ts`: Client-side auth with nanostores session management
- `src/lib/constants/tiptap-config.ts`: Centralized TipTap extensions factory (`createTipTapExtensions`)
- `src/lib/db/schema.ts`: Drizzle schema with Better Auth tables + application tables (documents, shares, invites)
- `proxy.ts`: Rate limiting, security logging, header management (Next.js 16+ proxy convention)

### Core Components
- `app/page.tsx`: Main routing logic - authenticated users see Dashboard, unauthenticated see auth forms
- `src/components/forms/auth-form-base.tsx`: Shared base component for login/register (reduces duplication by 75%)
- `src/components/editor/rich-text-editor.tsx`: Full editor with toolbar (editable: true)
- `src/components/editor/rich-text-viewer.tsx`: Read-only viewer (editable: false, same config as editor)
- `src/components/dashboard/dashboard.tsx`: Main authenticated app interface

### Hooks Architecture
- `src/lib/hooks/documents/useDocuments.ts`: Main document CRUD with 30s cache, pagination, search
- `src/lib/hooks/documents/useAutoSave.ts`: Debounced auto-save with abort controller
- `src/lib/hooks/auth/useAuthForm.ts`: Centralized auth form state management
- `src/lib/hooks/ui/useFormState.ts`: Generic form state pattern (values, errors, loading)
- `src/lib/hooks/ui/useDebounce.ts`: Utility hook composed into useAutoSave

## Deployment Options

### Docker (Self-hosted)
**Quick Start**:
```bash
# 1. Copy and configure environment
cp .env.production.example .env.production
# Edit .env.production with your values

# 2. Build and start
docker compose up -d

# 3. Run migrations (first time only)
docker compose exec app bun db:migrate
```

**Configuration**:
- `Dockerfile`: Multi-stage build with Bun (deps → builder → runner)
- `docker-compose.yml`: Full stack (PostgreSQL + Next.js app)
- `docker-compose.dev.yml`: Development PostgreSQL only
- Output mode: `standalone` for minimal image size

### Nixpacks (Railway/Render)
Automatic deployment using `nixpacks.toml`:
- Node.js 20 + pnpm
- Builds with `pnpm run build`
- Starts with `pnpm run start`
- Requires environment variables configured in platform dashboard

### Other Platforms
Compatible with any Next.js hosting:
- **Vercel/Netlify**: Zero-config deployment (git push)
- **AWS Amplify**: Supports Next.js 16 SSR
- **DigitalOcean App Platform**: Use Dockerfile
- **Fly.io**: Use Dockerfile with persistent volumes for PostgreSQL

**Important for all platforms**:
- Set `DATABASE_URL` to your PostgreSQL instance
- Configure `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`)
- Set `BETTER_AUTH_URL` to match your production domain
- Run `bun db:migrate` after first deployment