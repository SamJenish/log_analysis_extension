# Log Failure Analyzer

AI-assisted deployment diagnostics platform for analyzing CI/CD and container logs. The starter project includes secure authentication, user history, REST API analysis, and a Docker-friendly architecture.

## Features

- Log failure detection API
- Analysis history tracking for authenticated users
- NextAuth authentication with GitHub provider and Prisma adapter
- Dockerfile and compose-ready setup
- PostgreSQL database schema for users and history

## Setup

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL`, `GITHUB_ID`, `GITHUB_SECRET`, and `NEXTAUTH_SECRET`
3. Install dependencies: `npm install`
4. Generate Prisma client: `npm run prisma:generate`
5. Run migrations: `npm run prisma:migrate`
6. Start dev server: `npm run dev`

## Docker

Build image:

```bash
npm run docker:build
```

Start services:

```bash
docker compose up --build
```

## Browser Extension

A browser extension version is available under the `extension/` folder. It provides a lightweight popup UI for pasting deployment logs and receiving immediate diagnostics without a backend.

## Notes

- The analysis API is stubbed for local diagnostics and can be extended to call LLM APIs.
- Use the `history` API to track user-specific analyses.
