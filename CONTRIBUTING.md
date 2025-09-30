# Contributing to ContentaGen

Thank you for your interest in contributing to ContentaGen! We welcome contributions from the community. This document provides guidelines and information to help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style and Standards](#code-style-and-standards)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Issue Reporting](#issue-reporting)

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (v1.1.0 or higher)
- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 20+ (for compatibility)

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/contentagen.git
   cd contentagen
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` files from each app/package to `.env`
   - Configure your local environment variables

4. **Start the development environment:**
   ```bash
   # Start all services
   bun run dev:all

   # Or start specific apps
   bun run dev:dashboard  # Dashboard + Server
   bun run dev:blog       # Blog + Server
   bun run dev:docs       # Documentation site
   ```

5. **Set up the database:**
   ```bash
   # Push database schema to local database
   bun run db:push:local

   # Open database studio
   bun run db:studio:local
   ```

## Project Structure

This is a monorepo managed by [Nx](https://nx.dev):

```
├── apps/                    # Applications
│   ├── server/             # ElysiaJS backend with tRPC
│   ├── dashboard/          # React dashboard (Vite)
│   ├── blog/               # Astro-powered blog
│   ├── docs/               # Astro documentation site
│   └── landing-page/       # Astro landing page
├── packages/               # Shared libraries
│   ├── api/                # tRPC router definitions
│   ├── authentication/     # Auth logic (Better Auth)
│   ├── database/           # Drizzle ORM schema & repos
│   ├── workers/            # BullMQ queues & workers
│   ├── ui/                 # React components (shadcn/ui)
│   └── ...                 # Other shared packages
├── tooling/                # Shared tooling configs
└── nx.json                 # Nx workspace configuration
```

## Code Style and Standards

### Formatting and Linting

We use [Biome](https://biomejs.dev/) for code formatting and linting:

- **Indentation:** 3 spaces
- **Line width:** 80 characters
- **Quote style:** Double quotes
- **Line endings:** LF
- **Import organization:** Manual (no auto-sorting)

Run formatting:
```bash
bun run format
```

### TypeScript Standards

- Use TypeScript everywhere
- Prefer explicit types and interfaces
- Use camelCase for variables/functions
- Use PascalCase for types/components
- Handle errors with try/catch for async operations

### React/Astro Guidelines

- Use function components and hooks
- Follow TanStack Router conventions
- Use `.astro` for pages/layouts, `.ts/.tsx` for logic
- Follow accessibility and security rules from Biome

### Commit Messages

We use [Conventional Commits](https://conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

Examples:
```
feat(auth): add OAuth integration
fix(dashboard): resolve memory leak in content editor
docs(api): update endpoint documentation
```

## Git Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. **Make your changes:**
   - Follow the code style guidelines
   - Write tests for new features
   - Update documentation if needed

3. **Run checks before committing:**
   ```bash
   bun run check        # Run linting and formatting checks
   bun run typecheck    # Run TypeScript type checking
   bun run test         # Run tests
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Process

1. **Create a Pull Request:**
   - Use a descriptive title following conventional commit format
   - Provide a clear description of changes
   - Reference any related issues

2. **PR Requirements:**
   - All CI checks must pass
   - Code is reviewed by maintainers
   - Follows project conventions
   - Includes tests for new features

3. **Review Process:**
   - Maintainers will review your PR
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

## Testing

### Running Tests

```bash
# Run all tests
bun run test

# Run tests for specific project
npx nx test project-name

# Run tests in watch mode
npx nx test project-name --watch
```

### Test Guidelines

- Write tests for new features and bug fixes
- Use descriptive test names
- Follow existing testing patterns in the codebase
- Test both happy path and error scenarios

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Description:** Clear description of the issue
- **Steps to reproduce:** Step-by-step instructions
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happens
- **Environment:** OS, browser, Node.js version
- **Screenshots/Logs:** If applicable

### Feature Requests

For feature requests, please include:

- **Description:** What feature you'd like to see
- **Use case:** Why this feature would be useful
- **Implementation ideas:** If you have thoughts on how to implement it

### Questions

For questions or support:

- Check existing documentation
- Search existing issues
- Create a new issue with the "question" label

## Additional Resources

- [README.md](README.md) - Project overview and setup
- [AGENTS.md](AGENTS.md) - Coding agent guidelines
- [Nx Documentation](https://nx.dev) - Monorepo tooling
- [Biome Documentation](https://biomejs.dev) - Code formatting and linting

Thank you for contributing to ContentaGen! 🚀
