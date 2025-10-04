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

### Install Dependencies

```bash
pnpm install            # Install all workspace dependencies
```

### Backend Development

```bash
pnpm backend:dev        # Start development server
pnpm --filter @eat-sheet/backend db:migrate    # Run database migrations
pnpm --filter @eat-sheet/backend db:studio     # Open database GUI
```

### Frontend Development

```bash
pnpm frontend:dev       # Start development server
pnpm frontend:storybook # Start Storybook for component development
```

### Infrastructure Deployment

```bash
cd infrastructure
pulumi stack init dev
pulumi config set aws:region us-east-1
pnpm infra:deploy      # Deploy infrastructure
```

## Project Structure

```
eat-sheet/
├── backend/           # Hono API (Lambda)
├── frontend/          # React PWA
├── infrastructure/    # Pulumi IaC
├── shared/           # Shared types
└── docs/            # Documentation
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
