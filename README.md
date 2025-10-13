# Eat-Sheet

A modern digital menu platform for restaurants. Provides beautiful, themeable menus for customers and powerful management tools for restaurant owners.

## Tech Stack

**Frontend:**
- React 18+ with TypeScript
- Mantine UI component library
- Storybook for component development
- TanStack Query (React Query)
- PWA capabilities
- Vite

**Backend:**
- Hono web framework with OpenAPI
- Node.js on AWS Lambda
- PostgreSQL (Neon)
- Drizzle ORM
- AWS Cognito authentication

**Infrastructure:**
- Pulumi (Infrastructure as Code)
- AWS (Lambda, API Gateway, S3, CloudFront)
- Serverless architecture

## Quick Start

This is a Rush monorepo. Rush provides better build orchestration, caching, and parallel execution than pnpm workspaces alone.

### Install Dependencies

```bash
rush update             # Install all dependencies (recommended)
# or
pnpm install            # Also works (backward compatible)
```

### Backend Development

```bash
rush build --to @eat-sheet/backend    # Build backend + dependencies
rushx dev -p @eat-sheet/backend       # Start development server

# Or navigate to project:
cd apps/backend
rushx dev                              # Start development server
rushx db:migrate                       # Run database migrations
rushx db:studio                        # Open database GUI
```

### Frontend Development

```bash
cd apps/frontend
rushx dev               # Start development server
rushx storybook         # Start Storybook for component development
```

### Infrastructure Deployment

```bash
cd apps/infrastructure
pulumi stack init dev
pulumi config set aws:region us-east-1
rushx deploy            # Deploy infrastructure
```

### Common Rush Commands

```bash
rush update             # Install all dependencies
rush build              # Build all projects
rush build --changed    # Build only changed projects
rush rebuild            # Clean + build all projects
rush purge              # Remove all node_modules
```

## Project Structure

```
eat-sheet/
├── apps/
│   ├── backend/          # Hono API (Lambda)
│   ├── frontend/         # React PWA
│   └── infrastructure/   # Pulumi IaC
├── packages/
│   └── shared/          # Shared types and utilities
├── common/              # Rush configuration
└── docs/                # Documentation
```

## Development

See [CLAUDE.md](./CLAUDE.md) for comprehensive development documentation including:
- Development workflow
- Architecture overview
- Testing strategy
- Deployment process
- Troubleshooting guides

## Features

- 🍕 Beautiful, themeable digital menus
- 📱 PWA with offline support
- ⭐ Reviews and ratings
- 🤖 AI-powered modification suggestions
- 💾 Save and share orders
- 📊 Analytics dashboard for maintainers
- 🔒 Secure authentication with AWS Cognito
- ☁️ Serverless, cost-effective architecture

## License

Proprietary
